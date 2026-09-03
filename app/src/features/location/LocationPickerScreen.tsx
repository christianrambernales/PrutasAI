import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, TextInput, View } from 'react-native';
import {
  AppText, Button, Card, Col, COLORS, Icon, PressableRow, RADIUS, Row, Section, SPACING, Tile, useT,
} from '../../ui';
import type { SavedLocation } from '../../state/appState';
import { Place, searchPlaces } from '../../core/geo/geocoding';
import { PLACES } from './locations';
import { useDeviceLocation } from './useDeviceLocation';

export interface LocationPickerScreenProps {
  current: SavedLocation | null;
  onChoose: (place: Place) => void;
}

export function LocationPickerScreen({ current, onChoose }: LocationPickerScreenProps) {
  const t = useT();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const device = useDeviceLocation();

  // A fix arriving is the answer to the question this screen asks.
  useEffect(() => {
    if (device.status === 'ready' && device.place) onChoose(device.place);
  }, [device.status, device.place, onChoose]);

  // Debounced so typing does not fire a request per keystroke.
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults(null);
      setSearchError(null);
      return;
    }

    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(() => {
      searchPlaces(term)
        .then(found => {
          if (cancelled) return;
          setResults(found);
          setSearchError(null);
        })
        .catch(() => {
          if (!cancelled) setSearchError(t.noPlacesFound);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, t]);

  // The bundled list is what the screen offers before anything is typed, so a
  // refused permission and a dead network still leave a usable choice.
  const bundled: Place[] = PLACES.map(p => ({
    label: p.label, latitude: p.latitude, longitude: p.longitude,
    region: p.region, country: 'Philippines', elevationM: null,
  }));
  const shown = results ?? bundled;

  return (
    <>
      <Section>
        <Button
          label={device.status === 'locating' ? t.locating : t.useMyLocation2}
          icon="pin"
          onPress={device.locate}
        />
      </Section>

      {device.status === 'denied' || device.status === 'blocked' || device.status === 'error' ? (
        <Section>
          <Card style={{ gap: SPACING.sm }}>
            <AppText variant="xs" color={COLORS.textSecondary}>
              {device.status === 'blocked'
                ? t.locationBlocked
                : device.status === 'denied'
                  ? t.locationDenied
                  : t.locationFailed}
            </AppText>
            {device.status === 'blocked' ? (
              <Button
                label={t.openSettings}
                variant="secondary"
                onPress={() => { void Linking.openSettings(); }}
              />
            ) : null}
          </Card>
        </Section>
      ) : null}

      <Section>
        <View style={styles.search}>
          <Icon name="search" size={16} color={COLORS.textLight} />
          <TextInput
            style={styles.field}
            value={query}
            onChangeText={setQuery}
            placeholder={t.searchAnyTown}
            placeholderTextColor={COLORS.textLight}
            accessibilityLabel={t.searchAnyTown}
          />
          {searching ? <ActivityIndicator size="small" color={COLORS.textLight} /> : null}
        </View>
      </Section>

      <Section>
        <Tile>
          <Row gap={SPACING.sm} align="flex-start">
            <Icon name="shield" size={16} color={COLORS.textSecondary} />
            <AppText variant="xs" color={COLORS.textSecondary} style={{ flex: 1 }}>
              {t.coarseCoordinateNote}
            </AppText>
          </Row>
        </Tile>
      </Section>

      <Section gap={SPACING.sm}>
        {results === null ? (
          <AppText variant="xsSemi" color={COLORS.textSecondary}>{t.suggestedPlaces}</AppText>
        ) : null}

        {searchError || (results !== null && results.length === 0) ? (
          <AppText variant="sm" color={COLORS.textSecondary} center>{t.noPlacesFound}</AppText>
        ) : (
          shown.map(place => {
            const selected = current?.label === place.label;
            return (
              <PressableRow
                key={`${place.label}-${place.latitude}-${place.longitude}`}
                accessibilityLabel={place.label}
                selected={selected}
                onPress={() => onChoose(place)}
              >
                <Card>
                  <Row gap={SPACING.md - 4}>
                    <Icon name="pin" size={18} color={selected ? COLORS.primary : COLORS.textLight} />
                    <Col gap={2} style={{ flex: 1 }}>
                      <AppText variant="mdSemi">{place.label}</AppText>
                      <AppText variant="xs" color={COLORS.textSecondary}>
                        {[place.country, `${place.latitude.toFixed(2)}, ${place.longitude.toFixed(2)}`]
                          .filter(Boolean)
                          .join(' · ')}
                      </AppText>
                    </Col>
                    {selected ? <Icon name="check" size={18} color={COLORS.primary} /> : null}
                  </Row>
                </Card>
              </PressableRow>
            );
          })
        )}
      </Section>
    </>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md - 4,
    paddingVertical: 10,
  },
  field: { flex: 1, color: COLORS.text, fontSize: 14, padding: 0 },
});
