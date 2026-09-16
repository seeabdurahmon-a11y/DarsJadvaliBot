import { scheduleService } from '../../services/schedule.service.js';
import { groupsRepo } from '../../database/groups.repo.js';
import { getGroupSelectionInlineKeyboard } from '../keyboards/user.keyboard.js';
import { replySafely } from '../../utils/telegram-sender.util.js';

export function registerScheduleHandlers(bot) {
  // 🔔 Hozirgi dars
  bot.hears(['🔔 Hozirgi dars', 'Hozirgi dars', 'hozir'], async (ctx) => {
    const groups = groupsRepo.getAllGroups(true);

    if (groups.length > 1) {
      const keyboard = getGroupSelectionInlineKeyboard(groups, 'user_now_grp_');
      return ctx.reply('👥 Qaysi sinf bo‘yicha hozirgi darsni ko‘rmoqchisiz?', {
        reply_markup: keyboard
      });
    }

    const groupId = groups.length === 1 ? groups[0].id : null;
    const { formattedText } = scheduleService.getCurrentLesson(groupId);
    await replySafely(ctx, formattedText);
  });

  // /hozir, /now, /current, /hozirgidars buyruqlari
  bot.command(['hozir', 'now', 'current', 'hozirgidars'], async (ctx) => {
    if (ctx.chat.type !== 'private') return; // Group handlers manage group chats

    const groups = groupsRepo.getAllGroups(true);

    if (groups.length > 1) {
      const keyboard = getGroupSelectionInlineKeyboard(groups, 'user_now_grp_');
      return ctx.reply('👥 Qaysi sinf bo‘yicha hozirgi darsni ko‘rmoqchisiz?', {
        reply_markup: keyboard
      });
    }

    const groupId = groups.length === 1 ? groups[0].id : null;
    const { formattedText } = scheduleService.getCurrentLesson(groupId);
    await replySafely(ctx, formattedText);
  });

  // 📅 Bugungi jadval
  bot.hears('📅 Bugungi jadval', async (ctx) => {
    const groups = groupsRepo.getAllGroups(true);

    if (groups.length > 1) {
      const keyboard = getGroupSelectionInlineKeyboard(groups, 'user_today_grp_');
      return ctx.reply('👥 Qaysi sinf bo‘yicha bugungi dars jadvalini ko‘rmoqchisiz?', {
        reply_markup: keyboard
      });
    }

    const groupId = groups.length === 1 ? groups[0].id : null;
    const { formattedText } = scheduleService.getTodaySchedule(groupId);
    await replySafely(ctx, formattedText);
  });

  // 📆 Ertangi jadval
  bot.hears('📆 Ertangi jadval', async (ctx) => {
    const groups = groupsRepo.getAllGroups(true);

    if (groups.length > 1) {
      const keyboard = getGroupSelectionInlineKeyboard(groups, 'user_tmr_grp_');
      return ctx.reply('👥 Qaysi sinf bo‘yicha ertangi dars jadvalini ko‘rmoqchisiz?', {
        reply_markup: keyboard
      });
    }

    const groupId = groups.length === 1 ? groups[0].id : null;
    const { formattedText } = scheduleService.getTomorrowSchedule(groupId);
    await replySafely(ctx, formattedText);
  });

  // 📚 Haftalik jadval
  bot.hears('📚 Haftalik jadval', async (ctx) => {
    const groups = groupsRepo.getAllGroups(true);

    if (groups.length > 1) {
      const keyboard = getGroupSelectionInlineKeyboard(groups, 'user_week_grp_');
      return ctx.reply('👥 Qaysi sinf bo‘yicha haftalik dars jadvalini ko‘rmoqchisiz?', {
        reply_markup: keyboard
      });
    }

    const groupId = groups.length === 1 ? groups[0].id : null;
    const { formattedText } = scheduleService.getWeeklySchedule(groupId);
    await replySafely(ctx, formattedText);
  });

  // Inline callback query: Hozirgi dars (tanlangan sinf)
  bot.callbackQuery(/^user_now_grp_(.+)$/, async (ctx) => {
    const param = ctx.match[1];
    const groupId = param === 'all' ? null : parseInt(param, 10);
    const { formattedText } = scheduleService.getCurrentLesson(groupId);

    await ctx.answerCallbackQuery();
    await replySafely(ctx, formattedText);
  });

  // Inline callback query: Bugungi jadval (tanlangan sinf)
  bot.callbackQuery(/^user_today_grp_(.+)$/, async (ctx) => {
    const param = ctx.match[1];
    const groupId = param === 'all' ? null : parseInt(param, 10);
    const { formattedText } = scheduleService.getTodaySchedule(groupId);

    await ctx.answerCallbackQuery();
    await replySafely(ctx, formattedText);
  });

  // Inline callback query: Ertangi jadval (tanlangan sinf)
  bot.callbackQuery(/^user_tmr_grp_(.+)$/, async (ctx) => {
    const param = ctx.match[1];
    const groupId = param === 'all' ? null : parseInt(param, 10);
    const { formattedText } = scheduleService.getTomorrowSchedule(groupId);

    await ctx.answerCallbackQuery();
    await replySafely(ctx, formattedText);
  });

  // Inline callback query: Haftalik jadval (tanlangan sinf)
  bot.callbackQuery(/^user_week_grp_(.+)$/, async (ctx) => {
    const param = ctx.match[1];
    const groupId = param === 'all' ? null : parseInt(param, 10);
    const { formattedText } = scheduleService.getWeeklySchedule(groupId);

    await ctx.answerCallbackQuery();
    await replySafely(ctx, formattedText);
  });
}

