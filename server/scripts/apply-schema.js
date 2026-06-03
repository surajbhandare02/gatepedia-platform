const fs = require("fs");
const path = require("path");
const pool = require("../db");
const logger = require("../utils/logger");

async function main() {
  const schemaPath = path.join(__dirname, "..", "schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf8");
  await pool.query(sql);
  logger.info("Database schema applied");
}

main()
  .catch((error) => {
    logger.error("Database schema failed", { error: error.message });
    process.exitCode = 1;
  })
  .finally(() => pool.end());
