import type { Dispatch, SetStateAction } from 'react';
import type { AppAction, AppState } from '../state/appState';
import type { describeDetectionCapability } from '../core/status';
import type { pipelineDepth, resolveModels } from '../core/ml/registry';
import type { SqlDriver } from '../core/db/driver';
import type { ConversationSummary } from '../core/db/repositories/conversations';
import type { useChat } from '../features/chat/useChat';
import type { AccountSync } from '../features/account/useAccountSync';
import type { ClimateViews } from '../features/climate/useClimateViews';
import type { ConversationsUi } from '../features/chat/useConversationsUi';
import type { HistoryFilters } from '../features/history/useHistoryFilters';
import type {
  FruitSummary, ScanGroup, ScanSummary, Source, VarietySummary,
} from '../features/viewModels';
import type { strings } from '../ui/i18n/strings';
import type { Route, TabKey } from './navState';

type Strings = ReturnType<typeof strings>;

/**
 * Everything the render functions used to capture from AppNavigator's scope,
 * grouped so the dependency is visible in a signature.
 *
 * If a renderer needs something that belongs to none of these groups, the
 * grouping is wrong — revisit the boundary. Adding a tenth top-level field
 * turns Shell back into the forty-field bag it exists to replace, at which
 * point this split is worse than leaving the closures alone.
 */
export interface Shell {
  t: Strings;
  /**
   * Moving between screens. `openVariety`/`openCheckpoint` belong here because
   * the design has no detail screens: those drill-downs expand in place, so the
   * expanded row *is* this app's navigation into a record.
   */
  nav: {
    push: (route: Route) => void;
    replace: (route: Route) => void;
    back: () => void;
    notify: (message: string) => void;
    selectTab: (tab: TabKey) => void;
    openVariety: string | null;
    setOpenVariety: Dispatch<SetStateAction<string | null>>;
    openCheckpoint: number | null;
    setOpenCheckpoint: Dispatch<SetStateAction<number | null>>;
  };
  /** What is stored or installed on this device, plus the invalidator for it. */
  data: {
    db: SqlDriver;
    fruits: FruitSummary[];
    varietiesByFruit: Record<string, VarietySummary[]>;
    strainsByFruit: Record<string, VarietySummary[]>;
    sourcesByFruit: Record<string, Source[]>;
    scanGroups: ScanGroup[];
    allScans: ScanSummary[];
    trashedConversations: ConversationSummary[];
    statuses: ReturnType<typeof resolveModels>;
    capability: ReturnType<typeof describeDetectionCapability>;
    depth: ReturnType<typeof pipelineDepth>;
    readyCount: number;
    /** Whether the proxy provider has a base URL to talk to. */
    aiAvailable: boolean;
    /** Invalidates every dataVersion-keyed read after a write. */
    bumpData: () => void;
  };
  app: AppState;
  dispatchApp: (action: AppAction) => void;
  climate: ClimateViews;
  history: HistoryFilters;
  account: AccountSync;
  chat: ReturnType<typeof useChat>;
  conversations: ConversationsUi;
}
