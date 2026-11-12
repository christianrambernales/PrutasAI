import React from 'react';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';
import { LanguageProvider, strings, type Language } from '../../ui';
import { findPressable, pressableRoles, textOf } from '../../testing/interaction';
import { useDeviceLocation } from '../location/useDeviceLocation';
import { LocationPickerScreen } from '../location/LocationPickerScreen';
import { PLACES } from '../location/locations';
import { SettingsScreen } from '../settings/SettingsScreen';
import { VarietyInfoScreen } from '../varietyInfo/VarietyInfoScreen';
import * as preview from '../../preview/previewContent';

jest.mock('../location/useDeviceLocation', () => ({
  useDeviceLocation: jest.fn(),
}));

const mockUseDeviceLocation = jest.mocked(useDeviceLocation);

function render(element: React.ReactElement): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => { tree = renderer.create(element); });
  return tree;
}

function settingsProps(language: Language) {
  return {
    language,
    useLocation: true,
    savedLocationLabel: 'Los Baños, Laguna',
    climateProvider: 'Open-Meteo',
    normalsFetchedLabel: 'Updated yesterday',
    aiAssistant: false,
    aiAssistantDetail: 'Unavailable offline',
    contentVersion: '2.0.0',
    modelsLabel: 'No model files installed',
    historyLabel: 'No scans',
    accountLabel: 'Offline mode',
    onChangeLanguage: jest.fn(),
    onToggleLocation: jest.fn(),
    onChangeLocation: jest.fn(),
    onForgetLocation: jest.fn(),
    onRefreshNormals: jest.fn(),
    onToggleAiAssistant: jest.fn(),
    onOpenModels: jest.fn(),
    onOpenHistory: jest.fn(),
    onOpenAccount: jest.fn(),
    onOpenTrash: jest.fn(),
  };
}

describe.each<Language>(['EN', 'FIL'])('supporting route accessibility (%s)', language => {
  const t = strings(language);

  test('A12 Settings names each action and exposes language and switch state', () => {
    const props = settingsProps(language);
    const tree = render(
      <LanguageProvider language={language}>
        <SettingsScreen {...props} />
      </LanguageProvider>,
    );

    const buttons = pressableRoles(tree).filter(node => node.props.accessibilityRole === 'button');
    expect(buttons.length).toBeGreaterThan(0);
    expect(buttons.every(node => Boolean(node.props.accessibilityLabel?.trim()))).toBe(true);

    const english = findPressable(tree, t.languageEnglish);
    const filipino = findPressable(tree, t.languageFilipino);
    expect(english.props.accessibilityState).toMatchObject({ selected: language === 'EN' });
    expect(filipino.props.accessibilityState).toMatchObject({ selected: language === 'FIL' });

    const locationSwitch = pressableRoles(tree).find(node => node.props.accessibilityRole === 'switch');
    expect(locationSwitch?.props.accessibilityLabel).toBe(t.useMyLocation);
    expect(locationSwitch?.props.accessibilityState).toEqual({ checked: true });

    const trash = findPressable(tree, t.trashRow);
    act(() => { trash.props.onPress(); });
    expect(props.onOpenTrash).toHaveBeenCalledTimes(1);
  });

  test('A14 Location labels the search, selected suggestion, and pending location action', () => {
    mockUseDeviceLocation.mockReturnValue({
      status: 'locating',
      place: null,
      error: null,
      locate: jest.fn(),
    });
    const selectedPlace = PLACES[0];
    const tree = render(
      <LanguageProvider language={language}>
        <LocationPickerScreen
          current={{ label: selectedPlace.label, latitude: selectedPlace.latitude, longitude: selectedPlace.longitude }}
          onChoose={jest.fn()}
        />
      </LanguageProvider>,
    );

    expect(tree.root.find(node => node.props.accessibilityLabel === t.searchAnyTown).props.placeholder).toBe(t.searchAnyTown);
    expect(findPressable(tree, selectedPlace.label).props.accessibilityState).toMatchObject({ selected: true });
    expect(findPressable(tree, t.locating).props.accessibilityState).toMatchObject({ disabled: true });
  });

  test('R10 Variety info exposes heading, list, and missing-content semantics', () => {
    const missingTree = render(
      <LanguageProvider language={language}>
        <VarietyInfoScreen
          fruit={null}
          modelVarieties={[]}
          informationOnly={[]}
          diseases={[]}
          requirements={[]}
          requirementsVerified={false}
          sources={[]}
          expandedVarietyKey={null}
          onOpenVariety={jest.fn()}
          onBack={jest.fn()}
        />
      </LanguageProvider>,
    );

    const missingHeading = missingTree.root.find(node => node.props.accessibilityRole === 'header');
    expect(textOf(missingHeading)).toContain('Missing local content');
    expect(missingHeading.props.accessibilityLiveRegion).toBe('polite');
    expect(findPressable(missingTree, t.goBack)).toBeDefined();

    const fruit = preview.FRUITS[0];
    const variety = preview.VARIETIES_BY_FRUIT.banana[0];
    const knownTree = render(
      <LanguageProvider language={language}>
        <VarietyInfoScreen
          fruit={fruit}
          modelVarieties={[variety]}
          informationOnly={[]}
          diseases={[]}
          requirements={[]}
          requirementsVerified={false}
          sources={[{ citation: 'Local source', detail: 'Reviewer reference', retrievedLabel: 'retrieved today' }]}
          expandedVarietyKey={variety.key}
          onOpenVariety={jest.fn()}
        />
      </LanguageProvider>,
    );

    const headings = knownTree.root.findAll(node => node.props.accessibilityRole === 'header').map(textOf);
    expect(headings).toContain(language === 'FIL' ? fruit.nameFil : fruit.nameEn);
    expect(headings).toContain(t.diseases);
    expect(headings).toContain(t.sources);
    expect(knownTree.root.findAll(node => node.props.accessibilityRole === 'list').length).toBeGreaterThanOrEqual(2);
    const varietyName = language === 'FIL' ? variety.nameFil : variety.nameEn;
    expect(findPressable(knownTree, varietyName).props.accessibilityState).toMatchObject({ selected: true });
  });
});
