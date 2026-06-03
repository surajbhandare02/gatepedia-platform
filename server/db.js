const { Pool } = require("pg");
const { db } = require("./config/env");

/** Shared connection pool — reuse across requests */
const pool = new Pool(db);

module.exports = pool;
