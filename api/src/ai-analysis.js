const { getStorageValue, setStorageValue } = require('./storage-repository');

const STORAGE_KEYS = {
  BREWS: 'BREW',
  SETTINGS: 'SETTINGS',
  CONFIG: 'AI_ANALYSIS_CONFIG',
  STATUS: 'AI_ANALYSIS_STATUS',
  SNAPSHOTS: 'AI_ANALYSIS_SNAPSHOTS',
};

const DEFAULT_CONFIG = {
  enabled: false,
  cadenceHours: 24,
  retentionCount: 30,
};

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, parsed));
}

function parseSeconds(value) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  const text = String(value).trim();
  if (!text) {
    return null;
  }
  if (/^\d+(\.\d+)?$/.test(text)) {
    return Number(text);
  }
  const parts = text.split(':').map((part) => Number(part));
  if (parts.some((part) => !Number.isFinite(part))) {
    return null;
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return null;
}

function valueOrNull(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function getSettingsObject(settingsValue) {
  if (Array.isArray(settingsValue) && settingsValue.length > 0) {
    return settingsValue[0] || {};
  }
  if (settingsValue && typeof settingsValue === 'object') {
    return settingsValue;
  }
  return {};
}

async function getConfig() {
  const stored = await getStorageValue(STORAGE_KEYS.CONFIG);
  const config = {
    enabled: Boolean(stored?.enabled),
    cadenceHours: clampNumber(stored?.cadenceHours, 1, 168, DEFAULT_CONFIG.cadenceHours),
    retentionCount: clampNumber(stored?.retentionCount, 1, 365, DEFAULT_CONFIG.retentionCount),
    visibility: stored?.visibility === 'hidden' ? 'hidden' : 'visible',
    lastRunAt: typeof stored?.lastRunAt === 'string' ? stored.lastRunAt : null,
  };
  return config;
}

async function setConfig(input) {
  const previous = await getConfig();
  const next = {
    ...previous,
    enabled: Boolean(input?.enabled),
    cadenceHours: clampNumber(input?.cadenceHours, 1, 168, previous.cadenceHours),
    retentionCount: clampNumber(input?.retentionCount, 1, 365, previous.retentionCount),
    visibility: input?.visibility === 'hidden' ? 'hidden' : 'visible',
  };
  await setStorageValue(STORAGE_KEYS.CONFIG, next);
  return next;
}

async function getStatus() {
  const [status, config, settingsValue] = await Promise.all([
    getStorageValue(STORAGE_KEYS.STATUS),
    getConfig(),
    getStorageValue(STORAGE_KEYS.SETTINGS),
  ]);
  const settings = getSettingsObject(settingsValue);
  const providerConfig = resolveProviderConfig(settings);
  return {
    enabled: config.enabled,
    cadenceHours: config.cadenceHours,
    visibility: config.visibility,
    running: Boolean(status?.running),
    health: status?.health || 'idle',
    lastRunAt: status?.lastRunAt || config.lastRunAt || null,
    lastError: status?.lastError || '',
    lastDurationMs: status?.lastDurationMs || 0,
    lastSnapshotId: status?.lastSnapshotId || '',
    providerReady: providerConfig.ready === true,
  };
}

async function updateStatus(patch) {
  const current = (await getStorageValue(STORAGE_KEYS.STATUS)) || {};
  const next = { ...current, ...patch };
  await setStorageValue(STORAGE_KEYS.STATUS, next);
  return next;
}

async function getSnapshots() {
  const value = await getStorageValue(STORAGE_KEYS.SNAPSHOTS);
  return Array.isArray(value) ? value : [];
}

async function saveSnapshot(snapshot) {
  const config = await getConfig();
  const snapshots = await getSnapshots();
  const next = [snapshot, ...snapshots].slice(0, config.retentionCount);
  await setStorageValue(STORAGE_KEYS.SNAPSHOTS, next);
  await setStorageValue(STORAGE_KEYS.CONFIG, {
    ...config,
    lastRunAt: snapshot.createdAt,
  });
}

function buildBaseline(features) {
  const recommendations = [];
  const evidence = [];
  const ratios = features.map((entry) => entry.ratio).filter((value) => value !== null);
  const brewTimes = features
    .map((entry) => entry.brewTimeSeconds)
    .filter((value) => value !== null);
  const firstDrips = features
    .map((entry) => entry.firstDripSeconds)
    .filter((value) => value !== null);
  const ratings = features
    .map((entry) => entry.rating)
    .filter((value) => value !== null);

  const avg = (values) =>
    values.length === 0
      ? null
      : values.reduce((sum, value) => sum + value, 0) / values.length;

  const avgRatio = avg(ratios);
  const avgBrewTime = avg(brewTimes);
  const avgFirstDrip = avg(firstDrips);
  const avgRating = avg(ratings);

  if (avgRatio !== null && (avgRatio < 1.8 || avgRatio > 2.4)) {
    recommendations.push({
      priority: avgRatio < 1.8 ? 'high' : 'medium',
      action: avgRatio < 1.8 ? 'Increase beverage yield for espresso' : 'Reduce beverage yield for espresso',
      rationale: `Average brew ratio ${avgRatio.toFixed(2)} outside target 1.8-2.4.`,
      evidenceMetrics: { avgRatio },
      confidence: 0.88,
    });
  }

  if (avgBrewTime !== null && (avgBrewTime < 22 || avgBrewTime > 36)) {
    recommendations.push({
      priority: avgBrewTime < 22 ? 'high' : 'medium',
      action: avgBrewTime < 22 ? 'Grind finer or reduce flow' : 'Grind coarser or increase flow',
      rationale: `Average brew time ${avgBrewTime.toFixed(1)}s outside target 22-36s.`,
      evidenceMetrics: { avgBrewTimeSeconds: avgBrewTime },
      confidence: 0.86,
    });
  }

  if (avgFirstDrip !== null && (avgFirstDrip < 4 || avgFirstDrip > 12)) {
    recommendations.push({
      priority: 'medium',
      action: 'Tune preinfusion and puck prep for first-drip timing',
      rationale: `Average first drip ${avgFirstDrip.toFixed(1)}s outside target 4-12s.`,
      evidenceMetrics: { avgFirstDripSeconds: avgFirstDrip },
      confidence: 0.79,
    });
  }

  const ratingSplit = features
    .filter((entry) => entry.rating !== null && entry.ratio !== null)
    .sort((a, b) => (b.rating || 0) - (a.rating || 0));
  if (ratingSplit.length >= 6) {
    const half = Math.floor(ratingSplit.length / 2);
    const high = ratingSplit.slice(0, half);
    const low = ratingSplit.slice(half);
    const highRatio = avg(high.map((entry) => entry.ratio));
    const lowRatio = avg(low.map((entry) => entry.ratio));
    if (highRatio !== null && lowRatio !== null) {
      evidence.push({
        metric: 'rating_ratio_correlation',
        message: `Higher-rated shots average ${highRatio.toFixed(2)} ratio vs ${lowRatio.toFixed(2)} in lower-rated shots.`,
      });
    }
  }

  return {
    summary: {
      brewCount: features.length,
      avgRatio,
      avgBrewTimeSeconds: avgBrewTime,
      avgFirstDripSeconds: avgFirstDrip,
      avgRating,
    },
    trends: {
      improving: avgRating !== null && avgRating >= 4,
      ratingAverage: avgRating,
    },
    recommendations,
    evidence,
  };
}

function buildFeaturePayload(brews) {
  return brews.map((brew) => {
    const dose = valueOrNull(brew.grind_weight ?? brew.brew_grams);
    const beverage = valueOrNull(
      brew.brew_beverage_quantity ?? brew.brew_quantity ?? brew.coffee_brew_quantity,
    );
    const ratio = dose && beverage ? beverage / dose : null;
    return {
      id: brew?.config?.uuid || '',
      timestamp: brew?.config?.unix_timestamp || null,
      method: brew?.method_of_preparation || '',
      bean: brew?.bean || '',
      grinder: brew?.mill || '',
      dose,
      beverage,
      ratio,
      brewTimeSeconds: parseSeconds(brew?.brew_time),
      firstDripSeconds: parseSeconds(brew?.first_drip_time ?? brew?.first_drip),
      rating: valueOrNull(brew?.rating),
      note: brew?.note || '',
      cuppingPoints: valueOrNull(brew?.cupping_points),
    };
  });
}

function aiSystemPrompt() {
  return 'You are espresso quality analyst. Return strict JSON only with keys: summary, trendHighlights, recommendations. recommendations must be array of max 5 entries with priority, action, rationale, evidenceMetrics, confidence.';
}

function resolveProviderConfig(settings) {
  const provider = String(settings?.ai_provider || 'NO_PROVIDER').toUpperCase();
  const apiKey = settings?.cloud_ai_api_key || '';
  const model = settings?.cloud_ai_model || '';
  const baseUrl = settings?.cloud_ai_base_url || '';

  if (!apiKey || !model || provider === 'NO_PROVIDER' || provider === 'APPLE_INTELLIGENCE') {
    return { ready: false, reason: 'missing_ai_provider_config' };
  }

  if (provider === 'OPENAI') {
    return { ready: true, provider, endpoint: 'https://api.openai.com/v1/chat/completions', apiKey, model };
  }
  if (provider === 'OPENROUTER') {
    return { ready: true, provider, endpoint: 'https://openrouter.ai/api/v1/chat/completions', apiKey, model };
  }
  if (provider === 'MISTRAL') {
    return { ready: true, provider, endpoint: 'https://api.mistral.ai/v1/chat/completions', apiKey, model };
  }
  if (provider === 'CUSTOM' && baseUrl) {
    return {
      ready: true,
      provider,
      endpoint: `${baseUrl.replace(/\/$/, '')}/chat/completions`,
      apiKey,
      model,
    };
  }
  return { ready: false, reason: `provider_not_supported:${provider}` };
}

async function callAi(settings, payload) {
  const providerConfig = resolveProviderConfig(settings);
  if (!providerConfig.ready) {
    return { skipped: true, reason: providerConfig.reason };
  }

  const response = await fetch(providerConfig.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${providerConfig.apiKey}`,
    },
    body: JSON.stringify({
      model: providerConfig.model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: aiSystemPrompt() },
        {
          role: 'user',
          content: JSON.stringify(payload),
        },
      ],
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.error?.message || body?.message || 'ai_request_failed');
  }

  const content = body?.choices?.[0]?.message?.content || '{}';
  return { skipped: false, output: JSON.parse(content) };
}

function mergeRecommendations(baseline, aiOutput) {
  const combined = [];
  for (const entry of baseline.recommendations || []) {
    combined.push(entry);
  }
  for (const entry of aiOutput?.recommendations || []) {
    combined.push({
      priority: entry.priority || 'low',
      action: entry.action || 'Review shot data',
      rationale: entry.rationale || '',
      evidenceMetrics: entry.evidenceMetrics || {},
      confidence: clampNumber(entry.confidence, 0, 1, 0.5),
    });
  }
  const rank = { high: 0, medium: 1, low: 2 };
  combined.sort((a, b) => (rank[a.priority] ?? 3) - (rank[b.priority] ?? 3));
  return combined.slice(0, 8);
}

async function runAnalysis() {
  const startedAt = Date.now();
  await updateStatus({
    running: true,
    health: 'running',
    lastError: '',
  });

  try {
    const [brewsValue, settingsValue] = await Promise.all([
      getStorageValue(STORAGE_KEYS.BREWS),
      getStorageValue(STORAGE_KEYS.SETTINGS),
    ]);
    const brews = Array.isArray(brewsValue) ? brewsValue : [];
    const settings = getSettingsObject(settingsValue);
    const features = buildFeaturePayload(brews);
    const baseline = buildBaseline(features);
    const aiPayload = {
      baseline,
      latestShots: features.slice(-30),
      shotCount: features.length,
    };
    const aiResult = await callAi(settings, aiPayload);
    const snapshot = {
      id: `ai-${Date.now()}`,
      createdAt: new Date().toISOString(),
      summary: aiResult.skipped ? baseline.summary : aiResult.output?.summary || baseline.summary,
      trendHighlights: aiResult.skipped
        ? []
        : aiResult.output?.trendHighlights || [],
      recommendations: mergeRecommendations(baseline, aiResult.skipped ? null : aiResult.output),
      evidence: baseline.evidence,
      baseline,
      ai: {
        skipped: aiResult.skipped,
        reason: aiResult.reason || '',
      },
    };

    await saveSnapshot(snapshot);
    await updateStatus({
      running: false,
      health: 'ok',
      lastRunAt: snapshot.createdAt,
      lastDurationMs: Date.now() - startedAt,
      lastSnapshotId: snapshot.id,
      lastError: '',
    });
    return snapshot;
  } catch (error) {
    await updateStatus({
      running: false,
      health: 'error',
      lastError: error?.message || String(error),
      lastDurationMs: Date.now() - startedAt,
    });
    throw error;
  }
}

async function getLatestSnapshot() {
  const snapshots = await getSnapshots();
  return snapshots[0] || null;
}

async function getSnapshotHistory(page = 1, pageSize = 10) {
  const safePage = Math.max(1, Number(page) || 1);
  const safePageSize = Math.max(1, Math.min(50, Number(pageSize) || 10));
  const snapshots = await getSnapshots();
  const offset = (safePage - 1) * safePageSize;
  return {
    page: safePage,
    pageSize: safePageSize,
    total: snapshots.length,
    items: snapshots.slice(offset, offset + safePageSize),
  };
}

module.exports = {
  getConfig,
  getLatestSnapshot,
  getSnapshotHistory,
  getStatus,
  runAnalysis,
  setConfig,
};
