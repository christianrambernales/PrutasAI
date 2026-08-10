import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  AppText, Chip, Col, COLORS, Icon, IconName, PressableRow, RADIUS, Row,
  Section, Segmented, SHADOWS, SPACING, Toggle,
} from '../../ui';

export interface SettingsScreenProps {
  language: 'EN' | 'FIL';
  useLocation: boolean;
  savedLocationLabel: string;
  climateProvider: string;
  normalsFetchedLabel: string;
  onlinePhrasing: boolean;
  onlinePhrasingDetail: string;
  contentVersion: string;
  modelsLabel: string;
  historyLabel: string;
  onChangeLanguage: (lang: string) => void;
  onToggleLocation: () => void;
  onForgetLocation: () => void;
  onRefreshNormals: () => void;
  onToggleOnlinePhrasing: () => void;
  onOpenModels: () => void;
  onOpenHistory: () => void;
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
  return (
    <>
      <Section gap={SPACING.sm + 2}>
        <AppText variant="smSemi" color={COLORS.textSecondary}>LANGUAGE</AppText>
        <Group>
          <GroupRow
            first
            icon="globe"
            title="App language"
            right={<Segmented options={['EN', 'FIL']} value={props.language} onChange={props.onChangeLanguage} />}
          />
        </Group>
      </Section>

      <Section gap={SPACING.sm + 2}>
        <AppText variant="smSemi" color={COLORS.textSecondary}>LOCATION &amp; PRIVACY</AppText>
        <Group>
          <GroupRow
            first
            icon="pin"
            title="Use my location"
            detail="Coarse only · asked when first needed"
            right={<Toggle on={props.useLocation} onPress={props.onToggleLocation} />}
          />
          <GroupRow icon="shield" title="Saved location" detail={props.savedLocationLabel} />
          <GroupRow
            icon="trash"
            iconColor={COLORS.error}
            title="Forget my location"
            titleColor={COLORS.error}
            detail="Clears cached coordinates and climate rows"
            onPress={props.onForgetLocation}
          />
        </Group>
      </Section>

      <Section gap={SPACING.sm + 2}>
        <AppText variant="smSemi" color={COLORS.textSecondary}>CLIMATE</AppText>
        <Group>
          <GroupRow
            first
            icon="cloud"
            title="Provider"
            detail={props.climateProvider}
            right={<Icon name="chevronDown" size={18} color={COLORS.textLight} />}
          />
          <GroupRow
            icon="refresh"
            title="Refresh normals"
            detail={props.normalsFetchedLabel}
            right={<Chip label="Refresh" tone="outline" />}
            onPress={props.onRefreshNormals}
          />
        </Group>
      </Section>

      <Section gap={SPACING.sm + 2}>
        <AppText variant="smSemi" color={COLORS.textSecondary}>ASSISTANT</AppText>
        <Group>
          <GroupRow
            first
            icon="sparkle"
            title="Online phrasing"
            detail={props.onlinePhrasingDetail}
            right={<Toggle on={props.onlinePhrasing} onPress={props.onToggleOnlinePhrasing} />}
          />
          <GroupRow
            icon="info"
            title="Facts stay on the device"
            detail="An online model may only reword a verdict, never change it."
          />
        </Group>
      </Section>

      <Section gap={SPACING.sm + 2}>
        <AppText variant="smSemi" color={COLORS.textSecondary}>DATA</AppText>
        <Group>
          <GroupRow first icon="file" title="Knowledge base" detail={`Content version ${props.contentVersion}`} />
          <GroupRow
            icon="package"
            title="Detection models"
            detail={props.modelsLabel}
            right={<Icon name="chevronRight" size={18} color={COLORS.textLight} />}
            onPress={props.onOpenModels}
          />
          <GroupRow
            icon="history"
            title="Scan history"
            detail={props.historyLabel}
            right={<Icon name="chevronRight" size={18} color={COLORS.textLight} />}
            onPress={props.onOpenHistory}
          />
        </Group>
      </Section>

      <Section gap={SPACING.sm + 2}>
        <AppText variant="smSemi" color={COLORS.textSecondary}>ABOUT</AppText>
        <Group>
          <GroupRow
            first
            icon="leaf"
            title="PrutasAI"
            detail="Offline-first fruit, variety and disease identification"
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
