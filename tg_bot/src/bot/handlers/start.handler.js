import { BOT_TEXTS } from '../../config/constants.js';
import { getUserMainMenuKeyboard, getWebAppInlineKeyboard, getClassesGridInlineKeyboard } from '../keyboards/user.keyboard.js';
import { schoolsRepo } from '../../database/schools.repo.js';
import { groupsRepo } from '../../database/groups.repo.js';
import { usersRepo } from '../../database/users.repo.js';
import { escapeHtml } from '../../utils/formatter.js';
import { config } from '../../config/index.js';

export function registerStartHandlers(bot) {
  // /start buyrug'i (Deep link orqali yoki to'g'ridan-to'g'ri)
  bot.command('start', async (ctx) => {
    if (ctx.chat.type !== 'private') {
      return ctx.reply(`Assalomu alaykum! <b>MAKTAB</b> dars jadvali boti guruhga muvaffaqiyatli qo'shildi.`, {
        parse_mode: 'HTML'
      });
    }

    const startPayload = ctx.match?.trim();

    // 1. Deep linking orqali maktab kodi yuborilgan bo'lsa (masalan: /start code_M01 yoki /start M-01)
    if (startPayload) {
      const cleanCode = startPayload.replace(/^code_/, '').trim();
      const school = schoolsRepo.getSchoolByCode(cleanCode);
      if (school) {
        usersRepo.setSelectedSchool(ctx.from.id, school.id);
        const classes = groupsRepo.getAllGroups(true, school.id);
        const keyboard = getClassesGridInlineKeyboard(classes, 'user_bind_sinf_');

        await ctx.reply(
          `🏫 <b>Maktab ulandi: ${escapeHtml(school.name)}</b> (Kodi: <code>${school.code}</code>)\n\n` +
          `Endi o‘zingizning sinfingizni tanlang:`,
          { parse_mode: 'HTML', reply_markup: keyboard }
        );

        return ctx.reply(`Asosiy menyu faollashtirildi:`, {
          reply_markup: getUserMainMenuKeyboard()
        });
      }
    }

    // 2. Oddiy /start
    await ctx.reply(BOT_TEXTS.WELCOME, {
      parse_mode: 'HTML',
      reply_markup: getUserMainMenuKeyboard()
    });
  });

  // /kod, /maktab, /code buyruqlari
  bot.command(['kod', 'maktab', 'code', 'school'], async (ctx) => {
    if (ctx.chat.type !== 'private') return;

    const input = ctx.match?.trim();

    // 1. Foydalanuvchi kodni to'g'ridan-to'g'ri yozgan bo'lsa (masalan: /kod M-01 yoki /kod 12)
    if (input) {
      const school = schoolsRepo.getSchoolByCode(input);
      if (school) {
        usersRepo.setSelectedSchool(ctx.from.id, school.id);
        const classes = groupsRepo.getAllGroups(true, school.id);
        const keyboard = getClassesGridInlineKeyboard(classes, 'user_bind_sinf_');

        return ctx.reply(
          `✅ <b>Maktab muvaffaqiyatli tanlandi: ${escapeHtml(school.name)}</b> (Kodi: <code>${school.code}</code>)\n\n` +
          `Quyidagi ro‘yxatdan o‘z sinfingizni tanlang:`,
          { parse_mode: 'HTML', reply_markup: keyboard }
        );
      } else {
        return ctx.reply(
          `⚠️ <b>"${escapeHtml(input)}"</b> kodli maktab topilmadi.\n\n` +
          `Iltimos, maktab kodini to‘g‘ri kiriting (Masalan: <code>/kod M-01</code> yoki <code>/kod M-12</code>).`,
          { parse_mode: 'HTML' }
        );
      }
    }

    // 2. Parametrsiz chaqirilganda: Ro'yxatni chiqarish
    const user = usersRepo.getUserByTelegramId(ctx.from.id);
    const schools = schoolsRepo.getAllSchools(true);

    let text = `🏫 <b>Maktabingiz kodini kiriting:</b>\n\n` +
      `Masalan: <code>/kod M-01</code> yoki <code>/kod M-12</code>\n\n`;

    if (user?.selected_school_name) {
      text += `📌 Joriy maktabingiz: <b>${escapeHtml(user.selected_school_name)}</b> (Kodi: <code>${user.selected_school_code}</code>)\n\n`;
    }

    text += `📋 <b>Mavjud maktablar ro‘yxati:</b>\n` +
      schools.map(s => `• <b>${escapeHtml(s.name)}</b> — Kodi: <code>${s.code}</code>`).join('\n');

    await ctx.reply(text, { parse_mode: 'HTML' });
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
        `💡 <i>Telegram ichida Mini App sifatida ochish uchun <code>.env</code> faylidagi <code>WEB_APP_URL</code> qatoriga HTTPS manzil kiritilishi kerak.</i>`,
        {
          parse_mode: 'HTML'
        }
      );
    }
  });

  // /cods, /codes, /commands, /cmds, /help buyruqlari
  bot.command(['cods', 'codes', 'commands', 'cmds', 'buyruqlar', 'komandalar', 'help'], async (ctx) => {
    let helpText = `⚡️ <b>MAKTAB BOT BARCHA BUYRUQLARI:</b>\n\n` +
      `👤 <b>Foydalanuvchi buyruqlari:</b>\n` +
      `🔹 <code>/start</code> — Botni ishga tushirish va asosiy menyu\n` +
      `🔹 <code>/kod M-01</code> — Maktab kodini kiritish va ulanish\n` +
      `🔹 <code>/sinf 11-D</code> — O‘z sinfingizni biriktirish\n` +
      `🔹 <code>/sinf</code> — Sinflar ro‘yxatini ochish\n` +
      `🔹 <code>/hozir</code> — Hozir qaysi dars ketayotganini ko‘rish\n` +
      `🔹 <code>/darsjadvali</code> — Bugungi dars jadvalini olish\n` +
      `🔹 <code>/schedule</code> — Dars jadvalini ko‘rish\n` +
      `🔹 <code>/cods</code> — Barcha buyruqlar ro‘yxati\n\n` +
      `👥 <b>Guruh buyruqlari (Sinf guruhlari uchun):</b>\n` +
      `🔹 <code>/kod M-01 11-D</code> — Guruhni maktab va sinfga ulash <i>(Admin)</i>\n` +
      `🔹 <code>/setclass 11-D</code> — Guruhni sinfga biriktirish <i>(Admin)</i>\n` +
      `🔹 <code>/hozir</code> — Guruhning hozirgi darsini ko‘rish\n` +
      `🔹 <code>/darsjadvali</code> — Guruhning bugungi jadvalini olish\n` +
      `🔹 <code>/resend</code> — Guruhga jadvalni qaytadan yuborish <i>(Admin)</i>\n` +
      `🔹 <code>/settime 06:00</code> — Dars yuborish vaqtini belgilash <i>(Admin)</i>\n`;

    if (ctx.isAdmin) {
      helpText += `\n👑 <b>Tizim Admini buyruqlari:</b>\n` +
        `🔹 <code>/admin</code> — Boshqaruv panelini ochish\n`;
    }

    await ctx.reply(helpText, { parse_mode: 'HTML' });
  });

  // ℹ️ Bot haqida tugmasi
  bot.hears('ℹ️ Bot haqida', async (ctx) => {
    await ctx.reply(BOT_TEXTS.ABOUT, { parse_mode: 'HTML' });
  });
}
