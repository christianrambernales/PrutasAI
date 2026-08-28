/**
 * Two checks per request: one keyed on the device id, one on the IP.
 *
 * The device id is unverified and forgeable, so it is not a security boundary —
 * it exists to stop one honest install from monopolising the shared Gemini
 * quota. The IP check is what actually bounds abuse.
 */

export interface RateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface LimitResult {
  allowed: boolean;
  retryAfter: number;
}

export const RETRY_AFTER_SECONDS = 60;

export async function checkLimits(
  binding: RateLimitBinding,
  scope: 'scan' | 'chat',
  deviceId: string | null,
  ip: string,
): Promise<LimitResult> {
  // Without a device id the IP becomes the identity, so omitting the header
  // is not a way to skip the per-device ceiling.
  const deviceKey = deviceId ? `${scope}:${deviceId}` : `${scope}:anon:${ip}`;

  for (const key of [deviceKey, `${scope}:ip:${ip}`]) {
    const { success } = await binding.limit({ key });
    if (!success) return { allowed: false, retryAfter: RETRY_AFTER_SECONDS };
  }

  return { allowed: true, retryAfter: 0 };
}
