const http = require('http');

const {
  getConfig: getAiAnalysisConfig,
  getLatestSnapshot,
  getSnapshotHistory,
  getStatus: getAiAnalysisStatus,
  runAnalysis,
  setConfig: setAiAnalysisConfig,
} = require('./ai-analysis');
const { config } = require('./config');
const { migrate } = require('./db');
const {
  GaggiuinoConnectionError,
  getAutoSyncState,
  getGaggiuinoSettings,
  getLatestShotId,
  getSavedShots,
  getShot,
  getStatus,
  importLatestShots,
  saveShot,
  syncNewShotsSinceLast,
  syncShotsToBrews,
  updateAutoSyncState,
  updateGaggiuinoSettings,
} = require('./gaggiuino-client');
const { applyCors, readJson, sendJson, sendNoContent } = require('./http');
const {
  clearStorage,
  getAllStorage,
  getStorageValue,
  importStorage,
  setStorageValue,
} = require('./storage-repository');

function getStorageKey(pathname) {
  const prefix = '/api/storage/';
  if (!pathname.startsWith(prefix)) {
    return null;
  }

  return decodeURIComponent(pathname.substring(prefix.length));
}

function isAuthorized(request) {
  if (!config.apiAuthToken) {
    return true;
  }

  const headerToken = request.headers['x-beanconqueror-api-token'];
  if (headerToken === config.apiAuthToken) {
    return true;
  }

  const authorization = request.headers.authorization || '';
  return authorization === `Bearer ${config.apiAuthToken}`;
}

async function handleStorage(request, response, url) {
  if (url.pathname === '/api/storage' && request.method === 'GET') {
    sendJson(response, 200, await getAllStorage());
    return true;
  }

  if (url.pathname === '/api/storage/import' && request.method === 'POST') {
    await importStorage(await readJson(request));
    sendNoContent(response);
    return true;
  }

  if (url.pathname === '/api/storage' && request.method === 'DELETE') {
    await clearStorage();
    sendNoContent(response);
    return true;
  }

  const key = getStorageKey(url.pathname);
  if (!key) {
    return false;
  }

  if (request.method === 'GET') {
    const value = await getStorageValue(key);
    if (value === undefined) {
      sendJson(response, 404, { error: 'not_found' });
      return true;
    }

    sendJson(response, 200, { key, value });
    return true;
  }

  if (request.method === 'PUT') {
    const body = await readJson(request);
    await setStorageValue(
      key,
      Object.prototype.hasOwnProperty.call(body, 'value') ? body.value : body,
    );
    sendNoContent(response);
    return true;
  }

  return false;
}

async function handleGaggiuino(request, response, url) {
  if (
    url.pathname === '/api/gaggiuino/autosync-status' &&
    request.method === 'GET'
  ) {
    sendJson(response, 200, await getAutoSyncState());
    return true;
  }

  if (
    url.pathname === '/api/gaggiuino/autosync-sync-now' &&
    request.method === 'POST'
  ) {
    const result = await syncNewShotsSinceLast({
      maxShotsPerRun: config.gaggiuino.autoSyncBatchSize,
      initialImportCount: config.gaggiuino.autoSyncInitialImportCount,
    });
    sendJson(response, 200, {
      result: {
        imported: result.imported.length,
        sync: result.sync,
        latestShotId: result.latestShotId,
        lastSyncedShotId: result.lastSyncedShotId,
      },
      status: await getAutoSyncState(),
    });
    return true;
  }

  if (url.pathname === '/api/gaggiuino/config' && request.method === 'GET') {
    sendJson(response, 200, await getGaggiuinoSettings());
    return true;
  }

  if (url.pathname === '/api/gaggiuino/config' && request.method === 'PUT') {
    sendJson(response, 200, await updateGaggiuinoSettings(await readJson(request)));
    return true;
  }

  if (url.pathname === '/api/gaggiuino/status' && request.method === 'GET') {
    const status = await getStatus();
    if (!status) {
      sendJson(response, 404, { error: 'not_found' });
      return true;
    }

    sendJson(response, 200, status);
    return true;
  }

  if (
    url.pathname === '/api/gaggiuino/shots/latest' &&
    request.method === 'GET'
  ) {
    sendJson(response, 200, { lastShotId: await getLatestShotId() });
    return true;
  }

  if (url.pathname === '/api/gaggiuino/shots' && request.method === 'GET') {
    sendJson(response, 200, { shots: await getSavedShots() });
    return true;
  }

  if (
    url.pathname === '/api/gaggiuino/shots/import-latest' &&
    request.method === 'POST'
  ) {
    const body = await readJson(request);
    sendJson(response, 200, await importLatestShots(body.count, {
      syncToBrews: body.syncToBrews !== false,
    }));
    return true;
  }

  if (
    url.pathname === '/api/gaggiuino/shots/sync-saved' &&
    request.method === 'POST'
  ) {
    const savedShots = await getSavedShots();
    const sync = await syncShotsToBrews(
      savedShots.map((shot) => ({ id: shot.id, rawData: shot.rawData })),
    );
    sendJson(response, 200, { sync });
    return true;
  }

  const match = url.pathname.match(/^\/api\/gaggiuino\/shots\/(\d+)$/);
  if (match && request.method === 'GET') {
    const id = Number(match[1]);
    const shot = await getShot(id);
    if (!shot) {
      sendJson(response, 404, { error: 'not_found' });
      return true;
    }

    await saveShot(id, shot);
    sendJson(response, 200, shot);
    return true;
  }

  return false;
}

async function handleAiAnalysis(request, response, url) {
  if (url.pathname === '/api/ai-analysis/status' && request.method === 'GET') {
    sendJson(response, 200, await getAiAnalysisStatus());
    return true;
  }

  if (url.pathname === '/api/ai-analysis/latest' && request.method === 'GET') {
    sendJson(response, 200, {
      snapshot: await getLatestSnapshot(),
    });
    return true;
  }

  if (url.pathname === '/api/ai-analysis/history' && request.method === 'GET') {
    const page = Number(url.searchParams.get('page') || 1);
    const pageSize = Number(url.searchParams.get('pageSize') || 10);
    sendJson(response, 200, await getSnapshotHistory(page, pageSize));
    return true;
  }

  if (url.pathname === '/api/ai-analysis/run-now' && request.method === 'POST') {
    const snapshot = await runAnalysis();
    sendJson(response, 200, { snapshot });
    return true;
  }

  if (url.pathname === '/api/ai-analysis/config' && request.method === 'GET') {
    sendJson(response, 200, await getAiAnalysisConfig());
    return true;
  }

  if (url.pathname === '/api/ai-analysis/config' && request.method === 'PUT') {
    sendJson(response, 200, await setAiAnalysisConfig(await readJson(request)));
    return true;
  }

  return false;
}

async function route(request, response) {
  applyCors(request, response, config.corsOrigins);

  if (request.method === 'OPTIONS') {
    sendNoContent(response);
    return;
  }

  const url = new URL(
    request.url,
    `http://${request.headers.host || 'localhost'}`,
  );

  if (url.pathname === '/health') {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (!isAuthorized(request)) {
    sendJson(response, 401, { error: 'unauthorized' });
    return;
  }

  if (await handleStorage(request, response, url)) {
    return;
  }

  try {
    if (await handleGaggiuino(request, response, url)) {
      return;
    }
    if (await handleAiAnalysis(request, response, url)) {
      return;
    }
  } catch (error) {
    if (error instanceof GaggiuinoConnectionError) {
      sendJson(response, error.status, {
        error: 'gaggiuino_unavailable',
        message: error.message,
      });
      return;
    }

    throw error;
  }

  sendJson(response, 404, { error: 'not_found' });
}

function clampInterval(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(1000, parsed);
}

function startGaggiuinoAutoSyncMonitor() {
  let timer = null;
  let running = false;
  let consecutiveFailures = 0;

  const schedule = (delayMs) => {
    const delay = clampInterval(delayMs, config.gaggiuino.autoSyncIntervalMs);
    timer = setTimeout(runTick, delay);
    updateAutoSyncState({
      enabled: true,
      running,
      nextPollInMs: delay,
    }).catch((err) => console.error('Failed to update auto-sync state:', err));
  };

  const runTick = async () => {
    if (running) {
      schedule(config.gaggiuino.autoSyncIntervalMs);
      return;
    }

    running = true;
    const checkedAt = new Date().toISOString();
    await updateAutoSyncState({
      enabled: true,
      running: true,
      lastCheckedAt: checkedAt,
    }).catch((err) => console.error('Failed to update auto-sync state:', err));

    let nextDelay = config.gaggiuino.autoSyncIntervalMs;

    try {
      const settings = await getGaggiuinoSettings();
      if (!settings.autoSyncEnabled) {
        consecutiveFailures = 0;
        await updateAutoSyncState({
          enabled: false,
          online: null,
          running: false,
          consecutiveFailures: 0,
          lastError: '',
          nextPollInMs: config.gaggiuino.autoSyncIntervalMs,
        }).catch((err) => console.error('Failed to update auto-sync state:', err));
        return;
      }

      await getStatus();
      const result = await syncNewShotsSinceLast({
        maxShotsPerRun: config.gaggiuino.autoSyncBatchSize,
        initialImportCount: config.gaggiuino.autoSyncInitialImportCount,
      });

      consecutiveFailures = 0;
      await updateAutoSyncState({
        enabled: true,
        online: true,
        running: false,
        consecutiveFailures: 0,
        lastSuccessAt: new Date().toISOString(),
        lastError: '',
        lastImportedCount: result.imported.length,
        lastSyncSummary: result.sync,
      }).catch((err) => console.error('Failed to update auto-sync state:', err));
    } catch (error) {
      consecutiveFailures++;
      const multiplier = Math.min(2 ** Math.min(consecutiveFailures, 6), 64);
      nextDelay = Math.min(
        config.gaggiuino.autoSyncMaxBackoffMs,
        config.gaggiuino.autoSyncIntervalMs * multiplier,
      );

      await updateAutoSyncState({
        enabled: true,
        online: false,
        running: false,
        consecutiveFailures,
        lastError: error?.message || String(error),
      }).catch((err) => console.error('Failed to update auto-sync state:', err));
    } finally {
      running = false;
      schedule(nextDelay);
    }
  };

  schedule(2000);
}

function startAiAnalysisMonitor() {
  let timer = null;
  let running = false;
  let consecutiveFailures = 0;

  const schedule = async (delayMs) => {
    const aiConfig = await getAiAnalysisConfig();
    const cadenceMs = clampInterval(
      aiConfig.cadenceHours * 60 * 60 * 1000,
      24 * 60 * 60 * 1000,
    );
    const delay = clampInterval(delayMs, cadenceMs);
    timer = setTimeout(runTick, delay);
  };

  const runTick = async () => {
    if (running) {
      schedule(60 * 1000).catch((err) => console.error('AI analysis schedule error:', err));
      return;
    }
    running = true;
    let nextDelay = 24 * 60 * 60 * 1000;
    try {
      const aiConfig = await getAiAnalysisConfig();
      const status = await getAiAnalysisStatus();
      nextDelay = clampInterval(
        aiConfig.cadenceHours * 60 * 60 * 1000,
        24 * 60 * 60 * 1000,
      );

      if (!aiConfig.enabled) {
        return;
      }

      const lastRunAt = status.lastRunAt ? new Date(status.lastRunAt).getTime() : 0;
      if (lastRunAt > 0 && Date.now() - lastRunAt < nextDelay) {
        return;
      }

      await runAnalysis();
      consecutiveFailures = 0;
    } catch (error) {
      consecutiveFailures++;
      const multiplier = Math.min(2 ** Math.min(consecutiveFailures, 6), 64);
      nextDelay = Math.min(6 * 60 * 60 * 1000, nextDelay * multiplier);
    } finally {
      running = false;
      schedule(nextDelay).catch((err) => console.error('AI analysis schedule error:', err));
    }
  };

  schedule(10 * 1000).catch((err) => console.error('AI analysis schedule error:', err));
}

async function start() {
  await migrate();
  const settings = await getGaggiuinoSettings();
  await updateAutoSyncState({ enabled: settings.autoSyncEnabled, running: false }).catch(
    (err) => console.error('Failed to initialize auto-sync state:', err),
  );

  const server = http.createServer((request, response) => {
    route(request, response).catch((error) => {
      console.error(error);
      sendJson(response, 500, {
        error: 'internal_error',
        message: error.message,
      });
    });
  });

  server.listen(config.port, () => {
    console.log(`Beanconqueror API listening on ${config.port}`);
    startGaggiuinoAutoSyncMonitor();
    startAiAnalysisMonitor();
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
