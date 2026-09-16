import { config, validateConfig } from './config/index.js';
import { getDatabase, closeDatabase } from './database/db.js';
import { createBot } from './bot/bot.js';
import { createWebServer } from './api/server.js';
import { scheduler } from './scheduler/cron.scheduler.js';
import { logger } from './utils/logger.js';

let isShuttingDown = false;

// Kutilmagan xatoliklar tufayli jarayon to'xtab qolishining oldini olish
process.on('uncaughtException', (err) => {
  logger.error('[PROCESS UNCAUGHT EXCEPTION]', err);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('[PROCESS UNHANDLED REJECTION]', reason);
});

async function main() {
  console.log('====================================================');
  console.log('    MAKTAB — TELEGRAM BOT & MINI APP WEB SERVER     ');
  console.log('====================================================');

  const { isValid, errors } = validateConfig();
  if (!isValid) {
    logger.warn('Konfiguratsiyada xatoliklar mavjud:');
    errors.forEach(err => logger.warn(` - ${err}`));
    logger.warn('Iltimos, .env faylini to‘ldiring va qaytadan ishga tushiring.');
    process.exit(1);
  }

  try {
    // 1. Ma'lumotlar bazasini ishga tushirish
    getDatabase();

    // 2. Telegram botni yaratish
    const bot = createBot();

    // 3. Web Server va Telegram Mini Appni ishga tushirish (Express)
    const webServer = createWebServer(bot);
    await webServer.start(config.PORT);

    // 4. Telegram Web App Chat Menu Buttonni sozlash
    await bot.setupMenuButton();

    // 5. Avtomatik dars jadvalini yuboruvchi schedulerni ishga tushirish
    scheduler.init(bot);

    // 6. Graceful shutdown handler
    const shutdown = async (signal) => {
      if (isShuttingDown) return;
      isShuttingDown = true;

      logger.info(`[SHUTDOWN] Bot va Web Server to'xtatilmoqda (${signal})...`);
      scheduler.stop();
      try {
        await webServer.stop();
      } catch (err) {}
      try {
        await bot.stop();
      } catch (err) {}
      closeDatabase();
      logger.info('[SHUTDOWN] Tizim to‘liq to‘xtatildi.');
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // 7. Bot pollingni bardoshli va avtomatik qayta ulanuvchi rejimda boshlash (24/7 Always Active)
    let retryCount = 0;
    while (!isShuttingDown) {
      try {
        logger.info('🤖 Bot muvaffaqiyatli ishga tushirildi va xabarlarni kutmoqda...');
        await bot.start({
          drop_pending_updates: false,
          onStart(botInfo) {
            retryCount = 0;
            logger.info(`✅ @${botInfo.username} online va faol! (ID: ${botInfo.id})`);
          }
        });
        if (isShuttingDown) break;
      } catch (pollError) {
        if (isShuttingDown) break;

        retryCount++;
        const isConflict = pollError?.message?.includes('409') || pollError?.description?.includes('Conflict');
        const waitMs = isConflict ? 5000 : Math.min(3000 * retryCount, 30000);

        logger.warn(`⚠️ [BOT MONITOR] Telegram aloqasida uzilish yuz berdi (${pollError.message || pollError}). ${waitMs / 1000} soniyadan so'ng qayta ulanadi (Urinish: ${retryCount})...`);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
    }
  } catch (error) {
    logger.error('Tizimni ishga tushirishda jiddiy xatolik:', error);
    process.exit(1);
  }
}

main();
