const mysql = require("mysql2/promise");
require("dotenv").config();

let pool;

function env(...keys) {
  for (const key of keys) {
    if (process.env[key] !== undefined && process.env[key] !== "") {
      return process.env[key];
    }
  }

  return undefined;
}

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: env("DB_HOST") || "localhost",
      port: Number(env("DB_PORT") || 3306),
      user: env("DB_USER", "DB_USERNAME") || "root",
      password: env("DB_PASSWORD") || "",
      database: env("DB_NAME", "DB_DATABASE") || "walang_pasok_panic_agent",
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }

  return pool;
}

async function query(sql, params = []) {
  const [rows] = await getPool().execute(sql, params);
  return rows;
}

async function getConnection() {
  return getPool().getConnection();
}

module.exports = {
  getPool,
  getConnection,
  query
};
