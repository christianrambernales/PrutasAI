import React, { useState } from 'react';
import { Pressable, TextInput, View, StyleSheet } from 'react-native';
import { AppText, COLORS, Icon, PressableRow, RADIUS, SPACING, useT } from '../../ui';

export interface ConversationRowMenuProps {
  currentTitle: string;
  onRename: (title: string) => void;
  onDelete: () => void;
}

export function ConversationRowMenu({ currentTitle, onRename, onDelete }: ConversationRowMenuProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(currentTitle);

  if (renaming) {
    return (
      <TextInput
        style={styles.input}
        value={draft}
        onChangeText={setDraft}
        autoFocus
        onSubmitEditing={() => { onRename(draft.trim() || currentTitle); setRenaming(false); }}
        onBlur={() => setRenaming(false)}
      />
    );
  }

  return (
    <View>
      <Pressable accessibilityLabel={t.moreOptions} hitSlop={8} onPress={() => setOpen(o => !o)}>
        <Icon name="moreHorizontal" size={18} color={COLORS.textSecondary} />
      </Pressable>
      {open ? (
        <View style={styles.menu}>
          <PressableRow onPress={() => { setOpen(false); setDraft(currentTitle); setRenaming(true); }}>
            <AppText variant="sm">{t.rename}</AppText>
          </PressableRow>
          <PressableRow onPress={() => { setOpen(false); onDelete(); }}>
            <AppText variant="sm" color={COLORS.error}>{t.delete}</AppText>
          </PressableRow>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  menu: {
    position: 'absolute', right: 0, top: 24, minWidth: 140, backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border, paddingVertical: SPACING.xs,
    zIndex: 10, elevation: 4,
  },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm, paddingVertical: 4, color: COLORS.text, minWidth: 140,
  },
});
