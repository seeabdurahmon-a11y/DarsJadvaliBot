import { InlineKeyboard } from 'grammy';
import { schoolsRepo } from '../../database/schools.repo.js';
import { groupsRepo } from '../../database/groups.repo.js';
import { usersRepo } from '../../database/users.repo.js';
import { scheduleService } from '../../services/schedule.service.js';
import { adminService } from '../../services/admin.service.js';
import { isValidTimeFormat } from '../../utils/date.util.js';
import { getClassesGridInlineKeyboard } from '../keyboards/user.keyboard.js';
import { escapeHtml } from '../../utils/formatter.js';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

async function canManageGroup(ctx) {
  if (ctx.isAdmin) return true;
  if (!ctx.from?.id || !ctx.chat?.id) return false;
  try {
    const member = await ctx.getChatMember(ctx.from.id);
    return ['creator', 'administrator'].includes(member.status);
  } catch (e) {
    return false;
  }
}

export function registerGroupHandlers(bot) {
  // Bot guruhga qo'shilganda maktab/sinfni so'rash
  bot.on('my_chat_member', async (ctx) => {
    const status = ctx.myChatMember.new_chat_member.status;
    const chat = ctx.chat;

    if (['member', 'administrator'].includes(status)) {
      if (chat.type === 'group' || chat.type === 'supergroup') {
        const schools = schoolsRepo.getAllSchools(true);

        logger.info(`[GROUP JOIN] Bot yangi guruhga qo'shildi: ${chat.title || 'Guruh'} (${chat.id})`);

        const keyboard = new InlineKeyboard();
        schools.forEach((s) => {
          keyboard.text(`🏫 ${s.name} (${s.code})`, `grp_school_${s.id}`);
          keyboard.row();
        });

        await ctx.reply(
          `🎉 <b>MAKTAB dars jadvali boti guruhga muvaffaqiyatli qo‘shildi!</b>\n\n` +
          `🏫 <b>Ushbu guruh qaysi maktab va sinfga tegishli?</b>\n\n` +
          `Guruhni biriktirish uchun maktab va sinf kodini yozing:\n` +
          `Masalan: <code>/kod M-01 11-D</code> yoki <code>/setclass 11-D</code>\n\n` +
          `Yoki quyidagi ro‘yxatdan maktabingizni tanlang:`,
          { parse_mode: 'HTML', reply_markup: keyboard }
        );
      }
    }
  });

  // Callback: Guruh uchun maktab tanlanganda (grp_school_<id>)
  bot.callbackQuery(/^grp_school_(\d+)$/, async (ctx) => {
    const allowed = await canManageGroup(ctx);
    if (!allowed) {
      return ctx.answerCallbackQuery({ text: '⛔ Faqat guruh adminlari bajara oladi', show_alert: true });
    }

    const schoolId = parseInt(ctx.match[1], 10);
    const school = schoolsRepo.getSchoolById(schoolId);
    if (!school) return ctx.answerCallbackQuery({ text: 'Maktab topilmadi' });

    const classes = groupsRepo.getAllGroups(true, school.id);
    const keyboard = getClassesGridInlineKeyboard(classes, 'bind_class_');

    await ctx.answerCallbackQuery({ text: `Maktab: ${school.name}` });
    await ctx.editMessageText(
      `🏫 <b>Tanlangan maktab:</b> <b>${escapeHtml(school.name)}</b> (Kodi: <code>${school.code}</code>)\n\n` +
      `Endi quyidagi ro‘yxatdan ushbu guruh tegishli bo‘lgan <b>sinfni</b> tanlang:`,
      { parse_mode: 'HTML', reply_markup: keyboard }
    );
  });

  // /kod [MAKTAB_KODI] [SINF] buyrug'i guruh ichida
  bot.command(['kod', 'code'], async (ctx) => {
    if (ctx.chat.type === 'private') return; // Handled in start.handler for PM

    const allowed = await canManageGroup(ctx);
    if (!allowed) {
      return ctx.reply('⛔ Faqat guruh adminlari ushbu guruhni maktabga biriktirishi mumkin.');
    }

    const matchText = ctx.match?.trim();
    if (!matchText) {
      const schools = schoolsRepo.getAllSchools(true);
      const keyboard = new InlineKeyboard();
      schools.forEach((s) => {
        keyboard.text(`🏫 ${s.name} (${s.code})`, `grp_school_${s.id}`);
        keyboard.row();
      });

      return ctx.reply(
        `🏫 <b>Guruhni maktab va sinfga biriktirish:</b>\n\n` +
        `Quyidagi formatda yozing:\n<code>/kod M-01 11-D</code>\n\n` +
        `Yoki maktabni tanlang:`,
        { parse_mode: 'HTML', reply_markup: keyboard }
      );
    }

    const parts = matchText.split(/\s+/);
    const schoolCode = parts[0];
    const className = parts.slice(1).join(' ');

    const school = schoolsRepo.getSchoolByCode(schoolCode);
    if (!school) {
      return ctx.reply(`⚠️ <b>"${escapeHtml(schoolCode)}"</b> kodli maktab topilmadi.`);
    }

    if (!className) {
      const classes = groupsRepo.getAllGroups(true, school.id);
      const keyboard = getClassesGridInlineKeyboard(classes, 'bind_class_');
      return ctx.reply(
        `🏫 <b>Maktab: ${escapeHtml(school.name)} (Kodi: ${school.code})</b>\n\n` +
        `Endi ushbu guruh tegishli bo‘lgan sinfni tanlang:`,
        { parse_mode: 'HTML', reply_markup: keyboard }
      );
    }

    const boundClass = groupsRepo.bindChatToClass(className, ctx.chat.id, school.id);
    if (boundClass) {
      return ctx.reply(
        `✅ <b>GURUH MUVAFFAQIYATLI BIRIKTIRILDI!</b>\n\n` +
        `🏫 <b>Maktab:</b> ${escapeHtml(school.name)} (Kodi: <code>${school.code}</code>)\n` +
        `👥 <b>Sinf:</b> <b>${escapeHtml(boundClass.name)}</b>\n` +
        `🆔 <b>Guruh Chat ID:</b> <code>${ctx.chat.id}</code>\n` +
        `⏰ <b>Avtomatik dars yuborish:</b> Har kuni soat <b>${boundClass.send_time}</b> da\n\n` +
        `📖 <i>Dars jadvalini olish:</i> <code>/darsjadvali</code> yoki <code>/resend</code>`,
        { parse_mode: 'HTML' }
      );
    } else {
      const classes = groupsRepo.getAllGroups(true, school.id);
      const keyboard = getClassesGridInlineKeyboard(classes, 'bind_class_');
      return ctx.reply(
        `⚠️ <b>${escapeHtml(school.name)}</b> maktabida "${escapeHtml(className)}" nomli sinf topilmadi.\n\n` +
        `Quyidagi mavjud sinflardan birini tanlang:`,
        { parse_mode: 'HTML', reply_markup: keyboard }
      );
    }
  });

  // /setclass, /bind, /addgroup buyruqlari
  bot.command(['setclass', 'bind', 'addgroup'], async (ctx) => {
    const input = ctx.match?.trim();

    if (ctx.chat.type === 'private') {
      if (input) {
        const user = usersRepo.getUserByTelegramId(ctx.from.id);
        const schoolId = user?.selected_school_id || 1;
        const matched = groupsRepo.getGroupByName(input, schoolId);
        if (matched) {
          usersRepo.setSelectedGroup(ctx.from.id, matched.id, schoolId);
          return ctx.reply(
            `✅ <b>Sinfingiz muvaffaqiyatli saqlandi: ${escapeHtml(matched.name)}!</b>\n\n` +
            `📌 Endi menyu tugmalaridan foydalanganingizda to‘g‘ridan-to‘g‘ri ${escapeHtml(matched.name)} dars jadvali chiqadi.`,
            { parse_mode: 'HTML' }
          );
        }
      }

      const user = usersRepo.getUserByTelegramId(ctx.from.id);
      const schoolId = user?.selected_school_id || 1;
      const groups = groupsRepo.getAllGroups(true, schoolId);
      const keyboard = getClassesGridInlineKeyboard(groups, 'user_bind_sinf_');
      return ctx.reply(
        `🏫 <b>O‘z sinfingizni tanlang:</b>`,
        { parse_mode: 'HTML', reply_markup: keyboard }
      );
    }

    const allowed = await canManageGroup(ctx);
    if (!allowed) {
      return ctx.reply('⛔ Faqat guruh adminlari ushbu guruhni sinfga biriktirishi mumkin.');
    }

    // Guruhning joriy maktabini aniqlaymiz
    const currentGroup = groupsRepo.getGroupByChatId(ctx.chat.id);
    const schoolId = currentGroup?.school_id || 1;
    const school = schoolsRepo.getSchoolById(schoolId) || schoolsRepo.getSchoolById(1);

    if (input) {
      const boundClass = groupsRepo.bindChatToClass(input, ctx.chat.id, schoolId);
      if (boundClass) {
        return ctx.reply(
          `✅ <b>GURUH MUVAFFAQIYATLI BIRIKTIRILDI!</b>\n\n` +
          `🏫 <b>Maktab:</b> ${escapeHtml(school?.name || 'Maktab')} (Kodi: <code>${school?.code || 'M-01'}</code>)\n` +
          `👥 <b>Sinf:</b> <b>${escapeHtml(boundClass.name)}</b>\n` +
          `🆔 <b>Guruh Chat ID:</b> <code>${ctx.chat.id}</code>\n` +
          `⏰ <b>Avtomatik dars yuborish:</b> Har kuni soat <b>${boundClass.send_time}</b> da\n\n` +
          `📖 <i>Dars jadvalini olish:</i> <code>/darsjadvali</code> yoki <code>/resend</code>`,
          { parse_mode: 'HTML' }
        );
      }
    }

    const classes = groupsRepo.getAllGroups(true, schoolId);
    const keyboard = getClassesGridInlineKeyboard(classes, 'bind_class_');

    await ctx.reply(
      `🏫 <b>Maktab: ${escapeHtml(school?.name || 'Maktab')} (Kodi: ${school?.code || 'M-01'})</b>\n\n` +
      `Ushbu Telegram guruh qaysi sinfga tegishli? Quyidan tanlang yoki <code>/setclass 11-D</code> deb yozing:`,
      { parse_mode: 'HTML', reply_markup: keyboard }
    );
  });

  // Callback query: bind_class_<id> (Guruh uchun)
  bot.callbackQuery(/^bind_class_(\d+)$/, async (ctx) => {
    if (ctx.chat?.type === 'private') {
      const classId = parseInt(ctx.match[1], 10);
      const boundClass = groupsRepo.getGroupById(classId);
      if (boundClass) {
        usersRepo.setSelectedGroup(ctx.from.id, boundClass.id, boundClass.school_id);
        await ctx.answerCallbackQuery({ text: `✅ Sinf saqlandi: ${boundClass.name}` });
        return ctx.editMessageText(
          `✅ <b>Sizning sinfingiz muvaffaqiyatli saqlandi: ${escapeHtml(boundClass.name)}</b>\n\n` +
          `🎉 Endi bot menyu tugmalari orqali to‘g‘ridan-to‘g‘ri darslaringizni ko‘rishingiz mumkin!`,
          { parse_mode: 'HTML' }
        );
      }
    }

    const allowed = await canManageGroup(ctx);
    if (!allowed) {
      return ctx.answerCallbackQuery({ text: '⛔ Faqat guruh adminlari bajara oladi', show_alert: true });
    }

    const classId = parseInt(ctx.match[1], 10);
    const boundClass = groupsRepo.bindChatToClass(classId, ctx.chat.id);

    await ctx.answerCallbackQuery({ text: `✅ Sinf biriktirildi: ${boundClass?.name}` });

    if (boundClass) {
      const school = schoolsRepo.getSchoolById(boundClass.school_id);
      await ctx.editMessageText(
        `✅ <b>GURUH MUVAFFAQIYATLI BIRIKTIRILDI!</b>\n\n` +
        `🏫 <b>Maktab:</b> ${escapeHtml(school?.name || 'Maktab')} (Kodi: <code>${school?.code || 'M-01'}</code>)\n` +
        `👥 <b>Mahkamlangan sinf:</b> <b>${escapeHtml(boundClass.name)}</b>\n` +
        `🆔 <b>Guruh Chat ID:</b> <code>${ctx.chat.id}</code>\n` +
        `⏰ <b>Avtomatik dars yuborish:</b> Har kuni soat <b>${boundClass.send_time}</b> da\n\n` +
        `📖 <i>Dars jadvalini olish:</i> <code>/darsjadvali</code> yoki <code>/resend</code>`,
        { parse_mode: 'HTML' }
      );
    }
  });

  // /settime <HH:mm> buyrug'i
  bot.command('settime', async (ctx) => {
    if (ctx.chat.type === 'private') {
      return ctx.reply('ℹ️ Guruhning dars yuborish vaqtini o\'rnatish uchun guruh ichida yozing: <code>/settime 06:00</code>', { parse_mode: 'HTML' });
    }

    const allowed = await canManageGroup(ctx);
    if (!allowed) {
      return ctx.reply('⛔ Faqat guruh adminlari yuborish vaqtini o\'zgartirishi mumkin.');
    }

    const text = ctx.match?.trim();
    if (!text || !isValidTimeFormat(text)) {
      return ctx.reply('⚠️ Noto\'g\'ri vaqt formati. Iltimos quyidagi formatda yozing:\n<code>/settime 06:00</code> yoki <code>/settime 07:30</code>', { parse_mode: 'HTML' });
    }

    const group = groupsRepo.getGroupByChatId(ctx.chat.id);
    if (!group) {
      groupsRepo.addGroup({
        telegram_chat_id: ctx.chat.id,
        name: ctx.chat.title || `Sinf ${ctx.chat.id}`,
        send_time: text
      });
    } else {
      groupsRepo.setGroupSendTime(group.id, text);
    }

    await ctx.reply(
      `✅ <b>Yuborish vaqti muvaffaqiyatli o'zgartirildi!</b>\n\n` +
      `⏰ Endi har kuni soat <b>${text}</b> da dars jadvali guruhga avtomatik yuboriladi.`,
      { parse_mode: 'HTML' }
    );
  });

  // /resend, /send, /sendjadval, /tashlash, /qaytadan buyruqlari
  bot.command(['resend', 'send', 'sendjadval', 'tashlash', 'qaytadan', 'post'], async (ctx) => {
    if (ctx.chat.type === 'private') {
      return ctx.reply('ℹ️ Guruhga dars jadvalini qaytadan yuborish uchun guruh ichida yozing: <code>/resend</code>', { parse_mode: 'HTML' });
    }

    const allowed = await canManageGroup(ctx);
    if (!allowed) {
      return ctx.reply('⛔ Faqat guruh adminlari dars jadvalini qaytadan yuborishi mumkin. Istalgan a\'zo esa <code>/darsjadvali</code> deb yozishi mumkin.');
    }

    const group = groupsRepo.getGroupByChatId(ctx.chat.id);

    if (!group) {
      const schools = schoolsRepo.getAllSchools(true);
      const keyboard = new InlineKeyboard();
      schools.forEach((s) => {
        keyboard.text(`🏫 ${s.name} (${s.code})`, `grp_school_${s.id}`);
        keyboard.row();
      });

      return ctx.reply(
        `⚠️ <b>Ushbu guruh hali biror maktab va sinfga biriktirilmagan!</b>\n\n` +
        `Iltimos, guruhni biriktirish uchun <code>/kod M-01 11-D</code> deb yozing yoki maktabni tanlang:`,
        { parse_mode: 'HTML', reply_markup: keyboard }
      );
    }

    const res = await adminService.sendTodayScheduleToGroup(bot, group, { force: true });
    if (res.success) {
      logger.info(`[MANUAL RESEND] ${ctx.from?.id} tomonidan ${group.name} guruhiga dars jadvali qaytadan tashlandi.`);
    } else {
      await ctx.reply(`⚠️ Dars jadvalini yuborishda xatolik yuz berdi: ${res.error || 'Noma\'lum xatolik'}`);
    }
  });

  // /darsjadvali, /jadval, /schedule, /today buyruqlari guruh ichida
  bot.command(['darsjadvali', 'jadval', 'schedule', 'today'], async (ctx) => {
    if (ctx.chat.type === 'private') return;

    const group = groupsRepo.getGroupByChatId(ctx.chat.id);

    if (!group) {
      return ctx.reply(
        `⚠️ <b>Ushbu guruh hali biror sinfga biriktirilmagan!</b>\n\n` +
        `Iltimos, dars jadvalini olish uchun <code>/kod M-01 11-D</code> yoki <code>/setclass 11-D</code> deb yozing:`,
        { parse_mode: 'HTML' }
      );
    }

    const { formattedText } = scheduleService.getTodaySchedule(group.id);
    await ctx.reply(formattedText, { parse_mode: 'HTML' });
  });

  // /hozir, /now, /current, /hozirgidars buyruqlari guruh ichida
  bot.command(['hozir', 'now', 'current', 'hozirgidars'], async (ctx) => {
    if (ctx.chat.type === 'private') return;

    const group = groupsRepo.getGroupByChatId(ctx.chat.id);

    if (!group) {
      return ctx.reply(
        `⚠️ <b>Ushbu guruh hali biror sinfga biriktirilmagan!</b>\n\n` +
        `Iltimos, <code>/kod M-01 11-D</code> yoki <code>/setclass 11-D</code> deb yozing:`,
        { parse_mode: 'HTML' }
      );
    }

    const { formattedText } = scheduleService.getCurrentLesson(group.id);
    await ctx.reply(formattedText, { parse_mode: 'HTML' });
  });
}
