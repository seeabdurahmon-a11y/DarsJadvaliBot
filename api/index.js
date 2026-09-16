import { createWebServer } from '../src/api/server.js';
import { createBot } from '../src/bot/bot.js';
import { getDatabase } from '../src/database/db.js';

let appInstance = null;

export default async function handler(req, res) {
  if (!appInstance) {
    getDatabase();
    const bot = createBot();
    const webServer = createWebServer(bot);
    appInstance = webServer.app;
  }
  return appInstance(req, res);
}
