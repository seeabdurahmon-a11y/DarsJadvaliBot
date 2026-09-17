import { InlineKeyboard } from 'grammy';
import { scheduleService } from '../../services/schedule.service.js';
import { schoolsRepo } from '../../database/schools.repo.js';
import { groupsRepo } from '../../database/groups.repo.js';
import { usersRepo } from '../../database/users.repo.js';
import { getClassesGridInlineKeyboard } from '../keyboards/user.keyboard.js';
import { replySafely } from '../../utils/telegram-sender.util.js';
import { escapeHtml } from '../../utils/formatter.js';

export function registerScheduleHandlers(bot) {
  // Yordamchi: Foydalanuvchining biriktirilgan maktabi va sinfini olish
  function getUserContext(telegramId) {
    if (!telegramId) return { user: null, school: null, group: null, schoolId: 1 };
    const user = usersRepo.getUserByTelegramId(telegramId);
    let schoolId = user?.selected_school_id || 1;
    let school = schoolsRepo.getSchoolById(schoolId) || schoolsRepo.getSchoolById(1);
    let group = null;

    if (user?.selected_group_id) {
      group = groupsRepo.getGroupById(user.selected_group_id);
      if (group && !group.is_active) group = null;
    }

    return { user, school, group, schoolId: school?.id || 1 };
  }

  // Yordamchi: Jadval ostiga qo'shiladigan inline tugmalar
  function getScheduleActionKeyboard(groupId, type = 'today') {
    const keyboard = new InlineKeyboard();
    keyboard
      .text('🔄 Boshqa sinf jadvali', `user_other_grp_${type}`)
      .text('🏫 Mening sinfim', 'user_my_class_menu');
    return keyboard;
  }

  // ==========================================
  // 🏫 MENING SINFIM & MAKTABIM BO'LIMI
  // ==========================================

  bot.hears(['🏫 Mening sinfim', 'Mening sinfim', 'Sinfim', 'sinfim', 'sinf'], async (ctx) => {
    if (ctx.chat.type !== 'private') return;

    const { school, group, schoolId } = getUserContext(ctx.from?.id);
    const groups = groupsRepo.getAllGroups(true, schoolId);

    if (group) {
      const keyboard = new InlineKeyboard()
        .text('📅 Bugungi jadval', `user_today_grp_${group.id}`)
        .text('🔔 Hozirgi dars', `user_now_grp_${group.id}`)
        .row()
        .text('📆 Ertangi jadval', `user_tmr_grp_${group.id}`)
        .text('📚 Haftalik jadval', `user_week_grp_${group.id}`)
        .row()
        .text('🔄 Sinfni o‘zgartirish', 'user_change_sinf')
        .text('🔑 Maktabni almashtirish', 'user_change_school');

      return ctx.reply(
        `🏫 <b>Maktab:</b> <b>${escapeHtml(school?.name || 'Maktab')}</b> (Kodi: <code>${school?.code || 'M-01'}</code>)\n` +
        `👥 <b>Sizning sinfingiz:</b> <b>${escapeHtml(group.name)}</b>\n\n` +
        `Dars jadvalini olish uchun quyidagi tugmalardan foydalaning:`,
        { parse_mode: 'HTML', reply_markup: keyboard }
      );
    }

    // Sinf hali tanlanmagan bo'lsa
    const keyboard = getClassesGridInlineKeyboard(groups, 'user_bind_sinf_');
    keyboard.row().text('🔑 Boshqa maktabga ulanish (Kod)', 'user_change_school');

    await ctx.reply(
      `🏫 <b>Maktab:</b> <b>${escapeHtml(school?.name || 'Maktab')}</b> (Kodi: <code>${school?.code || 'M-01'}</code>)\n\n` +
      `Quyidagi ro‘yxatdan o‘z sinfingizni tanlang:`,
      { parse_mode: 'HTML', reply_markup: keyboard }
    );
  });

  // /sinf buyrug'i
  bot.command(['sinf', 'sinfim', 'mysinf', 'myclass', 'tanlash', 'class'], async (ctx) => {
    if (ctx.chat.type !== 'private') return;

    const input = ctx.match?.trim();
    const { school, group, schoolId } = getUserContext(ctx.from?.id);
    const groups = groupsRepo.getAllGroups(true, schoolId);

    // 1. Foydalanuvchi sinf nomini to'g'ridan-to'g'ri yozgan bo'lsa (masalan: /sinf 11-D yoki /sinf 11D)
    if (input) {
      const matchedGroup = groupsRepo.getGroupByName(input, schoolId);
      if (matchedGroup) {
        usersRepo.setSelectedGroup(ctx.from.id, matchedGroup.id, schoolId);

        const keyboard = new InlineKeyboard()
          .text('📅 Bugungi jadval', `user_today_grp_${matchedGroup.id}`)
          .text('🔔 Hozirgi dars', `user_now_grp_${matchedGroup.id}`)
          .row()
          .text('📚 Haftalik jadval', `user_week_grp_${matchedGroup.id}`)
          .text('🔄 Sinfni o‘zgartirish', 'user_change_sinf');

        return ctx.reply(
          `✅ <b>Sinfingiz muvaffaqiyatli saqlandi: ${escapeHtml(matchedGroup.name)}!</b>\n` +
          `🏫 Maktab: <b>${escapeHtml(school?.name || 'Maktab')}</b>\n\n` +
          `📌 Endi pastdagi tugmalardan foydalanganingizda to‘g‘ridan-to‘g‘ri ${escapeHtml(matchedGroup.name)} dars jadvali chiqadi.`,
          { parse_mode: 'HTML', reply_markup: keyboard }
        );
      } else {
        const keyboard = getClassesGridInlineKeyboard(groups, 'user_bind_sinf_');
        return ctx.reply(
          `⚠️ <b>"${escapeHtml(input)}"</b> nomli sinf topilmadi.\n\n` +
          `Iltimos, quyidagi ro‘yxatdan o‘z sinfingizni tanlang:`,
          { parse_mode: 'HTML', reply_markup: keyboard }
        );
      }
    }

    // 2. Parametrsiz chaqirilganda
    if (group) {
      const keyboard = new InlineKeyboard()
        .text('📅 Bugungi jadval', `user_today_grp_${group.id}`)
        .text('🔔 Hozirgi dars', `user_now_grp_${group.id}`)
        .row()
        .text('📚 Haftalik jadval', `user_week_grp_${group.id}`)
        .text('🔄 Sinfni o‘zgartirish', 'user_change_sinf');

      return ctx.reply(
        `🏫 <b>Maktab:</b> ${escapeHtml(school?.name || 'Maktab')}\n` +
        `👥 <b>Sizning sinfingiz:</b> <b>${escapeHtml(group.name)}</b>`,
        { parse_mode: 'HTML', reply_markup: keyboard }
      );
    }

    const keyboard = getClassesGridInlineKeyboard(groups, 'user_bind_sinf_');
    await ctx.reply(
      `🏫 <b>O‘zingiz o‘qiydigan sinfni tanlang:</b>`,
      { parse_mode: 'HTML', reply_markup: keyboard }
    );
  });

  // Callback: Sinfni tanlash (user_bind_sinf_<id>)
  bot.callbackQuery(/^user_bind_sinf_(\d+)$/, async (ctx) => {
    const groupId = parseInt(ctx.match[1], 10);
    const group = groupsRepo.getGroupById(groupId);

    if (!group) {
      return ctx.answerCallbackQuery({ text: 'Sinf topilmadi', show_alert: true });
    }

    usersRepo.setSelectedGroup(ctx.from.id, group.id, group.school_id);
    await ctx.answerCallbackQuery({ text: `✅ ${group.name} saqlandi!` });

    const keyboard = new InlineKeyboard()
      .text('📅 Bugungi jadval', `user_today_grp_${group.id}`)
      .text('🔔 Hozirgi dars', `user_now_grp_${group.id}`)
      .row()
      .text('📚 Haftalik jadval', `user_week_grp_${group.id}`)
      .text('🔄 Boshqa sinfni tanlash', 'user_change_sinf');

    await ctx.editMessageText(
      `✅ <b>Sinfingiz muvaffaqiyatli biriktirildi: ${escapeHtml(group.name)}</b>\n\n` +
      `🎉 Endi bot menyu tugmalari orqali to‘g‘ridan-to‘g‘ri o‘z sinfingiz dars jadvalini ko‘rishingiz mumkin!`,
      { parse_mode: 'HTML', reply_markup: keyboard }
    );
  });

  // Callback: Sinfni o'zgartirish (user_change_sinf)
  bot.callbackQuery('user_change_sinf', async (ctx) => {
    await ctx.answerCallbackQuery().catch(() => {});
    const { schoolId } = getUserContext(ctx.from?.id);
    const groups = groupsRepo.getAllGroups(true, schoolId);
    const keyboard = getClassesGridInlineKeyboard(groups, 'user_bind_sinf_');

    await ctx.editMessageText(
      `🔄 <b>Yangi sinfni tanlang:</b>\n\n` +
      `Quyidagi ro‘yxatdan o‘z sinfingizni tanlang:`,
      { parse_mode: 'HTML', reply_markup: keyboard }
    );
  });

  // Callback: Maktabni almashtirish (user_change_school)
  bot.callbackQuery('user_change_school', async (ctx) => {
    await ctx.answerCallbackQuery().catch(() => {});
    const schools = schoolsRepo.getAllSchools(true);

    const keyboard = new InlineKeyboard();
    schools.forEach((s, idx) => {
      keyboard.text(`🏫 ${s.name} (${s.code})`, `user_select_sch_${s.id}`);
      keyboard.row();
    });

    await ctx.editMessageText(
      `🔑 <b>Maktabingizni tanlang yoki kodini kiriting:</b>\n\n` +
      `Kodni to‘g‘ridan-to‘g‘ri yozish uchun: <code>/kod M-01</code> yoki <code>/kod M-12</code> deb yuboring.\n\nYoki quyidagi ro‘yxatdan tanlang:`,
      { parse_mode: 'HTML', reply_markup: keyboard }
    );
  });

  // Callback: Maktab tanlanganda (user_select_sch_<id>)
  bot.callbackQuery(/^user_select_sch_(\d+)$/, async (ctx) => {
    const schoolId = parseInt(ctx.match[1], 10);
    const school = schoolsRepo.getSchoolById(schoolId);

    if (!school) {
      return ctx.answerCallbackQuery({ text: 'Maktab topilmadi', show_alert: true });
    }

    usersRepo.setSelectedSchool(ctx.from.id, school.id);
    await ctx.answerCallbackQuery({ text: `✅ ${school.name} tanlandi!` });

    const classes = groupsRepo.getAllGroups(true, school.id);
    const keyboard = getClassesGridInlineKeyboard(classes, 'user_bind_sinf_');

    await ctx.editMessageText(
      `✅ <b>Maktab tanlandi: ${escapeHtml(school.name)} (Kodi: ${school.code})</b>\n\n` +
      `Endi o‘z sinfingizni tanlang:`,
      { parse_mode: 'HTML', reply_markup: keyboard }
    );
  });

  // Callback: Mening sinfim bosh menyusi (user_my_class_menu)
  bot.callbackQuery('user_my_class_menu', async (ctx) => {
    await ctx.answerCallbackQuery().catch(() => {});
    const { school, group, schoolId } = getUserContext(ctx.from?.id);
    const groups = groupsRepo.getAllGroups(true, schoolId);

    if (group) {
      const keyboard = new InlineKeyboard()
        .text('📅 Bugungi jadval', `user_today_grp_${group.id}`)
        .text('🔔 Hozirgi dars', `user_now_grp_${group.id}`)
        .row()
        .text('📆 Ertangi jadval', `user_tmr_grp_${group.id}`)
        .text('📚 Haftalik jadval', `user_week_grp_${group.id}`)
        .row()
        .text('🔄 Sinfni o‘zgartirish', 'user_change_sinf')
        .text('🔑 Maktabni almashtirish', 'user_change_school');

      return ctx.editMessageText(
        `🏫 <b>Maktab:</b> ${escapeHtml(school?.name || 'Maktab')} (Kodi: <code>${school?.code || 'M-01'}</code>)\n` +
        `👥 <b>Sizning sinfingiz:</b> <b>${escapeHtml(group.name)}</b>`,
        { parse_mode: 'HTML', reply_markup: keyboard }
      );
    }

    const keyboard = getClassesGridInlineKeyboard(groups, 'user_bind_sinf_');
    await ctx.editMessageText(
      `🏫 <b>O‘zingiz o‘qiydigan sinfni tanlang:</b>`,
      { parse_mode: 'HTML', reply_markup: keyboard }
    );
  });

  // Callback: Boshqa sinf jadvalini ko'rish ro'yxati (user_other_grp_<type>)
  bot.callbackQuery(/^user_other_grp_(now|today|tmr|week)$/, async (ctx) => {
    await ctx.answerCallbackQuery().catch(() => {});
    const type = ctx.match[1];
    const { schoolId } = getUserContext(ctx.from?.id);
    const groups = groupsRepo.getAllGroups(true, schoolId);
    const keyboard = getClassesGridInlineKeyboard(groups, `user_${type}_grp_`, true);

    await ctx.editMessageText(
      `👥 <b>Qaysi sinf jadvalini ko‘rmoqchisiz?</b>\n\n` +
      `Ro‘yxatdan kerakli sinfni tanlang:`,
      { parse_mode: 'HTML', reply_markup: keyboard }
    );
  });

  // ==========================================
  // 🔔 HOZIRGI DARS
  // ==========================================

  bot.hears(['🔔 Hozirgi dars', 'Hozirgi dars', 'hozir'], async (ctx) => {
    if (ctx.chat.type !== 'private') return;

    const { group, schoolId } = getUserContext(ctx.from?.id);
    if (group) {
      const { formattedText } = scheduleService.getCurrentLesson(group.id);
      return replySafely(ctx, formattedText, { reply_markup: getScheduleActionKeyboard(group.id, 'now') });
    }

    const groups = groupsRepo.getAllGroups(true, schoolId);
    if (groups.length > 1) {
      const keyboard = getClassesGridInlineKeyboard(groups, 'user_now_grp_', true);
      return ctx.reply(
        `👥 <b>Qaysi sinf bo‘yicha hozirgi darsni ko‘rmoqchisiz?</b>\n\n` +
        `💡 <i>Kelgusida avtomatik chiqishi uchun <b>🏫 Mening sinfim</b> bo‘limidan o‘z sinfingizni biriktirib oling.</i>`,
        { parse_mode: 'HTML', reply_markup: keyboard }
      );
    }

    const groupId = groups.length === 1 ? groups[0].id : null;
    const { formattedText } = scheduleService.getCurrentLesson(groupId);
    await replySafely(ctx, formattedText);
  });

  bot.command(['hozir', 'now', 'current', 'hozirgidars'], async (ctx) => {
    if (ctx.chat.type !== 'private') return;

    const { group, schoolId } = getUserContext(ctx.from?.id);
    if (group) {
      const { formattedText } = scheduleService.getCurrentLesson(group.id);
      return replySafely(ctx, formattedText, { reply_markup: getScheduleActionKeyboard(group.id, 'now') });
    }

    const groups = groupsRepo.getAllGroups(true, schoolId);
    const keyboard = getClassesGridInlineKeyboard(groups, 'user_now_grp_', true);
    return ctx.reply(`👥 <b>Qaysi sinf bo‘yicha hozirgi darsni ko‘rmoqchisiz?</b>`, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  });

  // ==========================================
  // 📅 BUGUNGI JADVAL
  // ==========================================

  bot.hears('📅 Bugungi jadval', async (ctx) => {
    if (ctx.chat.type !== 'private') return;

    const { group, schoolId } = getUserContext(ctx.from?.id);
    if (group) {
      const { formattedText } = scheduleService.getTodaySchedule(group.id);
      return replySafely(ctx, formattedText, { reply_markup: getScheduleActionKeyboard(group.id, 'today') });
    }

    const groups = groupsRepo.getAllGroups(true, schoolId);
    if (groups.length > 1) {
      const keyboard = getClassesGridInlineKeyboard(groups, 'user_today_grp_', true);
      return ctx.reply(
        `👥 <b>Qaysi sinf bo‘yicha bugungi dars jadvalini ko‘rmoqchisiz?</b>\n\n` +
        `💡 <i>Sinfingizni biriktirib olish uchun <b>🏫 Mening sinfim</b> tugmasidan foydalaning.</i>`,
        { parse_mode: 'HTML', reply_markup: keyboard }
      );
    }

    const groupId = groups.length === 1 ? groups[0].id : null;
    const { formattedText } = scheduleService.getTodaySchedule(groupId);
    await replySafely(ctx, formattedText);
  });

  // ==========================================
  // 📆 ERTANGI JADVAL
  // ==========================================

  bot.hears('📆 Ertangi jadval', async (ctx) => {
    if (ctx.chat.type !== 'private') return;

    const { group, schoolId } = getUserContext(ctx.from?.id);
    if (group) {
      const { formattedText } = scheduleService.getTomorrowSchedule(group.id);
      return replySafely(ctx, formattedText, { reply_markup: getScheduleActionKeyboard(group.id, 'tmr') });
    }

    const groups = groupsRepo.getAllGroups(true, schoolId);
    const keyboard = getClassesGridInlineKeyboard(groups, 'user_tmr_grp_', true);
    return ctx.reply(`👥 <b>Qaysi sinf bo‘yicha ertangi dars jadvalini ko‘rmoqchisiz?</b>`, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  });

  // ==========================================
  // 📚 HAFTALIK JADVAL
  // ==========================================

  bot.hears('📚 Haftalik jadval', async (ctx) => {
    if (ctx.chat.type !== 'private') return;

    const { group, schoolId } = getUserContext(ctx.from?.id);
    if (group) {
      const { formattedText } = scheduleService.getWeeklySchedule(group.id);
      return replySafely(ctx, formattedText, { reply_markup: getScheduleActionKeyboard(group.id, 'week') });
    }

    const groups = groupsRepo.getAllGroups(true, schoolId);
    const keyboard = getClassesGridInlineKeyboard(groups, 'user_week_grp_', true);
    return ctx.reply(`👥 <b>Qaysi sinf bo‘yicha haftalik dars jadvalini ko‘rmoqchisiz?</b>`, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  });

  // ==========================================
  // 🎯 INLINE CALLBACKS (Jadvallar)
  // ==========================================

  bot.callbackQuery(/^user_now_grp_(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery().catch(() => {});
    const param = ctx.match[1];
    const groupId = param === 'all' ? null : parseInt(param, 10);
    const { formattedText } = scheduleService.getCurrentLesson(groupId);
    await replySafely(ctx, formattedText, { reply_markup: groupId ? getScheduleActionKeyboard(groupId, 'now') : undefined });
  });

  bot.callbackQuery(/^user_today_grp_(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery().catch(() => {});
    const param = ctx.match[1];
    const groupId = param === 'all' ? null : parseInt(param, 10);
    const { formattedText } = scheduleService.getTodaySchedule(groupId);
    await replySafely(ctx, formattedText, { reply_markup: groupId ? getScheduleActionKeyboard(groupId, 'today') : undefined });
  });

  bot.callbackQuery(/^user_tmr_grp_(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery().catch(() => {});
    const param = ctx.match[1];
    const groupId = param === 'all' ? null : parseInt(param, 10);
    const { formattedText } = scheduleService.getTomorrowSchedule(groupId);
    await replySafely(ctx, formattedText, { reply_markup: groupId ? getScheduleActionKeyboard(groupId, 'tmr') : undefined });
  });

  bot.callbackQuery(/^user_week_grp_(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery().catch(() => {});
    const param = ctx.match[1];
    const groupId = param === 'all' ? null : parseInt(param, 10);
    const { formattedText } = scheduleService.getWeeklySchedule(groupId);
    await replySafely(ctx, formattedText, { reply_markup: groupId ? getScheduleActionKeyboard(groupId, 'week') : undefined });
  });
}
