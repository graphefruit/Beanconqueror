import { WEBHOOK_AUTH_TYPE_ENUM } from '../../enums/settings/webhookAuthType';
import { BrewByWeightWebhookConfig } from '../../interfaces/settings/iSettings';

/**
 * Builds the HTTP headers required for a brew-by-weight webhook request
 * based on the configured auth type.
 *
 * Kept as a standalone pure function so the identical logic in
 * settings.page.ts (test button) and brew-brewing-graph.component.ts
 * (live trigger) share a single implementation.
 */
export function buildWebhookHeaders(
  cfg: BrewByWeightWebhookConfig,
): Record<string, string> {
  const headers: Record<string, string> = {};

  switch (cfg.authType) {
    case WEBHOOK_AUTH_TYPE_ENUM.BEARER:
      if (cfg.bearerToken) {
        headers['Authorization'] = `Bearer ${cfg.bearerToken}`;
      }
      break;

    case WEBHOOK_AUTH_TYPE_ENUM.BASIC:
      if (cfg.basicUsername || cfg.basicPassword) {
        // btoa is available in the Capacitor WebView. For non-ASCII passwords
        // this may need unescape(encodeURIComponent(...)) wrapping in future.
        headers['Authorization'] =
          `Basic ${btoa(`${cfg.basicUsername}:${cfg.basicPassword}`)}`;
      }
      break;

    case WEBHOOK_AUTH_TYPE_ENUM.HEADER:
      if (cfg.customHeaderName && cfg.customHeaderValue) {
        headers[cfg.customHeaderName] = cfg.customHeaderValue;
      }
      break;

    case WEBHOOK_AUTH_TYPE_ENUM.NONE:
    default:
      break;
  }

  return headers;
}
