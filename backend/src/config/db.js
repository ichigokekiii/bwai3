const mysql = require("mysql2/promise");
require("dotenv").config();

let pool;
let databaseEnsured = false;

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
      database: env("DB_NAME", "DB_DATABASE") || "bwai3",
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }

  return pool;
}

function getBaseConfig() {
  return {
    host: env("DB_HOST") || "localhost",
    port: Number(env("DB_PORT") || 3306),
    user: env("DB_USER", "DB_USERNAME") || "root",
    password: env("DB_PASSWORD") || ""
  };
}

function getDatabaseName() {
  return env("DB_NAME", "DB_DATABASE") || "bwai3";
}

async function ensureDatabaseExists() {
  if (databaseEnsured) {
    return;
  }

  const connection = await mysql.createConnection(getBaseConfig());

  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${getDatabaseName()}\``);
    databaseEnsured = true;
  } finally {
    await connection.end();
  }
}

async function query(sql, params = []) {
  await ensureDatabaseExists();
  const [rows] = await getPool().execute(sql, params);
  return rows;
}

async function getConnection() {
  await ensureDatabaseExists();
  return getPool().getConnection();
}

module.exports = {
  ensureDatabaseExists,
  getPool,
  getConnection,
  query
};
