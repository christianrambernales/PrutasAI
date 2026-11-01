import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ChatScreen, ChatScreenProps } from '../ChatScreen';
import { ConversationSidebar } from '../ConversationSidebar';
import { LanguageProvider, strings } from '../../../ui';
import type { Language } from '../../../ui';
import type { ChatMessage } from '../../viewModels';

const MOCK_SUGGESTIONS = [
  'How do I monitor my crop recovery?',
  'What are the symptoms of anthracnose?',
  'Is my area suitable for mango?',
];

const MOCK_CONVERSATIONS = [
  { uuid: 'c1', title: 'Banana care', createdAt: '2026-08-30T00:00:00.000Z', updatedAt: '2026-08-30T00:00:00.000Z', deletedAt: null },
  { uuid: 'c2', title: 'Mango pests', createdAt: '2026-08-29T00:00:00.000Z', updatedAt: '2026-08-29T00:00:00.000Z', deletedAt: null },
];

function defaultProps(overrides: Partial<ChatScreenProps> = {}): ChatScreenProps {
  return {
    messages: [],
    suggestions: MOCK_SUGGESTIONS,
    curatedWording: true,
    draft: '',
    onChangeDraft: jest.fn(),
    onSend: jest.fn(),
    onSuggestion: jest.fn(),
    pending: false,
    onOpenConversations: jest.fn(),
    onNewConversation: jest.fn(),
    ...overrides,
  };
}

describe('Redesign Assistant and Chat flows', () => {
  describe.each<Language>(['EN', 'FIL'])('Assistant Screen in %s', language => {
    const t = strings(language);

    it('blank-first entry renders welcome suggestions, decision support banner, and empty composer', async () => {
      const onOpenConversations = jest.fn();
      const onSuggestion = jest.fn();
      const props = defaultProps({
        onOpenConversations,
        onSuggestion,
        messages: [],
        draft: '',
      });

      await render(
        <LanguageProvider language={language}>
          <ChatScreen {...props} />
        </LanguageProvider>,
      );

      // Top conversations action
      expect(screen.getByRole('button', { name: t.chatConversations })).toBeTruthy();

      // Decision support safety banner
      expect(screen.getByText(t.chatDecisionSupportBanner)).toBeTruthy();

      // Welcome card and suggestions
      expect(screen.getByText(t.welcomeAssistantTitle)).toBeTruthy();
      expect(screen.getByText(t.welcomeAssistantDetail)).toBeTruthy();
      expect(screen.getByText(t.starterQuestionsTitle)).toBeTruthy();

      // No prefilled transcript messages
      expect(screen.queryByText('Sample fake message')).toBeNull();

      // Suggestions are clickable
      const firstSuggestion = screen.getByRole('button', { name: MOCK_SUGGESTIONS[0] });
      await fireEvent.press(firstSuggestion);
      expect(onSuggestion).toHaveBeenCalledWith(MOCK_SUGGESTIONS[0]);

      // Composer textbox is present
      const input = screen.getByRole('textbox');
      expect(input.props.value).toBe('');
      expect(input.props.placeholder).toBe(t.askPlaceholder);

      // Send button is disabled when draft is blank
      const sendButton = screen.getByRole('button', { name: new RegExp(t.send) });
      expect(sendButton.props.accessibilityState?.disabled).toBe(true);
    });

    it('changing draft text and pressing Send invokes onSend', async () => {
      const onChangeDraft = jest.fn();
      const onSend = jest.fn();

      function Host() {
        const [draft, setDraft] = useState('');
        return (
          <LanguageProvider language={language}>
            <ChatScreen
              {...defaultProps({
                draft,
                onChangeDraft: text => {
                  setDraft(text);
                  onChangeDraft(text);
                },
                onSend,
              })}
            />
          </LanguageProvider>
        );
      }

      await render(<Host />);

      const input = screen.getByRole('textbox');
      await fireEvent.changeText(input, 'How do I monitor my crop?');
      expect(onChangeDraft).toHaveBeenCalledWith('How do I monitor my crop?');

      const sendButton = screen.getByRole('button', { name: new RegExp(t.send) });
      expect(sendButton.props.accessibilityState?.disabled).toBe(false);

      await fireEvent.press(sendButton);
      expect(onSend).toHaveBeenCalledTimes(1);
    });

    it('pending state disables Send button and displays TypingIndicator', async () => {
      const onSend = jest.fn();
      const props = defaultProps({
        pending: true,
        draft: 'How to treat anthracnose?',
        onSend,
      });

      await render(
        <LanguageProvider language={language}>
          <ChatScreen {...props} />
        </LanguageProvider>,
      );

      // Typing indicator progressbar is displayed
      const progress = screen.getByRole('progressbar');
      expect(progress.props.accessibilityLabel).toBe(t.titleAssistant);
      expect(progress.props.accessibilityState).toMatchObject({ busy: true });
      expect(screen.getByTestId('typing-indicator')).toBeTruthy();

      // Send button is disabled
      const sendButton = screen.getByRole('button', { name: new RegExp(t.send) });
      expect(sendButton.props.accessibilityState?.disabled).toBe(true);

      await fireEvent.press(sendButton);
      expect(onSend).not.toHaveBeenCalled();
    });

    it('displays error retry action when onRetry is provided', async () => {
      const onRetry = jest.fn();
      const props = defaultProps({
        onRetry,
      });

      await render(
        <LanguageProvider language={language}>
          <ChatScreen {...props} />
        </LanguageProvider>,
      );

      const retryButton = screen.getByRole('button', { name: t.retry });
      await fireEvent.press(retryButton);
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('renders user and assistant messages with guarded notices', async () => {
      const messages: ChatMessage[] = [
        { id: 'm1', role: 'user', kind: 'grounded', text: 'Anong sakit ito?' },
        { id: 'm2', role: 'assistant', kind: 'restricted', text: 'Kumonsulta sa MAO para sa reseta.' },
        { id: 'm3', role: 'assistant', kind: 'general', text: 'Ang mangga ay nangangailangan ng araw.' },
      ];

      await render(
        <LanguageProvider language={language}>
          <ChatScreen {...defaultProps({ messages })} />
        </LanguageProvider>,
      );

      expect(screen.getByText('Anong sakit ito?')).toBeTruthy();
      expect(screen.getByText('Kumonsulta sa MAO para sa reseta.')).toBeTruthy();
      expect(screen.getByText(t.restrictedGuidance)).toBeTruthy();
      expect(screen.getByText(t.restrictedWarning)).toBeTruthy();

      expect(screen.getByText('Ang mangga ay nangangailangan ng araw.')).toBeTruthy();
      expect(screen.getByText(t.generalGuidance)).toBeTruthy();
      expect(screen.getByText(t.notFromKnowledgeBase)).toBeTruthy();
    });
  });

  describe('Conversations Drawer & Menus', () => {
    it('opens drawer, lists conversations, and allows new conversation creation', async () => {
      const onSelect = jest.fn();
      const onNew = jest.fn();
      const onClose = jest.fn();

      await render(
        <LanguageProvider language="EN">
          <ConversationSidebar
            visible={true}
            conversations={MOCK_CONVERSATIONS}
            activeId="c1"
            onSelect={onSelect}
            onNew={onNew}
            onClose={onClose}
            onRename={jest.fn()}
            onDelete={jest.fn()}
          />
        </LanguageProvider>,
      );

      expect(screen.getByText('Banana care')).toBeTruthy();
      expect(screen.getByText('Mango pests')).toBeTruthy();

      // New conversation action
      const newBtn = screen.getByRole('button', { name: 'New conversation' });
      await fireEvent.press(newBtn);
      expect(onNew).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);

      // Selecting conversation
      await fireEvent.press(screen.getByText('Mango pests'));
      expect(onSelect).toHaveBeenCalledWith('c2');
      expect(onClose).toHaveBeenCalledTimes(2);
    });

    it('provides rename action on conversation row', async () => {
      const onRename = jest.fn();

      await render(
        <LanguageProvider language="EN">
          <ConversationSidebar
            visible={true}
            conversations={MOCK_CONVERSATIONS}
            activeId={null}
            onSelect={jest.fn()}
            onNew={jest.fn()}
            onClose={jest.fn()}
            onRename={onRename}
            onDelete={jest.fn()}
          />
        </LanguageProvider>,
      );

      // Open options menu on first conversation
      const moreOptions = screen.getAllByLabelText('More options')[0];
      await fireEvent.press(moreOptions);

      expect(screen.getByText('Rename')).toBeTruthy();
      expect(screen.getByText('Move to Trash')).toBeTruthy();

      // Trigger Rename
      await fireEvent.press(screen.getByText('Rename'));
      const renameInput = screen.getByDisplayValue('Banana care');
      await fireEvent.changeText(renameInput, 'Banana care 2026');
      await fireEvent(renameInput, 'submitEditing');

      expect(onRename).toHaveBeenCalledWith('c1', 'Banana care 2026');
    });

    it('provides confirmation dialog before moving conversation to trash', async () => {
      const onDelete = jest.fn();

      await render(
        <LanguageProvider language="EN">
          <ConversationSidebar
            visible={true}
            conversations={MOCK_CONVERSATIONS}
            activeId={null}
            onSelect={jest.fn()}
            onNew={jest.fn()}
            onClose={jest.fn()}
            onRename={jest.fn()}
            onDelete={onDelete}
          />
        </LanguageProvider>,
      );

      // Open options menu on first conversation
      const moreOptions = screen.getAllByLabelText('More options')[0];
      await fireEvent.press(moreOptions);

      // Press Move to Trash
      await fireEvent.press(screen.getByText('Move to Trash'));

      // Confirmation dialog should be presented
      const confirmBody = screen.getByText(
        'Are you sure you want to permanently delete this conversation? This action cannot be undone.',
      );
      expect(confirmBody).toBeTruthy();

      // Cancel button dismisses without calling onDelete
      const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
      await fireEvent.press(cancelBtn);
      expect(onDelete).not.toHaveBeenCalled();

      // Open menu again and confirm
      await fireEvent.press(screen.getAllByLabelText('More options')[0]);
      await fireEvent.press(screen.getByText('Move to Trash'));

      // In confirmation dialog, press the Move to Trash action button
      const confirmDeleteButtons = screen.getAllByRole('button', { name: 'Move to Trash' });
      await fireEvent.press(confirmDeleteButtons[confirmDeleteButtons.length - 1]);

      expect(onDelete).toHaveBeenCalledWith('c1');
    });

    it('renders sliding drawer with prototype 1:1 styles and trash button triggers confirmation', async () => {
      const onDelete = jest.fn();
      const onClose = jest.fn();
      const onNew = jest.fn();
      await render(
        <LanguageProvider language="EN">
          <ConversationSidebar
            visible={true}
            conversations={MOCK_CONVERSATIONS}
            activeId="c1"
            onSelect={jest.fn()}
            onNew={onNew}
            onClose={onClose}
            onRename={jest.fn()}
            onDelete={onDelete}
          />
        </LanguageProvider>,
      );

      // Header 🌾 Past Chats
      expect(screen.getByText(/🌾 Past Chats/i)).toBeTruthy();

      // Close button ✕
      const closeBtn = screen.getByText('✕');
      await fireEvent.press(closeBtn);
      expect(onClose).toHaveBeenCalled();

      // + Start New Chat button
      const newChatBtn = screen.getByText(/\+ Start New Chat/i);
      await fireEvent.press(newChatBtn);
      expect(onNew).toHaveBeenCalled();

      // Recent conversations section
      expect(screen.getByText(/Recent Conversations/i)).toBeTruthy();

      // Direct trash button 🗑️ triggers confirmation dialog
      const trashButtons = screen.getAllByText('🗑️');
      expect(trashButtons.length).toBeGreaterThanOrEqual(2);
      await fireEvent.press(trashButtons[0]);

      // Confirmation dialog appears
      expect(screen.getByText(/Are you sure you want to permanently delete/i)).toBeTruthy();
      const confirmButtons = screen.getAllByRole('button', { name: 'Move to Trash' });
      await fireEvent.press(confirmButtons[confirmButtons.length - 1]);
      expect(onDelete).toHaveBeenCalledWith('c1');
    });

    it('renders sliding drawer in Filipino with Mga Nakaraang Usapan header', async () => {
      await render(
        <LanguageProvider language="FIL">
          <ConversationSidebar
            visible={true}
            conversations={MOCK_CONVERSATIONS}
            activeId="c1"
            onSelect={jest.fn()}
            onNew={jest.fn()}
            onClose={jest.fn()}
            onRename={jest.fn()}
            onDelete={jest.fn()}
          />
        </LanguageProvider>,
      );

      expect(screen.getByText(/🌾 Mga Nakaraang Usapan/i)).toBeTruthy();
      expect(screen.getByText(/\+ Bagong Usapan/i)).toBeTruthy();
      expect(screen.getByText(/Kamakailan/i)).toBeTruthy();
    });
  });

  describe('Screen 11 Prototype 1:1 Alignment', () => {
    it('renders ChatScreen with drawer trigger, safety banner, and bubbles', async () => {
      await render(
        <ChatScreen
          activeTitle="Mango Leaf Spot Question"
          messages={[
            { id: '1', sender: 'bot', text: 'Hello! I am your PrutasAI Agro-Assistant.' },
            { id: '2', sender: 'user', text: 'How do I manage anthracnose?' },
          ]}
          draftText=""
          onChangeDraft={jest.fn()}
          onSend={jest.fn()}
          onOpenDrawer={jest.fn()}
          onNewChat={jest.fn()}
        />,
      );
      expect(screen.getByText(/Mango Leaf Spot Question/i)).toBeTruthy();
      expect(screen.getByText(/Curated Offline Knowledge/i)).toBeTruthy();
      expect(screen.getByText(/Decision support only/i)).toBeTruthy();
      expect(screen.getByText(/🌾 PrutasAI Bot/i)).toBeTruthy();
      expect(screen.getByText(/How do I manage anthracnose\?/i)).toBeTruthy();
    });

    it('renders ChatScreen in Filipino with localized header, banner, and buttons', async () => {
      await render(
        <LanguageProvider language="FIL">
          <ChatScreen
            activeTitle="Tanong ukol sa Batik ng Mangga"
            messages={[
              { id: '1', sender: 'bot', text: 'Kamusta! Ako ang iyong PrutasAI Agro-Assistant.' },
              { id: '2', sender: 'user', text: 'Paano sugpuin ang anthracnose?' },
            ]}
            draftText=""
            onChangeDraft={jest.fn()}
            onSend={jest.fn()}
            onOpenDrawer={jest.fn()}
            onNewChat={jest.fn()}
          />
        </LanguageProvider>,
      );
      expect(screen.getByText(/Tanong ukol sa Batik ng Mangga/i)).toBeTruthy();
      expect(screen.getByText(/Naka-save na Kaalaman/i)).toBeTruthy();
      expect(screen.getByText(/Pangsuporta lamang sa desisyon/i)).toBeTruthy();
      expect(screen.getByText(/\+ Bago/i)).toBeTruthy();
      expect(screen.getByText(/🌾 PrutasAI Bot/i)).toBeTruthy();
      expect(screen.getByText(/Paano sugpuin ang anthracnose\?/i)).toBeTruthy();
    });
  });
});
