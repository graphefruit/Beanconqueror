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

    for (const [key, value] of Object.entries(data || {})) {
      await connection.execute(
        'INSERT INTO app_storage (storage_key, storage_value) VALUES (?, ?)',
        [key, serialize(value)],
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

module.exports = {
  clearStorage,
  getAllStorage,
  getStorageValue,
  importStorage,
  setStorageValue,
};
