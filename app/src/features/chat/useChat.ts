import { useCallback, useEffect, useState } from 'react';
import { answerQuestion, ChatContext } from '../../core/chat/answer';
import { routeQuestion } from '../../core/chat/router';
import { guardRephrasing } from '../../core/chat/providers/guard';
import type { ChatProvider, GeneralErrorKind, GeneralPolicy, GeneralRequestOptions, HistoryTurn } from '../../core/chat/providers/types';
import { strings } from '../../ui/i18n/strings';
import type { ChatMessage } from '../viewModels';
import type { SqlDriver } from '../../core/db/driver';
import {
  insertConversation, insertMessage, lastMessages, listActiveConversations, listMessages,
  findConversation, newConversationUuid, newMessageUuid, touchConversation, updateMessageText,
} from '../../core/db/repositories/conversations';
import type { LocalAccountScope } from '../../core/db/repositories/scans';

/**
 * Chat state and the send path.
 *
 * Two tiers, decided by `routeQuestion` before anything else happens:
 *
 *   grounded — computed synchronously from the knowledge base and shown at
 *              once, so it works with the network off and never leaves the user
 *              waiting. A remote provider's candidate is revalidated at this
 *              boundary; changed content keeps the curated answer and adds a
 *              persisted notice.
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

function restrictedFallback(question: string, t: ReturnType<typeof strings>): string {
  const includesMoldOrRot = /\b(?:mold\w*|mould\w*|amag|rot|rott\w*|bulok)\b/i.test(question);
  const mentionsHarvest = /\b(?:harvest(?:ed)?|picked|naani|ani)\b/i.test(question);
  return includesMoldOrRot && mentionsHarvest
    ? `${t.restrictedFallback} ${t.restrictedHarvestedFruitWarning}`
    : t.restrictedFallback;
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
export function titleFrom(question: string): string {
  const normalized = question.replace(/\s+/g, ' ').trim();
  return normalized.length > TITLE_LENGTH ? `${normalized.slice(0, TITLE_LENGTH)}…` : normalized;
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
  scope: LocalAccountScope = { activeAccountId: null },
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [retryRequest, setRetryRequest] = useState<{
    question: string;
    policy: GeneralPolicy;
    conversationId: string;
    userMessageId: string;
    failedReplyIds: string[];
  } | null>(null);

  /** Back to a blank, unsaved chat — the next `ask()` opens a new conversation. */
  const startNewConversation = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setDraft('');
    setRetryRequest(null);
  }, []);

  // A shared device must never leave an account-A thread open in memory after
  // switching to signed-out mode or account B.
  useEffect(() => {
    startNewConversation();
  }, [scope.activeAccountId, startNewConversation]);

  /** Swap in a past conversation's messages, read straight from storage. */
  const openConversation = useCallback((uuid: string) => {
    if (!findConversation(db, uuid, scope)) {
      startNewConversation();
      return;
    }
    const rows = listMessages(db, uuid, scope);
    setMessages(rows.map(r => ({
      id: r.uuid,
      role: r.role,
      text: r.text,
      kind: (r.kind ?? undefined) as ChatMessage['kind'],
      verdict: parseVerdict(r.verdictJson),
    })));
    setConversationId(uuid);
    setDraft('');
    setRetryRequest(null);
  }, [db, scope, startNewConversation]);

  /** The active conversation, opening one titled from the first question if none exists yet. */
  const ensureConversation = useCallback((firstQuestion: string): string => {
    if (conversationId) return conversationId;
    const uuid = newConversationUuid();
    const now = new Date().toISOString();
    insertConversation(db, {
      uuid, title: titleFrom(firstQuestion), deviceId, createdAt: now, updatedAt: now,
      accountId: scope.activeAccountId,
    });
    setConversationId(uuid);
    return uuid;
  }, [conversationId, db, deviceId, scope.activeAccountId]);

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
      accountId: scope.activeAccountId,
    });
    // A new message makes the conversation the most recently active one, and
    // the sidebar sorts on exactly this column.
    touchConversation(db, convId, now, scope);
    // Last, so it only fires once the rows are actually there.
    onPersisted?.();
  }, [db, onPersisted, scope]);

  const resolveGeneral = useCallback(async (
    question: string,
    policy: GeneralPolicy,
    convId: string,
    userMessageId: string,
    failedReplyIds: string[],
    replyId: string,
  ): Promise<{ message: ChatMessage; retryable: boolean }> => {
    const t = strings(context.language);
    const history: HistoryTurn[] = lastMessages(db, convId, HISTORY_WINDOW, scope)
      .filter(m => m.uuid !== userMessageId && !failedReplyIds.includes(m.uuid))
      .map(m => ({ role: m.role, text: m.text }));
    const options: GeneralRequestOptions = {
      policy,
      language: context.language,
      ...(history.length > 0 ? { history } : {}),
    };

    try {
      const result = await provider.answerGeneral(question, describeContext(context), options);
      if (result.errorKind) {
        const message: ChatMessage = {
          id: replyId,
          role: 'assistant',
          text: noticeFor(result.errorKind, t),
          kind: 'notice',
        };
        return { message, retryable: result.errorKind !== 'unconfigured' };
      }
      if (!result.onTopic) {
        return {
          message: { id: replyId, role: 'assistant', text: t.offTopic, kind: 'refusal' },
          retryable: false,
        };
      }

      if (policy === 'restricted' || result.policy === 'restricted') {
        return {
          // Either classifier may identify uncertainty. Restricted text is
          // always replaced with the fixed local awareness/referral.
          message: { id: replyId, role: 'assistant', text: restrictedFallback(question, t), kind: 'restricted' },
          retryable: false,
        };
      }

      if (result.policy !== 'general' || !result.warning || result.text.trim() === '') {
        return {
          message: {
            id: replyId,
            role: 'assistant',
            text: noticeFor('unavailable', t),
            kind: 'notice',
          },
          retryable: true,
        };
      }
      return {
        message: { id: replyId, role: 'assistant', text: result.text, kind: 'general' },
        retryable: false,
      };
    } catch (cause) {
      console.warn('answerGeneral failed', cause);
      return {
        message: {
          id: replyId,
          role: 'assistant',
          text: noticeFor('unavailable', t),
          kind: 'notice',
        },
        retryable: true,
      };
    }
  }, [context, db, provider, scope]);

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
      setRetryRequest(null);
      const { tier, policy } = routeQuestion(text);
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
            const providerOutcome = await provider.rephrase(answer);
            // Keep a second fail-closed check at the persistence/UI boundary so
            // an alternate or faulty provider cannot bypass the output guard.
            const outcome = providerOutcome.status === 'accepted'
              ? guardRephrasing({ text: providerOutcome.text, verdict_echo: answer.verdict }, answer)
              : providerOutcome;
            if (outcome.status === 'accepted') {
              setMessages(previous =>
                previous.map(m => (m.id === replyId ? { ...m, text: outcome.text } : m)),
              );
              // An update, not a re-insert: `insertMessage` is INSERT OR IGNORE,
              // so writing the same uuid again would leave the curated wording
              // in the database and only the screen showing the rewording.
              updateMessageText(db, replyId, outcome.text, scope);
            } else {
              const notice: ChatMessage = {
                id: newMessageUuid(),
                role: 'assistant',
                text: strings(context.language).rephraseFallbackNotice,
                kind: 'notice',
              };
              // A request can finish after the user has navigated away. Keep
              // the notice in the source conversation for reopen/sync without
              // injecting it into whichever conversation is now on screen.
              setMessages(previous =>
                previous.some(message => message.id === replyId) ? [...previous, notice] : previous,
              );
              persist(convId, notice);
            }
          } catch (cause) {
            // `rephrase` is contractually total, but `ChatProvider` is an
            // interface and an implementation can still throw.
            // The curated answer is already on screen and in storage, so
            // there is nothing to repair; without this it would surface as an
            // unhandled rejection instead.
            console.warn('rephrase failed; keeping the curated wording', cause);
            const notice: ChatMessage = {
              id: newMessageUuid(),
              role: 'assistant',
              text: strings(context.language).rephraseFallbackNotice,
              kind: 'notice',
            };
            setMessages(previous =>
              previous.some(message => message.id === replyId) ? [...previous, notice] : previous,
            );
            persist(convId, notice);
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

      if (policy === 'restricted' && (!provider.remote || !provider.isAvailable())) {
        const awareness: ChatMessage = {
          id: replyId,
          role: 'assistant',
          text: restrictedFallback(text, t),
          kind: 'restricted',
        };
        setMessages(previous => [...previous, awareness]);
        persist(convId, awareness);
        return;
      }

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
      setPending(true);
      void (async () => {
        const outcome = await resolveGeneral(text, policy === 'restricted' ? policy : 'general', convId, userId, [], replyId);
        setMessages(previous => [...previous, outcome.message]);
        persist(convId, outcome.message);
        if (outcome.retryable) {
          setRetryRequest({
            question: text,
            policy: policy === 'restricted' ? policy : 'general',
            conversationId: convId,
            userMessageId: userId,
            failedReplyIds: [replyId],
          });
        }
        setPending(false);
      })();
    },
    [context, provider, ensureConversation, persist, db, scope, resolveGeneral],
  );

  const retry = useCallback(async () => {
    if (!retryRequest) return;
    setPending(true);
    const replyId = newMessageUuid();
    const outcome = await resolveGeneral(
      retryRequest.question,
      retryRequest.policy,
      retryRequest.conversationId,
      retryRequest.userMessageId,
      retryRequest.failedReplyIds,
      replyId,
    );
    setMessages(previous => [...previous, outcome.message]);
    persist(retryRequest.conversationId, outcome.message);
    setRetryRequest(outcome.retryable
      ? { ...retryRequest, failedReplyIds: [...retryRequest.failedReplyIds, replyId] }
      : null);
    setPending(false);
  }, [persist, resolveGeneral, retryRequest]);

  const send = useCallback(() => ask(draft), [ask, draft]);

  // Clearing is starting over, which means leaving the old thread behind
  // entirely: keeping `conversationId` would put the next answer inside the
  // conversation the user just cleared, still carrying its history.
  const clear = startNewConversation;

  return {
    messages, draft, setDraft, send, ask, clear, pending,
    retry: retryRequest && !pending ? retry : undefined,
    conversationId, startNewConversation, openConversation,
  };
}

/** Conversations for a sidebar or history list — active (non-trashed) ones, most recent first. */
export function listConversationsForSidebar(db: SqlDriver, scope: LocalAccountScope = { activeAccountId: null }) {
  return listActiveConversations(db, scope);
}
