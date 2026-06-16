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
    case 'bearer':
      if (cfg.bearerToken) {
        headers['Authorization'] = `Bearer ${cfg.bearerToken}`;
      }
      break;

    case 'basic':
      if (cfg.basicUsername || cfg.basicPassword) {
        // btoa is available in the Capacitor WebView. For non-ASCII passwords
        // this may need unescape(encodeURIComponent(...)) wrapping in future.
        headers['Authorization'] =
          `Basic ${btoa(`${cfg.basicUsername}:${cfg.basicPassword}`)}`;
      }
      break;

    case 'header':
      if (cfg.customHeaderName && cfg.customHeaderValue) {
        headers[cfg.customHeaderName] = cfg.customHeaderValue;
      }
      break;

    case 'none':
    default:
      break;
  }

  return headers;
}
