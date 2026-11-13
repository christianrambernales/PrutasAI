import React from 'react';
import { ClimateScreen } from '../../features/climate/ClimateScreen';
import { HistoryScreen } from '../../features/history/HistoryScreen';
import type { Shell } from '../shell';

export function ClimateBody({ shell }: { shell: Shell }) {
  const { app, dispatchApp, climate } = shell;
  return (
    <ClimateScreen
      climate={climate.snapshot}
      normals={climate.normals}
      suitability={climate.suitabilityFor(app.suitabilityFruit)}
      fruits={shell.data.fruits}
      selectedFruitKey={app.suitabilityFruit}
      selectedLocation={app.savedLocation?.label}
      status={climate.climate.status}
      currentStatus={climate.climate.currentStatus}
      error={climate.climate.error}
      hasLocation={app.savedLocation !== null}
      onSelectFruit={fruitKey => dispatchApp({ type: 'setSuitabilityFruit', fruitKey })}
      onChangeLocation={() => shell.nav.push({ name: 'locationPicker' })}
      onRetry={climate.climate.refresh}
      onBackHome={() => shell.nav.selectTab('home')}
    />
  );
}

export function HistoryBody({ shell }: { shell: Shell }) {
  const { t, app, dispatchApp, history } = shell;
  return (
    <HistoryScreen
      groups={history.visibleGroups}
      allCount={shell.data.allScans.length}
      filters={history.filters}
      activeFilterKey={app.historyFilter}
      query={app.historyQuery}
      totalLabel={t.scansShown(history.visibleCount, shell.data.allScans.length)}
      onChangeQuery={query => dispatchApp({ type: 'setHistoryQuery', query })}
      onFilter={key => dispatchApp({ type: 'setHistoryFilter', filter: key })}
      onOpenScan={scanId => shell.nav.push({ name: 'result', scanId })}
      onScan={() => shell.nav.push({ name: 'capture' })}
      onBack={shell.nav.back}
      onBackHome={() => shell.nav.selectTab('home')}
      offline={shell.account.account.syncMode === 'offline'}
    />
  );
}
