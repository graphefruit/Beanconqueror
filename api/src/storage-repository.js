const { getPool } = require('./db');

function serialize(value) {
  return JSON.stringify(value ?? null);
}

function deserialize(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string') {
    return JSON.parse(value);
  }

  if (Buffer.isBuffer(value)) {
    return JSON.parse(value.toString('utf8'));
  }

  return value;
}

async function getStorageValue(key) {
  const [rows] = await getPool().execute(
    'SELECT storage_value FROM app_storage WHERE storage_key = ? LIMIT 1',
    [key],
  );

  if (rows.length === 0) {
    return undefined;
  }

  return deserialize(rows[0].storage_value);
}

async function setStorageValue(key, value) {
  await getPool().execute(
    `INSERT INTO app_storage (storage_key, storage_value)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE storage_value = VALUES(storage_value)`,
    [key, serialize(value)],
  );
}

async function getAllStorage() {
  const [rows] = await getPool().execute(
    'SELECT storage_key, storage_value FROM app_storage ORDER BY storage_key',
  );
  const data = {};

  for (const row of rows) {
    data[row.storage_key] = deserialize(row.storage_value);
  }

  return data;
}

async function importStorage(data) {
  const connection = await getPool().getConnection();

  try {
    await connection.beginTransaction();
    await connection.execute('DELETE FROM app_storage');

    const entries = Object.entries(data || {});
    if (entries.length > 0) {
      const values = entries.map(([key, value]) => [key, serialize(value)]);
      await connection.query(
        'INSERT INTO app_storage (storage_key, storage_value) VALUES ?',
        [values],
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function clearStorage() {
  await getPool().execute('DELETE FROM app_storage');
}

async function mergeStorageList(key, entries, identity) {
  const current = await getStorageValue(key);
  const list = Array.isArray(current) ? current : [];
  const seen = new Set(list.map(identity).filter(Boolean));
  let added = 0;

  for (const entry of entries) {
    const id = identity(entry);
    if (!id || seen.has(id)) {
      continue;
    }

    list.push(entry);
    seen.add(id);
    added++;
  }

  if (added > 0) {
    await setStorageValue(key, list);
  }

  return { added, total: list.length };
}

async function upsertStorageList(key, entries, identity) {
  const current = await getStorageValue(key);
  const list = Array.isArray(current) ? current : [];
  const indexById = new Map();
  let added = 0;
  let updated = 0;

  list.forEach((entry, index) => {
    const id = identity(entry);
    if (id) {
      indexById.set(id, index);
    }
  });

  for (const entry of entries) {
    const id = identity(entry);
    if (!id) {
      continue;
    }

    const existingIndex = indexById.get(id);
    if (existingIndex === undefined) {
      list.push(entry);
      indexById.set(id, list.length - 1);
      added++;
    } else {
      list[existingIndex] = entry;
      updated++;
    }
  }

  if (added > 0 || updated > 0) {
    await setStorageValue(key, list);
  }

  return { added, updated, total: list.length };
}

module.exports = {
  clearStorage,
  getAllStorage,
  getStorageValue,
  importStorage,
  mergeStorageList,
  setStorageValue,
  upsertStorageList,
};
