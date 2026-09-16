import { InlineKeyboard } from 'grammy';
import { groupsRepo } from '../../database/groups.repo.js';
import { scheduleService } from '../../services/schedule.service.js';
import { adminService } from '../../services/admin.service.js';
import { isValidTimeFormat } from '../../utils/date.util.js';
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
  // Bot guruhga qo'shilganda avtomatik ro'yxatga olish va sinfni so'rash
  bot.on('my_chat_member', async (ctx) => {
    const status = ctx.myChatMember.new_chat_member.status;
    const chat = ctx.chat;

    if (['member', 'administrator'].includes(status)) {
      if (chat.type === 'group' || chat.type === 'supergroup') {
        const group = groupsRepo.addGroup({
          telegram_chat_id: chat.id,
          name: chat.title || `Sinf ${chat.id}`,
          send_time: config.DEFAULT_SEND_TIME
        });

        logger.info(`[GROUP AUTO ADD] Bot yangi sinf guruhiga qo'shildi: ${group.name} (${chat.id})`);

        const classes = groupsRepo.getAllGroups(true);
        const keyboard = new InlineKeyboard();
        classes.forEach((c, index) => {
          keyboard.text(c.name, `bind_class_${c.id}`);
          if ((index + 1) % 4 === 0) keyboard.row();
        });

        await ctx.reply(
          `🎉 <b>MAKTAB dars jadvali boti guruhga muvaffaqiyatli qo‘shildi!</b>\n\n` +
          `🏫 <b>Ushbu guruh qaysi sinfga tegishli?</b>\n` +
          `Quyidagi ro‘yxatdan sinfingizni tanlang (yoki <code>/setclass 11-D</code> deb yozing):\n\n` +
          `⏰ <b>Avtomatik dars yuborish:</b> Har kuni ertalab soat <b>${group.send_time}</b> da\n` +
          `📖 <b>Bugungi darslarni ko‘rish:</b> <code>/darsjadvali</code> yoki <code>/resend</code> (qaytadan tashlash)`,
          { parse_mode: 'HTML', reply_markup: keyboard }
        );
      }
    }
  });

  // /setclass yoki /bind buyrug'i (Guruhni aniq bir sinfga qotirib qo'yish)
  bot.command(['setclass', 'bind'], async (ctx) => {
    if (ctx.chat.type === 'private') {
      return ctx.reply('⚠️ Ushbu buyruqni sinfga biriktirmoqchi bo‘lgan Telegram guruh ichida yozing:\nMasalan: <code>/setclass 11-D</code>', { parse_mode: 'HTML' });
    }

    const allowed = await canManageGroup(ctx);
    if (!allowed) {
      return ctx.reply('⛔ Faqat guruh adminlari ushbu guruhni sinfga biriktirishi mumkin.');
    }

    const input = ctx.match?.trim();

    // 1. Agar admin to'g'ridan-to'g'ri sinf nomini yozgan bo'lsa (masalan /setclass 11-D)
    if (input) {
      const boundClass = groupsRepo.bindChatToClass(input, ctx.chat.id);
      if (boundClass) {
        return ctx.reply(
          `✅ <b>GURUH MUVAFFAQIYATLI BIRIKTIRILDI!</b>\n\n` +
          `🏫 <b>Mahkamlangan sinf:</b> <b>${boundClass.name}</b>\n` +
          `🆔 <b>Guruh Chat ID:</b> <code>${ctx.chat.id}</code>\n` +
          `⏰ <b>Avtomatik yuborish vaqti:</b> Har kuni soat <b>${boundClass.send_time}</b> da\n\n` +
          `📖 <i>Dars jadvalini olish uchun:</i> <code>/darsjadvali</code> yoki <code>/resend</code>`,
          { parse_mode: 'HTML' }
        );
      }
    }

    // 2. Agar parametr yozilmagan bo'lsa yoki topilmasa -> Inline klaviatura orqali sinflarni chiqarish
    const classes = groupsRepo.getAllGroups(true);
    if (classes.length === 0) {
      return ctx.reply('⚠️ Bazada sinflar topilmadi.');
    }

    const keyboard = new InlineKeyboard();
    classes.forEach((c, index) => {
      keyboard.text(c.name, `bind_class_${c.id}`);
      if ((index + 1) % 4 === 0) keyboard.row();
    });

    await ctx.reply(
      `🏫 <b>Ushbu Telegram guruh qaysi sinfga tegishli?</b>\n\n` +
      `Quyidagi ro‘yxatdan tegishli sinfni tanlang (yoki <code>/setclass 11-D</code> deb yozing):`,
      { parse_mode: 'HTML', reply_markup: keyboard }
    );
  });

  // Callback query: bind_class_<id>
  bot.callbackQuery(/^bind_class_(\d+)$/, async (ctx) => {
    const allowed = await canManageGroup(ctx);
    if (!allowed) {
      return ctx.answerCallbackQuery({ text: '⛔ Faqat guruh adminlari bajara oladi', show_alert: true });
    }

    const classId = parseInt(ctx.match[1], 10);
    const boundClass = groupsRepo.bindChatToClass(classId, ctx.chat.id);

    await ctx.answerCallbackQuery({ text: `✅ Sinf biriktirildi: ${boundClass?.name}` });

    if (boundClass) {
      await ctx.editMessageText(
        `✅ <b>GURUH MUVAFFAQIYATLI BIRIKTIRILDI!</b>\n\n` +
        `🏫 <b>Mahkamlangan sinf:</b> <b>${boundClass.name}</b>\n` +
        `🆔 <b>Guruh Chat ID:</b> <code>${ctx.chat.id}</code>\n` +
        `⏰ <b>Avtomatik yuborish vaqti:</b> Har kuni soat <b>${boundClass.send_time}</b> da\n\n` +
        `📖 <i>Dars jadvalini olish yoki qaytadan tashlash:</i> <code>/darsjadvali</code> yoki <code>/resend</code>`,
        { parse_mode: 'HTML' }
      );
    }
  });

  // /settime <HH:mm> buyrug'i
  bot.command('settime', async (ctx) => {
    if (ctx.chat.type === 'private') {
      return ctx.reply('ℹ️ Ushbu buyruq orqali guruhning dars yuborish vaqtini o\'rnatish uchun guruh ichida yozing: <code>/settime 06:00</code>', { parse_mode: 'HTML' });
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

  // /resend, /send, /sendjadval, /tashlash, /qaytadan buyruqlari (Guruhga dars jadvalini qaytadan yuborish)
  bot.command(['resend', 'send', 'sendjadval', 'tashlash', 'qaytadan', 'post'], async (ctx) => {
    if (ctx.chat.type === 'private') {
      return ctx.reply('ℹ️ Ushbu buyruq orqali guruhga dars jadvalini qaytadan yuborish uchun guruh ichida yozing: <code>/resend</code>', { parse_mode: 'HTML' });
    }

    const allowed = await canManageGroup(ctx);
    if (!allowed) {
      return ctx.reply('⛔ Faqat guruh adminlari dars jadvalini qaytadan yuborishi mumkin. Istalgan a\'zo esa <code>/darsjadvali</code> deb yozishi mumkin.');
    }

    const group = groupsRepo.getGroupByChatId(ctx.chat.id);

    // Agar guruh hali biror sinfga biriktirilmagan bo'lsa
    if (!group) {
      const classes = groupsRepo.getAllGroups(true);
      const keyboard = new InlineKeyboard();
      classes.forEach((c, index) => {
        keyboard.text(c.name, `bind_class_${c.id}`);
        if ((index + 1) % 4 === 0) keyboard.row();
      });

      return ctx.reply(
        `⚠️ <b>Ushbu guruh hali biror sinfga biriktirilmagan!</b>\n\n` +
        `Iltimos, dars jadvalini yuborish uchun quyidagi ro‘yxatdan sinfni tanlang yoki <code>/setclass 11-D</code> deb yozing:`,
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
    const group = groupsRepo.getGroupByChatId(ctx.chat.id);

    // Agar guruh hali biror sinfga biriktirilmagan bo'lsa
    if (!group) {
      const classes = groupsRepo.getAllGroups(true);
      const keyboard = new InlineKeyboard();
      classes.forEach((c, index) => {
        keyboard.text(c.name, `bind_class_${c.id}`);
        if ((index + 1) % 4 === 0) keyboard.row();
      });

      return ctx.reply(
        `⚠️ <b>Ushbu guruh hali biror sinfga biriktirilmagan!</b>\n\n` +
        `Iltimos, dars jadvalini olish uchun quyidagi ro‘yxatdan sinfni tanlang yoki <code>/setclass 11-D</code> deb yozing:`,
        { parse_mode: 'HTML', reply_markup: keyboard }
      );
    }

    const { formattedText } = scheduleService.getTodaySchedule(group.id);
    await ctx.reply(formattedText, { parse_mode: 'HTML' });
  });

  // /hozir, /now, /current, /hozirgidars buyruqlari guruh ichida
  bot.command(['hozir', 'now', 'current', 'hozirgidars'], async (ctx) => {
    const group = groupsRepo.getGroupByChatId(ctx.chat.id);

    // Agar guruh hali biror sinfga biriktirilmagan bo'lsa
    if (!group) {
      const classes = groupsRepo.getAllGroups(true);
      const keyboard = new InlineKeyboard();
      classes.forEach((c, index) => {
        keyboard.text(c.name, `bind_class_${c.id}`);
        if ((index + 1) % 4 === 0) keyboard.row();
      });

      return ctx.reply(
        `⚠️ <b>Ushbu guruh hali biror sinfga biriktirilmagan!</b>\n\n` +
        `Iltimos, hozirgi darsni ko‘rish uchun quyidagi ro‘yxatdan sinfni tanlang yoki <code>/setclass 11-D</code> deb yozing:`,
        { parse_mode: 'HTML', reply_markup: keyboard }
      );
    }

    const { formattedText } = scheduleService.getCurrentLesson(group.id);
    await ctx.reply(formattedText, { parse_mode: 'HTML' });
  });
}

