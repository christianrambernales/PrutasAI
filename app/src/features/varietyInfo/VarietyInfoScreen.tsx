import React, { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BtnOrangeFull,
  BtnSubtle,
  Chip,
  COLORS,
  FONTS,
  FrostedCard,
  GreenTopCell,
  Icon,
  SPACING,
  useLanguage,
  useT,
} from '../../ui';
import type { DiseaseSummary, FruitSummary, Source, VarietySummary } from '../viewModels';

export interface CropRequirement {
  label: string;
  value: string;
  icon: 'thermometer' | 'cloudRain' | 'mountain';
}

export interface VarietyInfoScreenProps {
  fruit?: FruitSummary | null;
  modelVarieties?: VarietySummary[];
  /** Rows with is_ml_class = false: shown, never predicted. */
  informationOnly?: VarietySummary[];
  diseases?: DiseaseSummary[];
  requirements?: CropRequirement[];
  requirementsVerified?: boolean;
  sources?: Source[];
  /** Key of the row currently opened */
  expandedVarietyKey?: string | null;
  onOpenVariety?: (key: string) => void;
  onBack?: () => void;

  /** Prototype v2 integration */
  selectedCrop?: 'mango' | 'banana' | 'papaya' | string;
  onSelectCrop?: (crop: 'mango' | 'banana' | 'papaya' | string) => void;
  onScanCrop?: () => void;
  onBackHome?: () => void;
  style?: StyleProp<ViewStyle>;
}

export interface CropProfileData {
  key: string;
  emoji: string;
  nameEn: string;
  nameFil: string;
  titleEn: string;
  titleFil: string;
  scientificName: string;
  temp: string;
  rainfall: string;
  elevation: string;
  soilPh: string;
  vulnerabilities: Array<{
    nameEn: string;
    nameFil: string;
    descEn: string;
    descFil: string;
  }>;
}

export const CROP_PROFILES: Record<string, CropProfileData> = {
  mango: {
    key: 'mango',
    emoji: '🥭',
    nameEn: 'Mango',
    nameFil: 'Mangga',
    titleEn: '🥭 Carabao Mango',
    titleFil: '🥭 Carabao Mango',
    scientificName: 'Mangifera indica L.',
    temp: '24°C – 32°C',
    rainfall: '1,500 – 2,200 mm',
    elevation: '0 – 600m ASL',
    soilPh: '5.5 – 7.5',
    vulnerabilities: [
      {
        nameEn: 'Anthracnose',
        nameFil: 'Antraknos',
        descEn: 'High risk during flowering and extended wet periods.',
        descFil: 'Mataas ang peligro sa panahon ng pamumulaklak at tag-ulan.',
      },
      {
        nameEn: 'Stem End Rot',
        nameFil: 'Stem End Rot',
        descEn: 'Post-harvest fungal decay.',
        descFil: 'Fungal issue pagkatapos ng anihan.',
      },
    ],
  },
  banana: {
    key: 'banana',
    emoji: '🍌',
    nameEn: 'Banana',
    nameFil: 'Saging',
    titleEn: '🍌 Lakatan Banana',
    titleFil: '🍌 Saging (Lakatan Banana)',
    scientificName: 'Musa acuminata',
    temp: '26°C – 30°C',
    rainfall: '2,000 – 2,500 mm',
    elevation: '0 – 1,000m ASL',
    soilPh: '5.5 – 7.0',
    vulnerabilities: [
      {
        nameEn: 'Panama Disease',
        nameFil: 'Panama Disease (Fusarium Wilt)',
        descEn: 'Soil-borne fungal pathogen attacking vascular system.',
        descFil: 'Sakit na dala ng fungus sa lupa na sumisira sa daluyan ng tubig.',
      },
      {
        nameEn: 'Black Sigatoka',
        nameFil: 'Black Sigatoka',
        descEn: 'Airborne fungal leaf spot devastating photosynthesis.',
        descFil: 'Fungal leaf spot na sumisira sa dahon at photosynthesis.',
      },
    ],
  },
  papaya: {
    key: 'papaya',
    emoji: '🍈',
    nameEn: 'Papaya',
    nameFil: 'Papaya',
    titleEn: '🍈 Red Lady Papaya',
    titleFil: '🍈 Red Lady Papaya',
    scientificName: 'Carica papaya',
    temp: '25°C – 33°C',
    rainfall: '1,200 – 1,800 mm',
    elevation: '0 – 500m ASL',
    soilPh: '6.0 – 6.8',
    vulnerabilities: [
      {
        nameEn: 'Papaya Ringspot Virus (PRSV)',
        nameFil: 'Papaya Ringspot Virus (PRSV)',
        descEn: 'Aphid-transmitted potyvirus causing mottled leaves and fruit rings.',
        descFil: 'Virus mula sa aphid na nagdudulot ng batik-batik sa dahon at bilog sa bunga.',
      },
      {
        nameEn: 'Anthracnose',
        nameFil: 'Antraknos',
        descEn: 'Circular sunken fruit lesions during rainy conditions.',
        descFil: 'Pabilog at lumulubog na mga sugat sa bunga sa panahon ng tag-ulan.',
      },
    ],
  },
};

const CROP_TABS = [
  { key: 'mango', emoji: '🥭', labelEn: 'Mango', labelFil: 'Mangga' },
  { key: 'banana', emoji: '🍌', labelEn: 'Banana', labelFil: 'Saging' },
  { key: 'papaya', emoji: '🍈', labelEn: 'Papaya', labelFil: 'Papaya' },
];

export function VarietyInfoScreen(props: VarietyInfoScreenProps) {
  const t = useT();
  const language = useLanguage();
  const isFil = language === 'FIL';
  const insets = useSafeAreaInsets();

  const {
    fruit,
    modelVarieties = [],
    informationOnly = [],
    diseases = [],
    requirements = [],
    requirementsVerified = true,
    sources = [],
    expandedVarietyKey,
    onOpenVariety,
    onBack,
    selectedCrop,
    onSelectCrop,
    onScanCrop,
    onBackHome,
    style,
  } = props;

  // If fruit is explicitly null and no selectedCrop passed, render missing content card
  if (fruit === null && !selectedCrop) {
    return (
      <ScrollView
        style={[styles.container, style]}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + SPACING.sm }]}
      >
        <FrostedCard style={styles.card}>
          <Text
            accessibilityRole="header"
            accessibilityLiveRegion="polite"
            style={styles.sectionHeader}
          >
            Missing local content
          </Text>
          <Text style={styles.infoCaveat} accessibilityLiveRegion="polite">
            We couldn't find the requested crop knowledge. It might be missing from the local compiled database.
          </Text>
          {onBack ? (
            <BtnSubtle
              label={t.goBack}
              accessibilityLabel={t.goBack}
              onPress={onBack}
              style={styles.homeBtn}
            />
          ) : null}
        </FrostedCard>
      </ScrollView>
    );
  }

  const initialKey = (selectedCrop ?? fruit?.key ?? 'mango').toLowerCase();
  const [activeCropKey, setActiveCropKey] = useState<string>(
    initialKey in CROP_PROFILES ? initialKey : 'mango'
  );

  useEffect(() => {
    const next = (selectedCrop ?? fruit?.key)?.toLowerCase();
    if (next && next in CROP_PROFILES) {
      setActiveCropKey(next);
    }
  }, [selectedCrop, fruit?.key]);

  const activeProfile = CROP_PROFILES[activeCropKey] ?? CROP_PROFILES.mango;

  const handleTabPress = (cropKey: string) => {
    setActiveCropKey(cropKey);
    onSelectCrop?.(cropKey);
  };

  const handleBack = onBackHome ?? onBack;
  const handleScan = onScanCrop ?? onBack;

  const isPropFruit = !fruit || fruit.key.toLowerCase() === activeCropKey;
  const cropDisplayName = isFil ? activeProfile.nameFil : activeProfile.nameEn;

  return (
    <ScrollView
      style={[styles.container, style]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + SPACING.sm, paddingBottom: insets.bottom + SPACING.xl },
      ]}
    >
      {/* 1. GreenTopCell */}
      <GreenTopCell
        title={isFil ? activeProfile.titleFil : activeProfile.titleEn}
        subtitle={activeProfile.scientificName}
        rightAction={
          handleBack ? (
            <BtnSubtle
              label="← Home"
              textColor="#ffffff"
              onPress={handleBack}
              style={styles.homeBtn}
            />
          ) : undefined
        }
      />

      {/* Fruit summary primary/alternate names when fruit prop is provided */}
      {fruit ? (
        <View style={styles.fruitMetaRow}>
          <Text accessibilityRole="header" style={styles.fruitPrimaryName}>
            {isFil ? fruit.nameFil : fruit.nameEn}
          </Text>
          <Text style={styles.fruitAlternateName}>
            {isFil ? fruit.nameEn : fruit.nameFil}
          </Text>
        </View>
      ) : null}

      {/* 2. Crop Selector Tabs */}
      <View style={styles.tabsRow} accessibilityRole="tablist">
        {CROP_TABS.map(tab => {
          const isActive = tab.key === activeCropKey;
          const label = isFil ? tab.labelFil : tab.labelEn;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${tab.emoji} ${label}`}
              onPress={() => handleTabPress(tab.key)}
              style={({ pressed }) => [
                styles.tabBtn,
                isActive ? styles.tabBtnActive : styles.tabBtnInactive,
                pressed && styles.tabBtnPressed,
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  isActive ? styles.tabTextActive : styles.tabTextInactive,
                ]}
              >
                {`${tab.emoji} ${label}`}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* 3. Agronomic Thresholds */}
      <FrostedCard style={styles.card}>
        <View style={styles.headerWithBadge}>
          <Text accessibilityRole="header" style={styles.sectionHeader}>
            {isFil ? 'Agronomic Thresholds (Pangangailangan)' : 'Agronomic Thresholds'}
          </Text>
          {!requirementsVerified ? (
            <Chip label={t.unverified} tone="warning" />
          ) : null}
        </View>

        {!requirementsVerified ? (
          <Text style={styles.infoCaveat}>
            Awaiting agriculturist sign-off — shown with a caveat until crop-requirements.yaml carries a citation.
          </Text>
        ) : null}

        <View style={styles.thresholdGrid}>
          <View style={styles.thresholdTile}>
            <Text style={styles.thresholdContent}>
              <Text style={styles.thresholdLabel}>🌡️ {isFil ? 'Temperatura:' : 'Temp:'} </Text>
              <Text style={styles.thresholdValue}>{activeProfile.temp}</Text>
            </Text>
          </View>
          <View style={styles.thresholdTile}>
            <Text style={styles.thresholdContent}>
              <Text style={styles.thresholdLabel}>🌧️ {isFil ? 'Taunang Ulan:' : 'Rainfall:'} </Text>
              <Text style={styles.thresholdValue}>{activeProfile.rainfall}</Text>
            </Text>
          </View>
          <View style={styles.thresholdTile}>
            <Text style={styles.thresholdContent}>
              <Text style={styles.thresholdLabel}>⛰️ Elevation: </Text>
              <Text style={styles.thresholdValue}>{activeProfile.elevation}</Text>
            </Text>
          </View>
          <View style={styles.thresholdTile}>
            <Text style={styles.thresholdContent}>
              <Text style={styles.thresholdLabel}>🌱 {isFil ? 'Lupa (pH):' : 'Soil pH:'} </Text>
              <Text style={styles.thresholdValue}>{activeProfile.soilPh}</Text>
            </Text>
          </View>
        </View>

        {requirements.length > 0 ? (
          <View style={styles.requirementsList} accessibilityRole="list">
            {requirements.map(req => (
              <View key={req.label} style={styles.reqItem}>
                <Text style={styles.reqLabel}>{req.label}</Text>
                <Text style={styles.reqValue}>{req.value}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </FrostedCard>

      {/* 4. Key Vulnerabilities */}
      <FrostedCard style={styles.card}>
        <Text accessibilityRole="header" style={styles.sectionHeader}>
          {t.diseases}
        </Text>
        <Text style={styles.sectionSubheader}>
          {isFil ? 'Mga Pangunahing Sakit (Local Knowledge)' : 'Key Vulnerabilities'}
        </Text>
        <View style={styles.vulnerabilitiesCol} accessibilityRole="list">
          {isPropFruit && diseases.length > 0 ? (
            diseases.map(d => {
              const primaryName = isFil ? d.nameFil : d.nameEn;
              const alternateName = isFil ? d.nameEn : d.nameFil;
              const desc =
                (isFil ? d.descriptionFil : d.descriptionEn) ||
                d.descriptionEn ||
                d.descriptionFil;
              return (
                <View key={d.key} style={styles.vulnerabilityBox}>
                  <Text style={styles.vulnerabilityText}>
                    • <Text style={styles.vulnerabilityStrong}>{primaryName}</Text>
                    {alternateName !== primaryName ? ` (${alternateName})` : ''}: {desc}
                  </Text>
                  {d.source ? (
                    <Text style={styles.vulnerabilitySource}>
                      {[d.source.citation, d.source.detail, d.source.retrievedLabel]
                        .filter(Boolean)
                        .join(' — ')}
                    </Text>
                  ) : null}
                </View>
              );
            })
          ) : (
            activeProfile.vulnerabilities.map(v => {
              const name = isFil ? v.nameFil : v.nameEn;
              const desc = isFil ? v.descFil : v.descEn;
              return (
                <View key={v.nameEn} style={styles.vulnerabilityBox}>
                  <Text style={styles.vulnerabilityText}>
                    • <Text style={styles.vulnerabilityStrong}>{name}: </Text>
                    {desc}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </FrostedCard>

      {/* 5. Model Classes & Information-Only (When provided from database / preview) */}
      {isPropFruit && modelVarieties.length > 0 ? (
        <FrostedCard style={styles.card}>
          <Text accessibilityRole="header" style={styles.sectionHeader}>
            {t.identifiedByModel ?? 'Identified by the model'}
          </Text>
          <View style={styles.varietiesList} accessibilityRole="list">
            {modelVarieties.map(v => {
              const vName = isFil ? v.nameFil : v.nameEn;
              const isSelected = v.key === expandedVarietyKey;
              return (
                <Pressable
                  key={v.key}
                  accessibilityRole="button"
                  accessibilityLabel={vName}
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => onOpenVariety?.(v.key)}
                  style={[styles.varietyItem, isSelected && styles.varietyItemSelected]}
                >
                  <View style={styles.varietyItemRow}>
                    <Text style={styles.varietyName}>{vName}</Text>
                    {v.note ? <Text style={styles.varietyNote}>{v.note}</Text> : null}
                  </View>
                  {isSelected ? (
                    <View style={styles.expandedVariety}>
                      <View style={styles.expandedRow}>
                        <Text style={styles.expandedLabel}>{t.filipinoName}</Text>
                        <Text style={styles.expandedValue}>{v.nameFil}</Text>
                      </View>
                      <View style={styles.expandedRow}>
                        <Text style={styles.expandedLabel}>{t.classIndex}</Text>
                        <Text style={styles.expandedValue}>{v.mlClassIndex}</Text>
                      </View>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </FrostedCard>
      ) : null}

      {isPropFruit && informationOnly.length > 0 ? (
        <FrostedCard style={styles.card}>
          <View style={styles.headerWithBadge}>
            <Text accessibilityRole="header" style={styles.sectionHeader}>
              {t.informationOnly ?? 'Information only'}
            </Text>
            <Chip label={t.notPredicted} tone="outline" />
          </View>
          <Text style={styles.infoCaveat}>
            Clonal selections that cannot be told apart in a photograph, so the classifier never predicts them — they live in the information layer only.
          </Text>
          <View style={styles.varietiesList} accessibilityRole="list">
            {informationOnly.map(v => {
              const vName = isFil ? v.nameFil : v.nameEn;
              return (
                <View key={v.key} style={styles.varietyItem}>
                  <Text style={styles.varietyName}>{vName}</Text>
                  {v.parentName ? <Text style={styles.varietyParent}>→ {v.parentName}</Text> : null}
                </View>
              );
            })}
          </View>
        </FrostedCard>
      ) : null}

      {isPropFruit && sources.length > 0 ? (
        <FrostedCard style={styles.card}>
          <Text accessibilityRole="header" style={styles.sectionHeader}>
            {t.sources ?? 'Sources & Citations'}
          </Text>
          <View style={styles.sourcesList} accessibilityRole="list">
            {sources.map((s, idx) => (
              <View key={s.citation || idx} style={styles.sourceItem}>
                <Text style={styles.sourceCitation}>{s.citation}</Text>
                {s.detail ? <Text style={styles.sourceDetail}>{s.detail}</Text> : null}
                {s.retrievedLabel ? (
                  <Text style={styles.sourceRetrieved}>{s.retrievedLabel}</Text>
                ) : null}
              </View>
            ))}
          </View>
        </FrostedCard>
      ) : null}

      {/* 6. Action CTA: Scan this Crop */}
      <BtnOrangeFull
        label={isFil ? `Kumuha ng Scan para sa ${cropDisplayName}` : 'Scan this Crop'}
        icon={<Icon name="camera" size={18} color="#ffffff" />}
        onPress={handleScan}
        style={styles.scanBtn}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f3',
  },
  content: {
    paddingHorizontal: SPACING.md,
    gap: 12,
  },
  homeBtn: {
    minHeight: 48,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fruitMetaRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'baseline',
  },
  fruitPrimaryName: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: FONTS.extraBold,
    color: '#154d2e',
  },
  fruitAlternateName: {
    fontSize: 13,
    color: '#64748b',
    fontFamily: FONTS.regular,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tabBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  tabBtnActive: {
    backgroundColor: '#fef3c7',
    borderColor: '#fde68a',
  },
  tabBtnInactive: {
    backgroundColor: '#ffffff',
    borderColor: '#d1fae5',
  },
  tabBtnPressed: {
    opacity: 0.8,
  },
  tabText: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
  },
  tabTextActive: {
    color: '#92400e',
    fontWeight: '800',
    fontFamily: FONTS.extraBold,
  },
  tabTextInactive: {
    color: '#334155',
    fontWeight: '600',
  },
  card: {
    gap: 8,
  },
  headerWithBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: FONTS.extraBold,
    color: '#154d2e',
    marginBottom: 4,
  },
  sectionSubheader: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: FONTS.semiBold,
    color: '#154d2e',
    marginBottom: 4,
  },
  thresholdGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  thresholdTile: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: '#f8faf9',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#e2ece6',
  },
  thresholdContent: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: '#1e293b',
  },
  thresholdLabel: {
    fontWeight: '700',
    fontFamily: FONTS.bold,
    color: '#154d2e',
  },
  thresholdValue: {
    color: '#1e293b',
  },
  requirementsList: {
    marginTop: 6,
    gap: 4,
  },
  reqItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  reqLabel: {
    fontSize: 12,
    color: '#334155',
  },
  reqValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#154d2e',
  },
  vulnerabilitiesCol: {
    flexDirection: 'column',
    gap: 6,
  },
  vulnerabilityBox: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  vulnerabilityText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: '#991b1b',
    lineHeight: 18,
  },
  vulnerabilityStrong: {
    fontWeight: '800',
    fontFamily: FONTS.bold,
    color: '#991b1b',
  },
  vulnerabilitySource: {
    fontSize: 11,
    color: '#b91c1c',
    marginTop: 4,
    fontFamily: FONTS.regular,
  },
  varietiesList: {
    flexDirection: 'column',
    gap: 6,
  },
  varietyItem: {
    paddingVertical: 6,
    minHeight: 48,
  },
  varietyItemSelected: {
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  varietyItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 48,
  },
  expandedVariety: {
    paddingTop: 4,
    paddingBottom: 6,
    borderTopWidth: 1,
    borderTopColor: '#dcfce7',
    gap: 4,
  },
  expandedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  expandedLabel: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: FONTS.regular,
  },
  expandedValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#154d2e',
    fontFamily: FONTS.bold,
  },
  varietyName: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: FONTS.bold,
    color: '#1e293b',
  },
  varietyNote: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: FONTS.regular,
  },
  varietyParent: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: FONTS.regular,
  },
  infoCaveat: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 16,
    marginBottom: 4,
  },
  sourcesList: {
    flexDirection: 'column',
    gap: 8,
  },
  sourceItem: {
    gap: 2,
  },
  sourceCitation: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: FONTS.bold,
    color: '#1e293b',
  },
  sourceDetail: {
    fontSize: 11,
    color: '#64748b',
  },
  sourceRetrieved: {
    fontSize: 10,
    color: '#94a3b8',
  },
  scanBtn: {
    minHeight: 48,
    width: '100%',
  },
});
