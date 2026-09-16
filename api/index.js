import { createWebServer } from '../src/api/server.js';
import { createBot } from '../src/bot/bot.js';
import { getDatabase } from '../src/database/db.js';
import { config } from '../src/config/index.js';
import { logger } from '../src/utils/logger.js';

let appInstance = null;

export default async function handler(req, res) {
  try {
    if (!appInstance) {
      getDatabase();
      let bot = null;
      if (config.BOT_TOKEN && config.BOT_TOKEN !== 'YOUR_BOT_TOKEN_HERE') {
        try {
          bot = createBot();
        } catch (botErr) {
          logger.warn('Bot initializatsiya ogohlantirish:', botErr.message);
        }
      }
      const webServer = createWebServer(bot);
      appInstance = webServer.app;
    }
    return appInstance(req, res);
  } catch (err) {
    logger.error('[VERCEL API ERROR]', err);
    return res.status(500).json({
      success: false,
      error: 'Serverda ichki xatolik yuz berdi: ' + (err.message || 'Noma\'lum xatolik')
    });
  }
}
