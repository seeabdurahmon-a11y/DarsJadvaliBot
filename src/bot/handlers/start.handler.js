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

  // /cods, /codes, /commands, /cmds, /help buyruqlari
  bot.command(['cods', 'codes', 'commands', 'cmds', 'buyruqlar', 'komandalar', 'help'], async (ctx) => {
    let helpText = `⚡️ <b>MAKTAB BOT BARCHA BUYRUQLARI:</b>\n\n` +
      `👤 <b>Asosiy buyruqlar:</b>\n` +
      `🔹 <code>/start</code> — Botni ishga tushirish va asosiy menyu\n` +
      `🔹 <code>/hozir</code> — Hozir qaysi dars ketayotganini ko‘rish\n` +
      `🔹 <code>/darsjadvali</code> — Bugungi dars jadvalini olish\n` +
      `🔹 <code>/schedule</code> — Dars jadvalini ko‘rish\n` +
      `🔹 <code>/cods</code> — Barcha buyruqlar ro‘yxati\n\n` +
      `👥 <b>Guruh buyruqlari (Sinf guruhlari uchun):</b>\n` +
      `🔹 <code>/hozir</code> — Guruh sinfining hozirgi darsini ko‘rish\n` +
      `🔹 <code>/darsjadvali</code> — Guruhning bugungi jadvalini olish\n` +
      `🔹 <code>/resend</code> — Guruhga dars jadvalini qaytadan tashlash <i>(Admin)</i>\n` +
      `🔹 <code>/setclass 11-D</code> — Guruhni sinfga biriktirish <i>(Admin)</i>\n` +
      `🔹 <code>/settime 06:00</code> — Dars yuborish vaqtini belgilash <i>(Admin)</i>\n`;

    if (ctx.isAdmin) {
      helpText += `\n👑 <b>Tizim Admini buyruqlari:</b>\n` +
        `🔹 <code>/admin</code> — Boshqaruv panelini ochish\n` +
        `🔹 <code>/addgroup</code> — Yangi sinf guruhini ulash\n`;
    }

    await ctx.reply(helpText, { parse_mode: 'HTML' });
  });

  // ℹ️ Bot haqida tugmasi
  bot.hears('ℹ️ Bot haqida', async (ctx) => {
    await ctx.reply(BOT_TEXTS.ABOUT, { parse_mode: 'HTML' });
  });
}
