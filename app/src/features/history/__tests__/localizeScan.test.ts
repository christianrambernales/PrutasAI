import { strings } from '../../../ui/i18n/strings';
import type { ScanSummary } from '../../viewModels';
import { localizeScanGroups, localizeStoredScan } from '../localizeScan';

const saved: ScanSummary = {
  id: 'saved-1',
  imageUri: 'file:///local.jpg',
  createdAtIso: '2020-01-02T09:15:00.000Z',
  fruitNameEn: 'Mango',
  fruitNameFil: 'Mangga',
  varietyNameEn: 'Carabao',
  varietyNameFil: 'Kalabaw',
  emoji: '🥭',
  title: 'Mango · Carabao',
  status: 'undetermined',
  detail: 'No disease model',
  timeLabel: 'Jan 2',
  fruitKey: 'mango',
};

test('History and reopened scan use Filipino names and model-free copy without changing saved facts', () => {
  const scan = localizeStoredScan(saved, 'FIL', strings('FIL'));
  expect(scan).toMatchObject({
    id: 'saved-1',
    imageUri: 'file:///local.jpg',
    title: 'Mangga · Kalabaw',
    detail: strings('FIL').scanNoDiseaseModel,
    status: 'undetermined',
  });
  expect(saved.title).toBe('Mango · Carabao');
});

test('unknown fruit and History group labels translate without inventing a diagnosis', () => {
  const unknown = { ...saved, fruitNameEn: null, fruitNameFil: null, varietyNameEn: null, varietyNameFil: null };
  const [group] = localizeScanGroups([{ label: 'TODAY', scans: [unknown] }], 'FIL', strings('FIL'));
  expect(group.label).toBe(strings('FIL').historyGroupToday);
  expect(group.scans[0]).toMatchObject({
    title: strings('FIL').scanUnidentified,
    detail: strings('FIL').scanNotIdentifiedNoModel,
    status: 'undetermined',
  });
});
