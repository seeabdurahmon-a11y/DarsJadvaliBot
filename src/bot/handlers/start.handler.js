import { BOT_TEXTS } from '../../config/constants.js';
import { getUserMainMenuKeyboard, getWebAppInlineKeyboard } from '../keyboards/user.keyboard.js';
import { config } from '../../config/index.js';

export function registerStartHandlers(bot) {
  // /start buyrug'i
  bot.command('start', async (ctx) => {
    if (ctx.chat.type !== 'private') {
      return ctx.reply(`Assalomu alaykum! <b>MAKTAB</b> dars jadvali boti guruhga muvaffaqiyatli qo'shildi.`, {
        parse_mode: 'HTML'
      });
    }

    await ctx.reply(BOT_TEXTS.WELCOME, {
      parse_mode: 'HTML',
      reply_markup: getUserMainMenuKeyboard()
    });
  });

  // 🌐 Dars jadvalini ochish tugmasi
  bot.hears('🌐 Dars jadvalini ochish', async (ctx) => {
    const inlineKeyboard = getWebAppInlineKeyboard();
    if (inlineKeyboard) {
      await ctx.reply(
        `📱 <b>Maktab elektron dars jadvali Mini App:</b>\n\nQuyidagi tugma orqali ilovani Telegram ichida oching:`,
        {
          parse_mode: 'HTML',
          reply_markup: inlineKeyboard
        }
      );
    } else {
      await ctx.reply(
        `📱 <b>Maktab elektron dars jadvali:</b>\n\n` +
        `🌐 Web boshqaruv paneli va dars jadvali serveri ishlab turibdi.\n` +
        `💻 Kompyuter / brauzerda ochish manzili: <code>http://localhost:${config.PORT || 3000}</code>\n\n` +
        `💡 <i>Telegram ichida Mini App sifatida ochish uchun <code>.env</code> faylidagi <code>WEB_APP_URL</code> qatoriga HTTPS manzil (masalan ngrok yoki domen manzili) kiritilishi kerak.</i>`,
        {
          parse_mode: 'HTML'
        }
      );
    }
  });

  // /help buyrug'i
  bot.command('help', async (ctx) => {
    let helpText = `📖 <b>MAKTAB Bot Buyruqlari:</b>\n\n` +
      `🔹 /start — Botni ishga tushirish va asosiy menyu\n` +
      `🔹 /help — Yordam ma'lumotlari\n` +
      `🔹 /darsjadvali — Guruhda bugungi dars jadvalini olish (1 daqiqada o'chadi)\n` +
      `🔹 /schedule — Dars jadvalini ko'rish\n`;

    if (ctx.isAdmin) {
      helpText += `\n👑 <b>Admin buyruqlari:</b>\n` +
        `🔹 /admin — Boshqaruv panelini ochish\n` +
        `🔹 /setclass 11-D — Guruhni aniq bir sinfga mahkamlash (qotirish)\n` +
        `🔹 /settime 06:00 — Guruhning dars yuborish vaqtini belgilash\n` +
        `🔹 /addgroup — Sinf guruhini botga ulash\n`;
    }

    await ctx.reply(helpText, { parse_mode: 'HTML' });
  });

  // ℹ️ Bot haqida tugmasi
  bot.hears('ℹ️ Bot haqida', async (ctx) => {
    await ctx.reply(BOT_TEXTS.ABOUT, { parse_mode: 'HTML' });
  });
}
