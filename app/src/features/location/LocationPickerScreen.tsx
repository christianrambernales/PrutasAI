import React, { useEffect, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BtnForestFull,
  BtnSubtle,
  COLORS,
  FONTS,
  FrostedCard,
  GreenTopCell,
  Icon,
  SPACING,
  StatusBadge,
  useLanguage,
  useT,
} from '../../ui';
import type { SavedLocation } from '../../state/appState';
import { Place, searchPlaces } from '../../core/geo/geocoding';
import { useDeviceLocation } from './useDeviceLocation';

export interface LocationPreset {
  id: string;
  label: string;
  region: string;
  latitude: number;
  longitude: number;
}

export const LOCATION_PRESETS: LocationPreset[] = [
  { id: 'davao', label: 'Davao City, Davao del Sur', region: 'Davao', latitude: 7.07, longitude: 125.61 },
  { id: 'tagum', label: 'Tagum City, Davao del Norte', region: 'Davao', latitude: 7.45, longitude: 125.81 },
  { id: 'gensan', label: 'General Santos City, South Cotabato', region: 'SOCCSKSARGEN', latitude: 6.11, longitude: 125.17 },
  { id: 'cdo', label: 'Cagayan de Oro, Misamis Oriental', region: 'Northern Mindanao', latitude: 8.48, longitude: 124.65 },
];

export interface LocationPickerScreenProps {
  current?: SavedLocation | null;
  currentLocation?: string | null;
  onChoose?: (place: Place) => void;
  onSelectLocation?: (label: string) => void;
  onUseDeviceGps?: () => void;
  onCancel?: () => void;
  onBack?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function LocationPickerScreen({
  current,
  currentLocation,
  onChoose,
  onSelectLocation,
  onUseDeviceGps,
  onCancel,
  onBack,
  style,
}: LocationPickerScreenProps) {
  const t = useT();
  const cancelHandler = onCancel ?? onBack;
  const language = useLanguage();
  const isFil = language === 'FIL';
  const insets = useSafeAreaInsets();

  const initialLocation = currentLocation ?? current?.label ?? 'Davao City, Davao del Sur';
  const [selectedLabel, setSelectedLabel] = useState<string>(initialLocation);
  const [query, setQuery] = useState<string>(
    initialLocation.split(',')[0] || 'Davao City'
  );
  const [searchResults, setSearchResults] = useState<Place[] | null>(null);

  const device = useDeviceLocation();

  useEffect(() => {
    if (device.status === 'ready' && device.place) {
      setSelectedLabel(device.place.label);
      setQuery(device.place.label.split(',')[0]);
      onChoose?.(device.place);
      onSelectLocation?.(device.place.label);
    }
  }, [device.status, device.place, onChoose, onSelectLocation]);

  const isFirstMount = React.useRef(true);
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    const term = query.trim();
    if (term.length < 2) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(() => {
      searchPlaces(term)
        .then(found => setSearchResults(found))
        .catch(() => setSearchResults([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectPreset = (preset: LocationPreset) => {
    setSelectedLabel(preset.label);
    setSearchResults(null);
    onSelectLocation?.(preset.label);
    onChoose?.({
      label: preset.label,
      latitude: preset.latitude,
      longitude: preset.longitude,
      region: preset.region,
      country: 'Philippines',
      elevationM: null,
    });
  };

  const handleSelectPlace = (place: Place) => {
    setSelectedLabel(place.label);
    setSearchResults(null);
    onSelectLocation?.(place.label);
    onChoose?.(place);
  };

  const handleUseGps = () => {
    onUseDeviceGps?.();
    device.locate();
  };

  // Build presets list, adding custom current location if not present
  const displayedPresets = [...LOCATION_PRESETS];
  if (current && !displayedPresets.some(p => p.label === current.label)) {
    displayedPresets.unshift({
      id: 'current-custom',
      label: current.label,
      region: '',
      latitude: current.latitude,
      longitude: current.longitude,
    });
  }

  const isLocating = device.status === 'locating';
  const gpsButtonLabel = isLocating
    ? t.locating
    : `🛰️ ${isFil ? 'Gamitin ang GPS ng Telepono' : 'Use Device GPS'}`;

  return (
    <ScrollView
      style={[styles.container, style]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + SPACING.sm, paddingBottom: insets.bottom + SPACING.xl },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      {/* 1. GreenTopCell */}
      <GreenTopCell
        title={isFil ? 'Pumili ng Lugar' : 'Select Location'}
        subtitle={
          isFil
            ? 'Tinatayang lokasyon para sa datos ng klima'
            : 'Coarse location for climate suitability'
        }
        rightAction={
          cancelHandler ? (
            <BtnSubtle
              label={`✕ ${isFil ? 'Kanselahin' : 'Cancel'}`}
              textColor="#ffffff"
              onPress={cancelHandler}
              style={styles.cancelBtn}
            />
          ) : undefined
        }
      />

      {/* 2. FrostedCard with Form Input & Presets */}
      <FrostedCard style={styles.card}>
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>
            {isFil ? 'Lungsod o Munisipalidad' : 'City or Municipality'}
          </Text>
          <View style={styles.inputWrapper}>
            <Icon name="search" size={16} color={COLORS.textLight} />
            <TextInput
              style={styles.formInput}
              value={query}
              onChangeText={setQuery}
              placeholder={t.searchAnyTown ?? (isFil ? 'Lungsod o Munisipalidad' : 'City or Municipality')}
              placeholderTextColor="#94a3b8"
              accessibilityLabel={t.searchAnyTown ?? (isFil ? 'Lungsod o Munisipalidad' : 'City or Municipality')}
            />
          </View>
        </View>

        {/* Presets or Search Results */}
        {searchResults && searchResults.length > 0 ? (
          <View style={styles.presetList} accessibilityRole="list">
            {searchResults.map(place => {
              const isSelected = selectedLabel === place.label;
              return (
                <Pressable
                  key={`${place.label}-${place.latitude}`}
                  accessibilityRole="button"
                  accessibilityLabel={place.label}
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => handleSelectPlace(place)}
                  style={({ pressed }) => [
                    styles.presetRow,
                    isSelected ? styles.presetRowActive : styles.presetRowInactive,
                    pressed && styles.presetRowPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.presetText,
                      isSelected ? styles.presetTextActive : styles.presetTextInactive,
                    ]}
                  >
                    {isSelected ? `✓ ${place.label}` : place.label}
                  </Text>
                  {isSelected ? (
                    <StatusBadge variant="healthy" label={isFil ? 'Kasalukuyan' : 'Current'} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={styles.presetList} accessibilityRole="list">
            {displayedPresets.map(preset => {
              const isSelected =
                selectedLabel === preset.label ||
                (preset.id === 'davao' && (selectedLabel === 'Davao City' || selectedLabel === 'Davao'));
              return (
                <Pressable
                  key={preset.id}
                  accessibilityRole="button"
                  accessibilityLabel={preset.label}
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => handleSelectPreset(preset)}
                  style={({ pressed }) => [
                    styles.presetRow,
                    isSelected ? styles.presetRowActive : styles.presetRowInactive,
                    pressed && styles.presetRowPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.presetText,
                      isSelected ? styles.presetTextActive : styles.presetTextInactive,
                    ]}
                  >
                    {isSelected ? `✓ ${preset.label}` : preset.label}
                  </Text>
                  {isSelected ? (
                    <StatusBadge variant="healthy" label={isFil ? 'Kasalukuyan' : 'Current'} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        )}
      </FrostedCard>

      {/* Device location state feedback (denied/error/blocked) */}
      {device.status === 'denied' || device.status === 'blocked' || device.status === 'error' ? (
        <FrostedCard style={styles.card}>
          <Text style={styles.infoCaveat} accessibilityLiveRegion="polite">
            {device.status === 'blocked'
              ? t.locationBlocked
              : device.status === 'denied'
                ? t.locationDenied
                : t.locationFailed}
          </Text>
        </FrostedCard>
      ) : null}

      {/* Privacy Guarantee Note */}
      <FrostedCard style={styles.card}>
        <View style={styles.noteRow}>
          <Icon name="shield" size={16} color={COLORS.textSecondary} />
          <Text style={styles.infoCaveat}>{t.coarseCoordinateNote}</Text>
        </View>
      </FrostedCard>

      {/* 3. Action CTA: Use Device GPS */}
      <BtnForestFull
        label={gpsButtonLabel}
        accessibilityLabel={device.status === 'locating' ? t.locating : (t.useMyLocation2 ?? 'Use my location')}
        disabled={isLocating}
        onPress={handleUseGps}
        style={styles.gpsBtn}
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
  cancelBtn: {
    minHeight: 48,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    gap: 10,
  },
  formGroup: {
    gap: 6,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: FONTS.bold,
    color: '#154d2e',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#d1fae5',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  formInput: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b',
    padding: 0,
  },
  presetList: {
    flexDirection: 'column',
    gap: 6,
    marginTop: 4,
  },
  presetRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  presetRowActive: {
    backgroundColor: '#eaf4ed',
    justifyContent: 'space-between',
  },
  presetRowInactive: {
    backgroundColor: 'transparent',
    justifyContent: 'flex-start',
  },
  presetRowPressed: {
    opacity: 0.8,
    backgroundColor: '#dcfce7',
  },
  presetText: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
  },
  presetTextActive: {
    color: '#154d2e',
    fontWeight: '800',
    fontFamily: FONTS.extraBold,
  },
  presetTextInactive: {
    color: '#1e293b',
    fontWeight: '600',
  },
  infoCaveat: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 18,
    fontFamily: FONTS.regular,
    flex: 1,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gpsBtn: {
    minHeight: 48,
    width: '100%',
  },
});
