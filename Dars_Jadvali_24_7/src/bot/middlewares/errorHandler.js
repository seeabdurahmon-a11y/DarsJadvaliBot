import { GrammyError, HttpError } from 'grammy';
import { logger } from '../../utils/logger.js';

export function errorHandler(err) {
  const ctx = err.ctx;
  logger.error(`[BOT ERROR] Xatolik yuz berdi update_id=${ctx?.update?.update_id}:`, err.error);

  const e = err.error;
  if (e instanceof GrammyError) {
    logger.error(`[GRAMMY ERROR] Telegram API xatosi: ${e.description} (code=${e.error_code})`);
  } else if (e instanceof HttpError) {
    logger.error('[HTTP ERROR] Telegram serveri bilan ulanishda xatolik:', e);
  } else {
    logger.error('[UNKNOWN ERROR] Noma\'lum xatolik:', e);
  }
}
