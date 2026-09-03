import { useMemo } from 'react';
import { useChat } from './useChat';
import { createProxyProvider } from '../../core/chat/providers/proxy';
import { templateProvider } from '../../core/chat/providers/template';
import { apiBaseUrl } from '../../core/chat/apiBaseUrl';
import { deviceId } from '../../core/chat/deviceId';
import type { ChatContext } from '../../core/chat/answer';
import type { describeDetectionCapability } from '../../core/status';
import type { pipelineDepth } from '../../core/ml/registry';
import type { SqlDriver } from '../../core/db/driver';
import type { AppState } from '../../state/appState';
import type { ClimateViews } from '../climate/useClimateViews';
import type { FruitSummary, Source, VarietySummary } from '../viewModels';

export interface ChatRuntimeInput {
  db: SqlDriver;
  notify: (message: string) => void;
  app: AppState;
  fruits: FruitSummary[];
  varietiesByFruit: Record<string, VarietySummary[]>;
  strainsByFruit: Record<string, VarietySummary[]>;
  sourcesByFruit: Record<string, Source[]>;
  climate: ClimateViews;
  capability: ReturnType<typeof describeDetectionCapability>;
  depth: ReturnType<typeof pipelineDepth>;
  /** Invalidates every dataVersion-keyed read after a write. */
  bumpData: () => void;
}

export interface ChatRuntime {
  chat: ReturnType<typeof useChat>;
  /** Whether the proxy provider has a base URL to talk to. */
  aiAvailable: boolean;
}

export function useChatRuntime(input: ChatRuntimeInput): ChatRuntime {
  const {
    db, notify, app, fruits, varietiesByFruit, strainsByFruit, sourcesByFruit,
    climate, capability, depth, bumpData,
  } = input;

  // Only a public URL ships. The model credential lives as a Vercel Function's
  // environment variable, so there is nothing in the bundle worth extracting.
  //
  // onDiagnostic surfaces outages and rejected requests as a notice. Without it
  // a failure on every request is indistinguishable from "the rewording
  // happened to change nothing", which is exactly how a broken model once hid.
  const proxyProvider = useMemo(
    () =>
      createProxyProvider({
        baseUrl: apiBaseUrl(),
        deviceId: deviceId(db),
        onDiagnostic: notify,
      }),
    [db, notify],
  );
  const provider = app.aiAssistant ? proxyProvider : templateProvider;

  const chatContext: ChatContext = useMemo(
    () => ({
      language: app.language,
      fruits,
      varietiesByFruit,
      strainsByFruit,
      sourcesByFruit,
      climate: climate.snapshot,
      climateReady: climate.normals !== null,
      suitabilityFor: climate.suitabilityFor,
      location: app.savedLocation,
      detection: { headline: capability.headline, detail: capability.detail, depth },
    }),
    [
      app.language,
      app.savedLocation,
      capability,
      depth,
      climate.suitabilityFor,
      climate.snapshot,
      climate.normals,
      fruits,
      varietiesByFruit,
      strainsByFruit,
      sourcesByFruit,
    ],
  );

  const chat = useChat(chatContext, provider, db, deviceId(db), bumpData);

  return { chat, aiAvailable: proxyProvider.isAvailable() };
}
