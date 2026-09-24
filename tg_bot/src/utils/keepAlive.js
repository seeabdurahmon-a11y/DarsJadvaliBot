import { logger } from './logger.js';

let keepAliveInterval = null;

/**
 * Render / Cloud hosting larda server uxlab qolmasligi uchun avtomatik self-ping
 */
export function initKeepAlive() {
  const targetUrl = process.env.RENDER_EXTERNAL_URL || process.env.KEEP_ALIVE_URL || process.env.WEB_APP_URL;
  if (!targetUrl || !targetUrl.startsWith('http')) {
    return;
  }

  const pingUrl = `${targetUrl.replace(/\/$/, '')}/api/health`;
  logger.info(`[KEEP-ALIVE] 24/7 Avtomatik uyg'oq tutish xizmati faollashtirildi: ${pingUrl}`);

  // Har 10 daqiqada o'ziga ping yuboradi (Render 15 daqiqada uxlatib qo'yishining oldini oladi)
  keepAliveInterval = setInterval(async () => {
    try {
      const res = await fetch(pingUrl);
      if (res.ok) {
        logger.debug('[KEEP-ALIVE] Self-ping muvaffaqiyatli amalga oshirildi.');
      }
    } catch (err) {
      logger.debug('[KEEP-ALIVE] Ping yuborishda ogohlantirish:', err.message);
    }
  }, 10 * 60 * 1000);
}

export function stopKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
}
