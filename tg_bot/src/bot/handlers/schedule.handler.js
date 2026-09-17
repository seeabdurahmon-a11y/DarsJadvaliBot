import { InlineKeyboard } from 'grammy';
import { scheduleService } from '../../services/schedule.service.js';
import { groupsRepo } from '../../database/groups.repo.js';
import { usersRepo } from '../../database/users.repo.js';
import { getClassesGridInlineKeyboard } from '../keyboards/user.keyboard.js';
import { replySafely } from '../../utils/telegram-sender.util.js';
import { escapeHtml } from '../../utils/formatter.js';

export function registerScheduleHandlers(bot) {
  // Yordamchi: Foydalanuvchining biriktirilgan sinfini olish
  function getUserGroup(telegramId) {
    if (!telegramId) return null;
    const user = usersRepo.getUserByTelegramId(telegramId);
    if (user && user.selected_group_id) {
      const group = groupsRepo.getGroupById(user.selected_group_id);
      if (group && group.is_active) {
        return group;
      }
    }
    return null;
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
  // 🏫 MENING SINFIM / SINF BIRIKTIRISH BO'LIMI
  // ==========================================

  // "🏫 Mening sinfim" menyu tugmasi va buyruqlar
  bot.hears(['🏫 Mening sinfim', 'Mening sinfim', 'Sinfim', 'sinfim', 'sinf'], async (ctx) => {
    if (ctx.chat.type !== 'private') return;

    const group = getUserGroup(ctx.from?.id);
    const groups = groupsRepo.getAllGroups(true);

    if (group) {
      const keyboard = new InlineKeyboard()
        .text('📅 Bugungi jadval', `user_today_grp_${group.id}`)
        .text('🔔 Hozirgi dars', `user_now_grp_${group.id}`)
        .row()
        .text('📆 Ertangi jadval', `user_tmr_grp_${group.id}`)
        .text('📚 Haftalik jadval', `user_week_grp_${group.id}`)
        .row()
        .text('🔄 Sinfni o‘zgartirish', 'user_change_sinf');

      return ctx.reply(
        `🏫 <b>Sizning biriktirilgan sinfingiz:</b> <b>${escapeHtml(group.name)}</b>\n\n` +
        `Dars jadvalini olish uchun quyidagi tugmalardan birini tanlang yoki sinfingizni o‘zgartiring:`,
        { parse_mode: 'HTML', reply_markup: keyboard }
      );
    }

    // Sinf hali tanlanmagan bo'lsa
    const keyboard = getClassesGridInlineKeyboard(groups, 'user_bind_sinf_');
    await ctx.reply(
      `🏫 <b>O‘zingiz o‘qiydigan yoki qiziqqan sinfni tanlang:</b>\n\n` +
      `💡 <i>Sinfingizni biriktirib qo‘ysangiz, bot sizga har doim to‘g‘ridan-to‘g‘ri o‘z sinfingiz dars jadvalini taqdim etadi.</i>`,
      { parse_mode: 'HTML', reply_markup: keyboard }
    );
  });

  // /sinf, /sinfim, /mysinf, /myclass, /tanlash buyruqlari
  bot.command(['sinf', 'sinfim', 'mysinf', 'myclass', 'tanlash', 'class'], async (ctx) => {
    if (ctx.chat.type !== 'private') return;

    const input = ctx.match?.trim();
    const groups = groupsRepo.getAllGroups(true);

    // 1. Foydalanuvchi to'g'ridan-to'g'ri sinf nomini yozgan bo'lsa (masalan: /sinf 11-D yoki /sinf 11D)
    if (input) {
      const matchedGroup = groupsRepo.getGroupByName(input);
      if (matchedGroup) {
        usersRepo.setSelectedGroup(ctx.from.id, matchedGroup.id);

        const keyboard = new InlineKeyboard()
          .text('📅 Bugungi jadval', `user_today_grp_${matchedGroup.id}`)
          .text('🔔 Hozirgi dars', `user_now_grp_${matchedGroup.id}`)
          .row()
          .text('📚 Haftalik jadval', `user_week_grp_${matchedGroup.id}`)
          .text('🔄 Sinfni o‘zgartirish', 'user_change_sinf');

        return ctx.reply(
          `✅ <b>Sinfingiz muvaffaqiyatli saqlandi: ${escapeHtml(matchedGroup.name)}!</b>\n\n` +
          `📌 Endi pastdagi <b>📅 Bugungi jadval</b> yoki <b>🔔 Hozirgi dars</b> tugmalarini bosganingizda to‘g‘ridan-to‘g‘ri ${escapeHtml(matchedGroup.name)} darslari ko‘rsatiladi.`,
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
    const group = getUserGroup(ctx.from?.id);
    if (group) {
      const keyboard = new InlineKeyboard()
        .text('📅 Bugungi jadval', `user_today_grp_${group.id}`)
        .text('🔔 Hozirgi dars', `user_now_grp_${group.id}`)
        .row()
        .text('📚 Haftalik jadval', `user_week_grp_${group.id}`)
        .text('🔄 Sinfni o‘zgartirish', 'user_change_sinf');

      return ctx.reply(
        `🏫 <b>Sizning biriktirilgan sinfingiz:</b> <b>${escapeHtml(group.name)}</b>\n\n` +
        `Quyidagi tugmalardan birini tanlang:`,
        { parse_mode: 'HTML', reply_markup: keyboard }
      );
    }

    const keyboard = getClassesGridInlineKeyboard(groups, 'user_bind_sinf_');
    await ctx.reply(
      `🏫 <b>O‘zingiz o‘qiydigan sinfni tanlang:</b>\n\n` +
      `Quyidagi ro‘yxatdan sinfingiz ustiga bosing:`,
      { parse_mode: 'HTML', reply_markup: keyboard }
    );
  });

  // Callback: Sinfni tanlash / biriktirish (user_bind_sinf_<id>)
  bot.callbackQuery(/^user_bind_sinf_(\d+)$/, async (ctx) => {
    const groupId = parseInt(ctx.match[1], 10);
    const group = groupsRepo.getGroupById(groupId);

    if (!group) {
      return ctx.answerCallbackQuery({ text: 'Sinf topilmadi', show_alert: true });
    }

    usersRepo.setSelectedGroup(ctx.from.id, group.id);
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
    const groups = groupsRepo.getAllGroups(true);
    const keyboard = getClassesGridInlineKeyboard(groups, 'user_bind_sinf_');

    await ctx.editMessageText(
      `🔄 <b>Yangi sinfni tanlang:</b>\n\n` +
      `Quyidagi ro‘yxatdan o‘z sinfingizni tanlang:`,
      { parse_mode: 'HTML', reply_markup: keyboard }
    );
  });

  // Callback: Mening sinfim bosh menyusi (user_my_class_menu)
  bot.callbackQuery('user_my_class_menu', async (ctx) => {
    await ctx.answerCallbackQuery().catch(() => {});
    const group = getUserGroup(ctx.from?.id);
    const groups = groupsRepo.getAllGroups(true);

    if (group) {
      const keyboard = new InlineKeyboard()
        .text('📅 Bugungi jadval', `user_today_grp_${group.id}`)
        .text('🔔 Hozirgi dars', `user_now_grp_${group.id}`)
        .row()
        .text('📆 Ertangi jadval', `user_tmr_grp_${group.id}`)
        .text('📚 Haftalik jadval', `user_week_grp_${group.id}`)
        .row()
        .text('🔄 Sinfni o‘zgartirish', 'user_change_sinf');

      return ctx.editMessageText(
        `🏫 <b>Sizning biriktirilgan sinfingiz:</b> <b>${escapeHtml(group.name)}</b>\n\n` +
        `Quyidagi tugmalardan birini tanlang:`,
        { parse_mode: 'HTML', reply_markup: keyboard }
      );
    }

    const keyboard = getClassesGridInlineKeyboard(groups, 'user_bind_sinf_');
    await ctx.editMessageText(
      `🏫 <b>O‘zingiz o‘qiydigan sinfni tanlang:</b>\n\n` +
      `Quyidagi ro‘yxatdan sinfingiz ustiga bosing:`,
      { parse_mode: 'HTML', reply_markup: keyboard }
    );
  });

  // Callback: Boshqa sinf jadvalini ko'rish ro'yxati (user_other_grp_<type>)
  bot.callbackQuery(/^user_other_grp_(now|today|tmr|week)$/, async (ctx) => {
    await ctx.answerCallbackQuery().catch(() => {});
    const type = ctx.match[1];
    const groups = groupsRepo.getAllGroups(true);
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

    const userGroup = getUserGroup(ctx.from?.id);
    if (userGroup) {
      const { formattedText } = scheduleService.getCurrentLesson(userGroup.id);
      return replySafely(ctx, formattedText, { reply_markup: getScheduleActionKeyboard(userGroup.id, 'now') });
    }

    const groups = groupsRepo.getAllGroups(true);
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

    const userGroup = getUserGroup(ctx.from?.id);
    if (userGroup) {
      const { formattedText } = scheduleService.getCurrentLesson(userGroup.id);
      return replySafely(ctx, formattedText, { reply_markup: getScheduleActionKeyboard(userGroup.id, 'now') });
    }

    const groups = groupsRepo.getAllGroups(true);
    if (groups.length > 1) {
      const keyboard = getClassesGridInlineKeyboard(groups, 'user_now_grp_', true);
      return ctx.reply(
        `👥 <b>Qaysi sinf bo‘yicha hozirgi darsni ko‘rmoqchisiz?</b>`,
        { parse_mode: 'HTML', reply_markup: keyboard }
      );
    }

    const groupId = groups.length === 1 ? groups[0].id : null;
    const { formattedText } = scheduleService.getCurrentLesson(groupId);
    await replySafely(ctx, formattedText);
  });

  // ==========================================
  // 📅 BUGUNGI JADVAL
  // ==========================================

  bot.hears('📅 Bugungi jadval', async (ctx) => {
    if (ctx.chat.type !== 'private') return;

    const userGroup = getUserGroup(ctx.from?.id);
    if (userGroup) {
      const { formattedText } = scheduleService.getTodaySchedule(userGroup.id);
      return replySafely(ctx, formattedText, { reply_markup: getScheduleActionKeyboard(userGroup.id, 'today') });
    }

    const groups = groupsRepo.getAllGroups(true);
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

    const userGroup = getUserGroup(ctx.from?.id);
    if (userGroup) {
      const { formattedText } = scheduleService.getTomorrowSchedule(userGroup.id);
      return replySafely(ctx, formattedText, { reply_markup: getScheduleActionKeyboard(userGroup.id, 'tmr') });
    }

    const groups = groupsRepo.getAllGroups(true);
    if (groups.length > 1) {
      const keyboard = getClassesGridInlineKeyboard(groups, 'user_tmr_grp_', true);
      return ctx.reply(
        `👥 <b>Qaysi sinf bo‘yicha ertangi dars jadvalini ko‘rmoqchisiz?</b>`,
        { parse_mode: 'HTML', reply_markup: keyboard }
      );
    }

    const groupId = groups.length === 1 ? groups[0].id : null;
    const { formattedText } = scheduleService.getTomorrowSchedule(groupId);
    await replySafely(ctx, formattedText);
  });

  // ==========================================
  // 📚 HAFTALIK JADVAL
  // ==========================================

  bot.hears('📚 Haftalik jadval', async (ctx) => {
    if (ctx.chat.type !== 'private') return;

    const userGroup = getUserGroup(ctx.from?.id);
    if (userGroup) {
      const { formattedText } = scheduleService.getWeeklySchedule(userGroup.id);
      return replySafely(ctx, formattedText, { reply_markup: getScheduleActionKeyboard(userGroup.id, 'week') });
    }

    const groups = groupsRepo.getAllGroups(true);
    if (groups.length > 1) {
      const keyboard = getClassesGridInlineKeyboard(groups, 'user_week_grp_', true);
      return ctx.reply(
        `👥 <b>Qaysi sinf bo‘yicha haftalik dars jadvalini ko‘rmoqchisiz?</b>`,
        { parse_mode: 'HTML', reply_markup: keyboard }
      );
    }

    const groupId = groups.length === 1 ? groups[0].id : null;
    const { formattedText } = scheduleService.getWeeklySchedule(groupId);
    await replySafely(ctx, formattedText);
  });

  // ==========================================
  // 🎯 INLINE CALLBACK QUERYLAR (Tanlangan sinf jadvallari)
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
