import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  AppText, Chip, Col, COLORS, Icon, IconName, PressableRow, RADIUS, Row,
  Section, Segmented, SHADOWS, SPACING, Toggle, useT,
} from '../../ui';

export interface SettingsScreenProps {
  language: 'EN' | 'FIL';
  useLocation: boolean;
  savedLocationLabel: string;
  climateProvider: string;
  normalsFetchedLabel: string;
  aiAssistant: boolean;
  aiAssistantDetail: string;
  contentVersion: string;
  modelsLabel: string;
  historyLabel: string;
  accountLabel: string;
  onChangeLanguage: (lang: string) => void;
  onToggleLocation: () => void;
  onChangeLocation: () => void;
  onForgetLocation: () => void;
  onRefreshNormals: () => void;
  onToggleAiAssistant: () => void;
  onOpenModels: () => void;
  onOpenHistory: () => void;
  onOpenAccount: () => void;
  onOpenTrash: () => void;
}

function Group({ children }: { children: React.ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

function GroupRow({
  icon,
  iconColor,
  title,
  titleColor,
  detail,
  right,
  onPress,
  first,
}: {
  icon?: IconName;
  iconColor?: string;
  title: string;
  titleColor?: string;
  detail?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  first?: boolean;
}) {
  const body = (
    <Row gap={SPACING.md - 4} style={[styles.row, !first && styles.rowDivided]}>
      {icon ? <Icon name={icon} size={20} color={iconColor ?? COLORS.textSecondary} /> : null}
      <Col gap={2} style={{ flex: 1 }}>
        <AppText variant="md" color={titleColor}>{title}</AppText>
        {detail ? (
          <AppText variant="xs" color={COLORS.textSecondary}>{detail}</AppText>
        ) : null}
      </Col>
      {right}
    </Row>
  );
  return onPress ? <PressableRow onPress={onPress}>{body}</PressableRow> : body;
}

export function SettingsScreen(props: SettingsScreenProps) {
  const t = useT();
  return (
    <>
      <Section gap={SPACING.sm + 2}>
        <AppText variant="smSemi" color={COLORS.textSecondary}>{t.sectionAccount}</AppText>
        <Group>
          <GroupRow
            first
            icon="shield"
            title={t.titleAccount}
            detail={props.accountLabel}
            right={<Icon name="chevronRight" size={18} color={COLORS.textLight} />}
            onPress={props.onOpenAccount}
          />
        </Group>
      </Section>

      <Section gap={SPACING.sm + 2}>
        <AppText variant="smSemi" color={COLORS.textSecondary}>{t.sectionLanguage}</AppText>
        <Group>
          <GroupRow
            first
            icon="globe"
            title={t.appLanguage}
            right={<Segmented options={['EN', 'FIL']} value={props.language} onChange={props.onChangeLanguage} />}
          />
        </Group>
      </Section>

      <Section gap={SPACING.sm + 2}>
        <AppText variant="smSemi" color={COLORS.textSecondary}>{t.sectionLocation}</AppText>
        <Group>
          <GroupRow
            first
            icon="pin"
            title={t.useMyLocation}
            detail={t.useMyLocationDetail}
            right={
              <Toggle
                on={props.useLocation}
                onPress={props.onToggleLocation}
                accessibilityLabel={t.useMyLocation}
              />
            }
          />
          <GroupRow
            icon="shield"
            title={t.savedLocation}
            detail={props.savedLocationLabel}
            right={<Icon name="chevronRight" size={18} color={COLORS.textLight} />}
            onPress={props.onChangeLocation}
          />
          <GroupRow
            icon="trash"
            iconColor={COLORS.error}
            title={t.forgetLocation}
            titleColor={COLORS.error}
            detail={t.forgetLocationDetail}
            onPress={props.onForgetLocation}
          />
        </Group>
      </Section>

      <Section gap={SPACING.sm + 2}>
        <AppText variant="smSemi" color={COLORS.textSecondary}>{t.sectionClimate}</AppText>
        <Group>
          {/* One provider is bundled, so this states a fact rather than
              offering a choice — no chevron promising a picker. */}
          <GroupRow first icon="cloud" title={t.provider} detail={props.climateProvider} />
          <GroupRow
            icon="refresh"
            title={t.refreshNormals}
            detail={props.normalsFetchedLabel}
            right={<Chip label={t.refresh} tone="outline" />}
            onPress={props.onRefreshNormals}
          />
        </Group>
      </Section>

      <Section gap={SPACING.sm + 2}>
        <AppText variant="smSemi" color={COLORS.textSecondary}>{t.sectionAssistant}</AppText>
        <Group>
          <GroupRow
            first
            icon="sparkle"
            title={t.aiAssistant}
            detail={props.aiAssistantDetail}
            right={
              <Toggle
                on={props.aiAssistant}
                onPress={props.onToggleAiAssistant}
                accessibilityLabel={t.aiAssistant}
              />
            }
          />
          <GroupRow
            icon="info"
            title={t.factsStayOnDevice}
            detail={t.factsStayDetail}
          />
        </Group>
      </Section>

      <Section gap={SPACING.sm + 2}>
        <AppText variant="smSemi" color={COLORS.textSecondary}>{t.sectionData}</AppText>
        <Group>
          <GroupRow
            first
            icon="send"
            title={t.dataDisclosure}
            detail={t.dataDisclosureDetail}
          />
          <GroupRow icon="file" title={t.knowledgeBase} detail={t.contentVersion(props.contentVersion)} />
          <GroupRow
            icon="package"
            title={t.detectionModels}
            detail={props.modelsLabel}
            right={<Icon name="chevronRight" size={18} color={COLORS.textLight} />}
            onPress={props.onOpenModels}
          />
          <GroupRow
            icon="history"
            title={t.scanHistory}
            detail={props.historyLabel}
            right={<Icon name="chevronRight" size={18} color={COLORS.textLight} />}
            onPress={props.onOpenHistory}
          />
          <GroupRow
            icon="trash"
            title={t.trashRow}
            right={<Icon name="chevronRight" size={18} color={COLORS.textLight} />}
            onPress={props.onOpenTrash}
          />
        </Group>
      </Section>

      <Section gap={SPACING.sm + 2}>
        <AppText variant="smSemi" color={COLORS.textSecondary}>{t.sectionAbout}</AppText>
        <Group>
          <GroupRow
            first
            icon="leaf"
            title="PrutasAI"
            detail={t.aboutBlurb}
          />
          <GroupRow
            title="Climate data by Open-Meteo, CC BY 4.0. Variety data from PCAARRD-DOST, DA and UPLB IPB."
          />
        </Group>
      </Section>
    </>
  );
}

const styles = StyleSheet.create({
  group: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  row: { paddingHorizontal: SPACING.md - 4, paddingVertical: SPACING.md - 4 },
  rowDivided: { borderTopWidth: 1, borderTopColor: COLORS.border },
});
