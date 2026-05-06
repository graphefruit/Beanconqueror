const { config } = require('./config');
const { getPool } = require('./db');

function normalizeBaseUrl(baseUrl) {
  return baseUrl.replace(/\/+$/, '');
}

async function requestGaggiuino(path) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    config.gaggiuino.timeoutMs,
  );
  const url = `${normalizeBaseUrl(config.gaggiuino.baseUrl)}${path}`;

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(
        `Gaggiuino request failed: ${response.status} ${response.statusText}`,
      );
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeLatestShotId(data) {
  if (Array.isArray(data)) {
    return Number(data[0]?.lastShotId ?? data[0]?.id ?? data[0]);
  }

  return Number(data?.lastShotId ?? data?.id ?? data);
}

function normalizeShotTimestamp(shot) {
  const timestamp = shot?.timestamp;
  if (timestamp === null || timestamp === undefined) {
    return null;
  }

  const parsed = Number(timestamp);
  if (Number.isFinite(parsed)) {
    return parsed;
  }

  const dateValue = Date.parse(timestamp);
  if (Number.isFinite(dateValue)) {
    return Math.floor(dateValue / 1000);
  }

  return null;
}

async function getStatus() {
  return await requestGaggiuino('/api/system/status');
}

async function getLatestShotId() {
  const data = await requestGaggiuino('/api/shots/latest');
  return normalizeLatestShotId(data);
}

async function getShot(id) {
  return await requestGaggiuino(`/api/shots/${id}`);
}

async function saveShot(id, shot) {
  if (!shot) {
    return;
  }

  await getPool().execute(
    `INSERT INTO gaggiuino_shots (shot_id, shot_timestamp, profile_name, raw_data)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       shot_timestamp = VALUES(shot_timestamp),
       profile_name = VALUES(profile_name),
       raw_data = VALUES(raw_data)`,
    [
      id,
      normalizeShotTimestamp(shot),
      shot?.profile?.name || null,
      JSON.stringify(shot),
    ],
  );
}

async function getSavedShots() {
  const [rows] = await getPool().execute(
    'SELECT shot_id, shot_timestamp, profile_name, raw_data FROM gaggiuino_shots ORDER BY shot_id DESC LIMIT 50',
  );

  return rows.map((row) => ({
    id: row.shot_id,
    timestamp: row.shot_timestamp,
    profileName: row.profile_name,
    rawData: Buffer.isBuffer(row.raw_data)
      ? JSON.parse(row.raw_data.toString('utf8'))
      : typeof row.raw_data === 'string'
        ? JSON.parse(row.raw_data)
        : row.raw_data,
  }));
}

async function importLatestShots(count) {
  const latestShotId = await getLatestShotId();
  const imported = [];

  if (!Number.isFinite(latestShotId)) {
    return imported;
  }

  const limit = Math.max(1, Math.min(Number(count) || 6, 50));
  for (
    let id = latestShotId;
    id >= Math.max(1, latestShotId - limit + 1);
    id--
  ) {
    try {
      const shot = await getShot(id);
      if (shot) {
        await saveShot(id, shot);
        imported.push({ id, rawData: shot });
      }
    } catch (error) {
      console.error(`Failed to import Gaggiuino shot ${id}:`, error);
    }
  }

  return imported;
}

module.exports = {
  getLatestShotId,
  getSavedShots,
  getShot,
  getStatus,
  importLatestShots,
  saveShot,
};
