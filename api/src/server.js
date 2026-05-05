const http = require('http');

const { config } = require('./config');
const { migrate } = require('./db');
const {
  getLatestShotId,
  getSavedShots,
  getShot,
  getStatus,
  importLatestShots,
  saveShot,
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
  if (url.pathname === '/api/gaggiuino/status' && request.method === 'GET') {
    sendJson(response, 200, await getStatus());
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
    sendJson(response, 200, { imported: await importLatestShots(body.count) });
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

  if (await handleStorage(request, response, url)) {
    return;
  }

  if (await handleGaggiuino(request, response, url)) {
    return;
  }

  sendJson(response, 404, { error: 'not_found' });
}

async function start() {
  await migrate();

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
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
