import { getDatabase } from '../src/database/db.js';
import { createWebServer } from '../src/api/server.js';
import { logger } from '../src/utils/logger.js';

const port = process.env.PORT || 3000;

try {
  getDatabase();
  const server = createWebServer();
  await server.start(port);
  console.log(`\n======================================================`);
  console.log(`🚀 VEB-SAYT VA TELEGRAM MINI APP ISHGA TUSHDI!`);
  console.log(`🔗 Brauzerda oching: http://localhost:${port}`);
  console.log(`👤 Test Zavuch login: test@darsjadvali.uz`);
  console.log(`🔑 Parol:             darsjadvoli0751`);
  console.log(`======================================================\n`);
} catch (err) {
  logger.error('Web serverni ishga tushirishda xatolik:', err);
  process.exit(1);
}
