import { useCallback, useState } from 'react';
import { answerQuestion, ChatContext } from '../../core/chat/answer';
import { routeQuestion } from '../../core/chat/router';
import type { ChatProvider, GeneralErrorKind, HistoryTurn } from '../../core/chat/providers/types';
import { strings } from '../../ui/i18n/strings';
import type { ChatMessage } from '../viewModels';
import type { SqlDriver } from '../../core/db/driver';
import {
  insertConversation, insertMessage, lastMessages, listActiveConversations, listMessages,
  newConversationUuid, newMessageUuid, touchConversation, updateMessageText,
} from '../../core/db/repositories/conversations';

/**
 * Chat state and the send path.
 *
 * Two tiers, decided by `routeQuestion` before anything else happens:
 *
 *   grounded — computed synchronously from the knowledge base and shown at
 *              once, so it works with the network off and never leaves the user
 *              waiting. A remote provider then reoffers the same answer in
 *              better words, and because `rephrase` resolves to the curated
 *              text whenever a guard trips, a rejected rewording is a no-op.
 *
 *   general  — needs a model, so it needs the network. Nothing is invented on
 *              failure: an unreachable or rate-limited assistant produces a
 *              visible notice, and an off-topic verdict produces the app's own
 *              refusal wording rather than whatever the model wrote.
 *
 * Every turn on both tiers is persisted through the conversations repository,
 * so a chat survives beyond the component: `ask()` opens a conversation row on
 * the first send of a fresh chat, and every message — user and assistant — is
 * written as it is shown. `openConversation` and `startNewConversation` move
 * the hook between an existing thread and a blank one.
 */

/** How many prior messages ride along as history for the general tier. */
const HISTORY_WINDOW = 10;
/** A conversation's title is the opening question, capped to this length. */
const TITLE_LENGTH = 40;

/** What the model is told about this user, so advice is locally relevant. */
function describeContext(context: ChatContext): string {
  const fruits = context.fruits.map(f => f.nameEn).join(', ');
  const place = context.location ? `The grower is in ${context.location.label}.` : '';
  const climate = context.climate
    ? `Current conditions: ${context.climate.temperatureC}°C, ${context.climate.condition}.`
    : '';
  return `This app covers: ${fruits}. ${place} ${climate}`.trim();
}

function noticeFor(kind: GeneralErrorKind, t: ReturnType<typeof strings>): string {
  switch (kind) {
    case 'rateLimited':
      return t.assistantBusy;
    case 'unreachable':
      return t.assistantUnreachable;
    case 'unconfigured':
      return t.assistantOff;
    case 'unavailable':
      return t.assistantUnavailable;
  }
}

/**
 * A stored verdict, or null when the column holds something unparseable.
 *
 * `verdict_json` is filled from whatever the restore endpoint returned, so a
 * single malformed row is reachable without any local corruption. Left
 * unguarded, the parse threw inside the state update and took the whole
 * conversation down — and since the throw happened on open, there was no way
 * back into that thread to fix or delete it.
 */
function parseVerdict(json: string | null): ChatMessage['verdict'] {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** A conversation's title: the opening question, truncated so a long one still reads as a label. */
function titleFrom(question: string): string {
  const trimmed = question.trim();
  return trimmed.length > TITLE_LENGTH ? `${trimmed.slice(0, TITLE_LENGTH)}…` : trimmed;
}

export function useChat(
  context: ChatContext,
  provider: ChatProvider,
  db: SqlDriver,
  deviceId = 'device',
  // Called after a message row lands. The navigator passes the same
  // `bumpData` every other writer uses, which is what makes a sent message
  // reach the sync queue's drain effect — see the 2026-09-03 spec, §5.
  onPersisted?: () => void,
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  /** Back to a blank, unsaved chat — the next `ask()` opens a new conversation. */
  const startNewConversation = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setDraft('');
  }, []);

  /** Swap in a past conversation's messages, read straight from storage. */
  const openConversation = useCallback((uuid: string) => {
    const rows = listMessages(db, uuid);
    setMessages(rows.map(r => ({
      id: r.uuid,
      role: r.role,
      text: r.text,
      kind: (r.kind ?? undefined) as ChatMessage['kind'],
      verdict: parseVerdict(r.verdictJson),
    })));
    setConversationId(uuid);
    setDraft('');
  }, [db]);

  /** The active conversation, opening one titled from the first question if none exists yet. */
  const ensureConversation = useCallback((firstQuestion: string): string => {
    if (conversationId) return conversationId;
    const uuid = newConversationUuid();
    const now = new Date().toISOString();
    insertConversation(db, { uuid, title: titleFrom(firstQuestion), deviceId, createdAt: now, updatedAt: now });
    setConversationId(uuid);
    return uuid;
  }, [conversationId, db, deviceId]);

  const persist = useCallback((convId: string, message: ChatMessage) => {
    const now = new Date().toISOString();
    insertMessage(db, {
      uuid: message.id,
      conversationId: convId,
      role: message.role,
      kind: message.kind ?? null,
      text: message.text,
      verdictJson: message.verdict ? JSON.stringify(message.verdict) : null,
      createdAt: now,
    });
    // A new message makes the conversation the most recently active one, and
    // the sidebar sorts on exactly this column.
    touchConversation(db, convId, now);
    // Last, so it only fires once the rows are actually there.
    onPersisted?.();
  }, [db, onPersisted]);

  const ask = useCallback(
    (question: string) => {
      const text = question.trim();
      if (text === '') return;

      // UUIDs, not a per-session counter: the sync endpoint rejects anything
      // else, and a counter restarting at zero each launch would collide with
      // ids already held locally.
      const userId = newMessageUuid();
      const replyId = newMessageUuid();
      const t = strings(context.language);
      const { tier } = routeQuestion(text);
      const convId = ensureConversation(text);
      const userMessage: ChatMessage = { id: userId, role: 'user', text };
      persist(convId, userMessage);

      if (tier === 'grounded') {
        const answer = answerQuestion(text, context);
        const replyMessage: ChatMessage = {
          id: replyId,
          role: 'assistant',
          text: answer.text,
          kind: 'grounded',
          verdict: answer.suitability ?? null,
        };
        setMessages(previous => [...previous, userMessage, replyMessage]);
        persist(convId, replyMessage);
        setDraft('');

        // The local provider returns this exact text, so there is nothing to
        // wait for — staying synchronous keeps the offline path instant.
        if (!provider.remote || !provider.isAvailable()) return;

        setPending(true);
        void (async () => {
          try {
            const reworded = await provider.rephrase(answer);
            setMessages(previous =>
              previous.map(m => (m.id === replyId ? { ...m, text: reworded } : m)),
            );
            // An update, not a re-insert: `insertMessage` is INSERT OR IGNORE,
            // so writing the same uuid again would leave the curated wording
            // in the database and only the screen showing the rewording.
            updateMessageText(db, replyId, reworded);
          } catch (cause) {
            // `rephrase` is contractually total — it resolves to the curated
            // wording rather than rejecting — but `ChatProvider` is an
            // interface, and nothing stops an implementation from throwing.
            // The curated answer is already on screen and in storage, so
            // there is nothing to repair; without this it would surface as an
            // unhandled rejection instead.
            console.warn('rephrase failed; keeping the curated wording', cause);
          } finally {
            setPending(false);
          }
        })();
        return;
      }

      // The general tier needs a model on the other end of a network. Say so
      // rather than failing quietly or falling back to a grounded non-answer.
      setMessages(previous => [...previous, userMessage]);
      setDraft('');

      if (!provider.remote || !provider.isAvailable()) {
        const notice: ChatMessage = { id: replyId, role: 'assistant', text: t.assistantOff, kind: 'notice' };
        setMessages(previous => [...previous, notice]);
        persist(convId, notice);
        return;
      }

      // Oldest-first, capped to the last HISTORY_WINDOW turns, and excluding
      // the question just persisted above: `lastMessages` reads it straight
      // back out of the database, and without this filter it would appear
      // twice — once as history, once as the question itself.
      const history: HistoryTurn[] = lastMessages(db, convId, HISTORY_WINDOW)
        .filter(m => m.uuid !== userMessage.id)
        .map(m => ({ role: m.role, text: m.text }));

      setPending(true);
      void (async () => {
        let message: ChatMessage;
        try {
          // history? is optional on the provider — an empty conversation omits
          // the argument entirely rather than sending `[]`.
          const result = history.length > 0
            ? await provider.answerGeneral(text, describeContext(context), history)
            : await provider.answerGeneral(text, describeContext(context));

          message = result.errorKind
            ? { id: replyId, role: 'assistant', text: noticeFor(result.errorKind, t), kind: 'notice' }
            : result.onTopic
              ? { id: replyId, role: 'assistant', text: result.text, kind: 'general' }
              // The model's own text is discarded here on purpose: a refusal
              // must not smuggle an answer past the topic check.
              : { id: replyId, role: 'assistant', text: t.offTopic, kind: 'refusal' };
        } catch (cause) {
          // `answerGeneral` is meant to report failure as an errorKind rather
          // than by rejecting. When a provider rejects anyway, the reply has
          // to be built here — otherwise the user's question sits on screen
          // with nothing beneath it and no way to tell that anything failed.
          console.warn('answerGeneral failed', cause);
          message = { id: replyId, role: 'assistant', text: noticeFor('unavailable', t), kind: 'notice' };
        }

        setMessages(previous => [...previous, message]);
        persist(convId, message);
        setPending(false);
      })();
    },
    [context, provider, ensureConversation, persist, db],
  );

  const send = useCallback(() => ask(draft), [ask, draft]);

  // Clearing is starting over, which means leaving the old thread behind
  // entirely: keeping `conversationId` would put the next answer inside the
  // conversation the user just cleared, still carrying its history.
  const clear = startNewConversation;

  return {
    messages, draft, setDraft, send, ask, clear, pending,
    conversationId, startNewConversation, openConversation,
  };
}

/** Conversations for a sidebar or history list — active (non-trashed) ones, most recent first. */
export function listConversationsForSidebar(db: SqlDriver) {
  return listActiveConversations(db);
}
