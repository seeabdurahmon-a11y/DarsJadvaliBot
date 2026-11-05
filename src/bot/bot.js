import { Bot } from 'grammy';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { authMiddleware } from './middlewares/auth.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { registerStartHandlers } from './handlers/start.handler.js';
import { registerScheduleHandlers } from './handlers/schedule.handler.js';
import { registerGroupHandlers } from './handlers/group.handler.js';
import { registerAdminHandlers } from './handlers/admin.handler.js';
import { registerExamHandlers } from './handlers/exam.handler.js';

export function createBot(token = config.BOT_TOKEN) {
  if (!token || token === 'YOUR_BOT_TOKEN_HERE') {
    throw new Error('Telegram BOT_TOKEN kiritilmagan. Iltimos .env faylida BOT_TOKEN ni to‘g‘rilang.');
  }

  const bot = new Bot(token);

  // Global xatoliklar ushlovchisi
  bot.catch(errorHandler);

  // Auth va foydalanuvchi ma'lumotlarini saqlash middleware
  bot.use(authMiddleware);

  // Handlerlarni ro'yxatga olish
  registerStartHandlers(bot);
  registerScheduleHandlers(bot);
  registerGroupHandlers(bot);
  registerAdminHandlers(bot);
  registerExamHandlers(bot);

  // Rasmiy komandalar ro'yxatini Telegram ga sozlash
  bot.setupCommands = async () => {
    try {
      await bot.api.setMyCommands([
        { command: 'start', description: 'Botni ishga tushirish / Bosh sahifa' },
        { command: 'bugun', description: 'Bugungi dars jadvali' },
        { command: 'ertaga', description: 'Ertangi dars jadvali' },
        { command: 'hafta', description: 'Haftalik dars jadvali' },
        { command: 'sinf', description: 'Sinfni tanlash yoki o‘zgartirish' },
        { command: 'admin', description: 'Zavuch / Admin boshqaruv paneli' },
        { command: 'chiqish', description: 'Rol yoki maktabni qaytadan tanlash' }
      ]);
      logger.info('Telegram rasmiy komandalar menyusi muvaffaqiyatli sozlandi');
    } catch (err) {
      logger.warn('Telegram komandalarini sozlashda ogohlantirish:', err.message);
    }
  };

  // Menu Button helper
  bot.setupMenuButton = async () => {
    if (config.WEB_APP_URL && config.WEB_APP_URL.startsWith('https://')) {
      try {
        await bot.api.setChatMenuButton({
          menu_button: {
            type: 'web_app',
            text: 'Dars jadvali 📱',
            web_app: { url: config.WEB_APP_URL }
          }
        });
        logger.info('Telegram Web App Menu Button muvaffaqiyatli sozlandi');
      } catch (err) {
        logger.warn('Chat menu button sozlashda ogohlantirish:', err.message);
      }
    }
  };

  return bot;
}
