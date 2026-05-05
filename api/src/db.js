const mysql = require('mysql2/promise');

const { config } = require('./config');

let pool;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: config.db.host,
      port: config.db.port,
      database: config.db.database,
      user: config.db.user,
      password: config.db.password,
      waitForConnections: true,
      connectionLimit: 10,
      charset: 'utf8mb4',
      decimalNumbers: true,
      namedPlaceholders: true,
    });
  }

  return pool;
}

async function waitForDatabase() {
  const startedAt = Date.now();
  let lastError;

  while (Date.now() - startedAt < 60000) {
    try {
      const connection = await getPool().getConnection();
      connection.release();
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  throw lastError;
}

async function migrate() {
  await waitForDatabase();

  await getPool().query(`
    CREATE TABLE IF NOT EXISTS app_storage (
      storage_key VARCHAR(191) NOT NULL PRIMARY KEY,
      storage_value JSON NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await getPool().query(`
    CREATE TABLE IF NOT EXISTS gaggiuino_shots (
      shot_id INT NOT NULL PRIMARY KEY,
      shot_timestamp BIGINT NULL,
      profile_name VARCHAR(255) NULL,
      raw_data JSON NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

module.exports = { getPool, migrate };
