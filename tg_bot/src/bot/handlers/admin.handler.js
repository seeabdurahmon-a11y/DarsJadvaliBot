import { groupsRepo } from '../../database/groups.repo.js';
import { lessonsRepo } from '../../database/lessons.repo.js';
import { settingsRepo } from '../../database/settings.repo.js';
import { usersRepo } from '../../database/users.repo.js';
import { adminService } from '../../services/admin.service.js';
import { adminAuthService } from '../../services/admin-auth.service.js';
import { scheduleService } from '../../services/schedule.service.js';
import { formatStats, escapeHtml } from '../../utils/formatter.js';
import { isValidTimeFormat, getDayName } from '../../utils/date.util.js';
import {
  getTemplateSettings,
  validateTemplate,
  getPreviewScheduleMessage,
  DEFAULT_TEMPLATE,
  DEFAULT_TEMPLATE_HEADER,
  DEFAULT_TEMPLATE_FOOTER,
  ALLOWED_PLACEHOLDERS
} from '../../utils/template.util.js';
import { BOT_TEXTS, DAYS_LIST } from '../../config/constants.js';
import { config, isAdmin } from '../../config/index.js';
import { teachersRepo } from '../../database/teachers.repo.js';
import {
  getAdminMainMenuKeyboard,
  getCancelKeyboard,
  getAdminGroupSelectionKeyboard,
  getAdminDaySelectionKeyboard,
  getBroadcastGroupSelectionKeyboard,
  getGroupsManageKeyboard,
  getGroupsDeleteKeyboard,
  getGroupDeleteConfirmKeyboard,
  getLessonsListKeyboard,
  getTemplateMenuKeyboard,
  getTemplatePreviewKeyboard,
  getTemplateResetConfirmKeyboard
} from '../keyboards/admin.keyboard.js';
import { getRoleSelectionInlineKeyboard, getTeachersGridInlineKeyboard } from '../keyboards/user.keyboard.js';
import { InlineKeyboard } from 'grammy';
import { editOrReplySafely } from '../../utils/telegram-sender.util.js';

export function registerAdminHandlers(bot) {
  // /admin buyrug'i - To'g'ridan-to'g'ri Admin Panelni ochish (Telegram ID tekshiruvi orqali)
  bot.command('admin', async (ctx) => {
    if (ctx.chat.type !== 'private') return;

    if (!isAdmin(ctx.from?.id) && !adminAuthService.isUserAdmin(ctx.from?.id)) {
      return ctx.reply(BOT_TEXTS.NOT_AUTHORIZED);
    }

    usersRepo.upsertUser({
      telegram_id: ctx.from.id,
      username: ctx.from.username || null,
      first_name: ctx.from.first_name || null,
      is_admin: 1,
      role: 'admin',
      selected_school_id: 1,
      is_role_locked: 1
    });

    adminAuthService.recordSuccessfulLogin(ctx.from.id);
    adminService.clearSession(ctx.from.id);

    return ctx.reply(`⚙️ <b>MAKTAB — Admin Boshqaruv Paneli</b>\n\nQuyidagi bo‘limlardan birini tanlang:`, {
      parse_mode: 'HTML',
      reply_markup: getAdminMainMenuKeyboard()
    });
  });

  // ==========================================
  // 🔓 /adminchiqarish BUYRUG'I
  // ==========================================
  bot.command(['adminchiqarish', 'chiqarish', 'releaseuser', 'resetrole'], async (ctx) => {
    if (!isAdmin(ctx.from?.id) && !adminAuthService.isUserAdmin(ctx.from?.id)) {
      return ctx.reply(BOT_TEXTS.NOT_AUTHORIZED);
    }

    const input = ctx.match?.trim();
    let targetId = input;

    // 1. Agar xabarga javob (reply) qilingan bo'lsa
    if (!targetId && ctx.message?.reply_to_message?.from?.id) {
      targetId = String(ctx.message.reply_to_message.from.id);
    }

    // 2. ID berilgan bo'lsa
    if (targetId) {
      const user = usersRepo.getUserByTelegramId(targetId);
      if (!user) {
        return ctx.reply(
          `⚠️ <b>"${escapeHtml(targetId)}"</b> ID li foydalanuvchi topilmadi.`,
          { parse_mode: 'HTML' }
        );
      }

      usersRepo.releaseUserRole(targetId);

      // Foydalanuvchiga to'g'ridan-to'g'ri yangi rol yoki o'qituvchilar ro'yxatini yuborish
      try {
        if (user.role === 'teacher' || user.selected_teacher_id) {
          const schoolId = user.selected_school_id || 1;
          const teachers = teachersRepo.getAllTeachers(schoolId);
          const teachersKeyboard = getTeachersGridInlineKeyboard(teachers, 'user_bind_tch_');
          teachersKeyboard.row().text('👨‍🎓 O‘quvchi roliga o‘tish', 'user_role_student');

          await ctx.api.sendMessage(
            targetId,
            `🔔 <b>Hurmatli Ustoz! Administrator hisobingizni chiqardi (bo‘shatdi).</b>\n\n` +
            `👨‍🏫 <b>Quyidagi ro‘yxatdan o‘zingizning ism-familiyangizni tanlang:</b>\n\n` +
            `🔒 <i>Diqqat: Ustozlik profili 1 marta tanlanadi va qulflanadi. O‘zgartirish faqat admin orqali amalga oshiriladi.</i>`,
            {
              parse_mode: 'HTML',
              reply_markup: teachersKeyboard
            }
          );
        } else {
          await ctx.api.sendMessage(
            targetId,
            `🔔 <b>Administrator hisobingizni chiqardi (bo‘shatdi).</b>\n\n` +
            `Quyidagi tugmalardan birini tanlab, yangi hisobdan kirgandek qaytadan <b>👨‍🏫 Ustoz</b> yoki <b>👨‍🎓 O‘quvchi</b> rolingizni tanlashingiz va dars jadvalingizni biriktirishingiz mumkin:`,
            {
              parse_mode: 'HTML',
              reply_markup: getRoleSelectionInlineKeyboard()
            }
          );
        }
      } catch (e) {}

      const roleText = user.role === 'teacher' ? '👨‍🏫 Ustoz' : (user.role === 'student' ? '👨‍🎓 O‘quvchi' : 'Nomaʼlum');
      return ctx.reply(
        `✅ <b>Foydalanuvchi muvaffaqiyatli chiqarildi!</b>\n\n` +
        `👤 <b>Ism:</b> ${escapeHtml(user.first_name || 'Foydalanuvchi')}\n` +
        `🆔 <b>Telegram ID:</b> <code>${targetId}</code>\n` +
        `📋 <b>Oldingi roli:</b> ${roleText}\n\n` +
        `📌 Endi bu foydalanuvchi qaytadan tanlash imkoniga ega bo‘ldi.`,
        { parse_mode: 'HTML' }
      );
    }

    // 3. Parametrsiz chaqirilganda: Biriktirilgan foydalanuvchilar ro'yxati
    const lockedUsers = usersRepo.getLockedUsers();

    if (!lockedUsers || lockedUsers.length === 0) {
      return ctx.reply(
        `ℹ️ <b>Hozircha biriktirilgan yoki qulflangan ustoz/o‘quvchilar mavjud emas.</b>\n\n` +
        `Biron foydalanuvchini chiqarish uchun: <code>/adminchiqarish [Telegram_ID]</code> deb yuboring.`,
        { parse_mode: 'HTML' }
      );
    }

    const keyboard = new InlineKeyboard();
    lockedUsers.slice(0, 20).forEach(u => {
      const name = u.first_name || u.username || u.telegram_id;
      const roleLabel = u.role === 'teacher' 
        ? `👨‍🏫 ${u.teacher_last_name || 'Ustoz'}` 
        : `👨‍🎓 ${u.selected_group_name || 'Sinf'}`;
      keyboard.text(`🔓 ${name} (${roleLabel})`, `admin_release_usr_${u.telegram_id}`).row();
    });

    await ctx.reply(
      `👥 <b>BIRIKTIRILGAN FOYDALANUVCHILAR VA USTOZLAR:</b>\n\n` +
      `Quyidagi tugmalardan birini bosib, foydalanuvchini chiqarishingiz va unga qaytadan tanlash imkonini berishingiz mumkin:\n\n` +
      `<i>Yoki to‘g‘ridan-to‘g‘ri ID orqali: <code>/adminchiqarish [ID]</code></i>`,
      { parse_mode: 'HTML', reply_markup: keyboard }
    );
  });

  // Callback: admin_release_usr_<id>
  bot.callbackQuery(/^admin_release_usr_(\d+)$/, async (ctx) => {
    if (!isAdmin(ctx.from?.id) && !adminAuthService.isUserAdmin(ctx.from?.id)) {
      return ctx.answerCallbackQuery({ text: 'Ruxsat yo‘q', show_alert: true });
    }

    const targetId = ctx.match[1];
    const user = usersRepo.getUserByTelegramId(targetId);

    if (!user) {
      return ctx.answerCallbackQuery({ text: 'Foydalanuvchi topilmadi', show_alert: true });
    }

    usersRepo.releaseUserRole(targetId);
    await ctx.answerCallbackQuery({ text: `✅ Foydalanuvchi chiqarildi!` });

    try {
      if (user.role === 'teacher' || user.selected_teacher_id) {
        const schoolId = user.selected_school_id || 1;
        const teachers = teachersRepo.getAllTeachers(schoolId);
        const teachersKeyboard = getTeachersGridInlineKeyboard(teachers, 'user_bind_tch_');
        teachersKeyboard.row().text('👨‍🎓 O‘quvchi roliga o‘tish', 'user_role_student');

        await ctx.api.sendMessage(
          targetId,
          `🔔 <b>Hurmatli Ustoz! Administrator hisobingizni chiqardi (bo‘shatdi).</b>\n\n` +
          `👨‍🏫 <b>Quyidagi ro‘yxatdan o‘zingizning ism-familiyangizni tanlang:</b>\n\n` +
          `🔒 <i>Diqqat: Ustozlik profili 1 marta tanlanadi va qulflanadi. O‘zgartirish faqat admin orqali amalga oshiriladi.</i>`,
          {
            parse_mode: 'HTML',
            reply_markup: teachersKeyboard
          }
        );
      } else {
        await ctx.api.sendMessage(
          targetId,
          `🔔 <b>Administrator profilingizni chiqardi (bo‘shatdi).</b>\n\n` +
          `Quyidagi tugmalardan birini tanlab, yangi hisobdan kirgandek qaytadan <b>👨‍🏫 Ustoz</b> yoki <b>👨‍🎓 O‘quvchi</b> rolingizni tanlashingiz va dars jadvalingizni biriktirishingiz mumkin:`,
          {
            parse_mode: 'HTML',
            reply_markup: getRoleSelectionInlineKeyboard()
          }
        );
      }
    } catch (e) {}

    await ctx.editMessageText(
      `✅ <b>Foydalanuvchi muvaffaqiyatli chiqarildi!</b>\n\n` +
      `👤 <b>Ism:</b> ${escapeHtml(user.first_name || 'Foydalanuvchi')}\n` +
      `🆔 <b>ID:</b> <code>${targetId}</code>\n\n` +
      `Ushbu foydalanuvchi endi qaytadan rol va sinf/ustoz tanlashi mumkin.`,
      { parse_mode: 'HTML' }
    );
  });

  // Admin callback query lari uchun autentifikatsiya tekshiruvchisi
  const checkAuth = async (ctx) => {
    if (!isAdmin(ctx.from?.id) && !adminAuthService.isUserAdmin(ctx.from?.id)) {
      await ctx.answerCallbackQuery({ text: 'Ruxsat berilmagan!', show_alert: true });
      return false;
    }
    adminAuthService.recordSuccessfulLogin(ctx.from?.id);
    return true;
  };

  // 🚪 Admin paneldan chiqish (Logout)
  bot.callbackQuery('admin_logout', async (ctx) => {
    if (!isAdmin(ctx.from?.id) && !adminAuthService.isUserAdmin(ctx.from?.id)) return ctx.answerCallbackQuery();
    adminAuthService.logout(ctx.from.id);
    adminService.clearSession(ctx.from.id);
    await ctx.answerCallbackQuery({ text: 'Chiqildi' });
    await ctx.editMessageText('🚪 <b>Admin paneldan muvaffaqiyatli chiqdingiz.</b>\n\nQayta kirish uchun /admin buyrug‘ini yuboring.', {
      parse_mode: 'HTML'
    });
  });

  // 🔑 Parolni o'zgartirish boshlash
  bot.callbackQuery('admin_change_password', async (ctx) => {
    if (!(await checkAuth(ctx))) return;

    adminService.setSession(ctx.from.id, { action: 'CHANGE_PWD_OLD' });
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      `🔑 <b>Parolni o‘zgartirish (1/3)</b>\n\n` +
      `Iltimos, joriy (eski) parolingizni kiriting:`,
      {
        parse_mode: 'HTML',
        reply_markup: getCancelKeyboard()
      }
    );
  });

  // Admin asosiy menyuga qaytish
  bot.callbackQuery('admin_main', async (ctx) => {
    if (!(await checkAuth(ctx))) return;
    adminService.clearSession(ctx.from.id);
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(`⚙️ <b>MAKTAB — Admin Boshqaruv Paneli</b>\n\nQuyidagi bo'limlardan birini tanlang:`, {
      parse_mode: 'HTML',
      reply_markup: getAdminMainMenuKeyboard()
    });
  });

  // Bekor qilish
  bot.callbackQuery('admin_cancel', async (ctx) => {
    if (!isAdmin(ctx.from?.id) && !adminAuthService.isUserAdmin(ctx.from?.id)) return ctx.answerCallbackQuery();
    adminService.clearSession(ctx.from.id);
    await ctx.answerCallbackQuery({ text: 'Amal bekor qilindi' });

    await ctx.editMessageText(`❌ Amal bekor qilindi.\n\n⚙️ <b>Admin Boshqaruv Paneli:</b>`, {
      parse_mode: 'HTML',
      reply_markup: getAdminMainMenuKeyboard()
    });
  });

  // 📊 Statistika
  bot.callbackQuery('admin_stats', async (ctx) => {
    if (!(await checkAuth(ctx))) return;
    const stats = adminService.getStats();
    const text = formatStats(stats);
    const keyboard = new InlineKeyboard().text('⬅️ Orqaga', 'admin_main');
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(text, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  });

  // ⚙️ Sozlamalar
  bot.callbackQuery('admin_settings', async (ctx) => {
    if (!(await checkAuth(ctx))) return;
    const defaultTime = settingsRepo.get('default_send_time', config.DEFAULT_SEND_TIME);
    const text = `⚙️ <b>Tizim Sozlamalari:</b>\n\n` +
      `⏰ <b>Standart dars yuborish vaqti:</b> ${defaultTime}\n` +
      `🕒 <b>Vaqt mintaqasi:</b> ${config.TZ}\n` +
      `👑 <b>Adminlar soni:</b> ${config.ADMIN_IDS.length}\n` +
      `📁 <b>Baza fayli:</b> SQLite (bot.sqlite)`;

    const keyboard = new InlineKeyboard()
      .text('⏰ Standart vaqtni o‘zgartirish', 'admin_set_time')
      .row()
      .text('🔑 Parolni o‘zgartirish', 'admin_change_password')
      .row()
      .text('⬅️ Orqaga', 'admin_main');

    await ctx.answerCallbackQuery();
    await ctx.editMessageText(text, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  });

  // ==========================================
  // 📩 XABAR SHABLONI BOSHQARUVI
  // ==========================================

  bot.callbackQuery('admin_template_menu', async (ctx) => {
    if (!(await checkAuth(ctx))) return;
    adminService.clearSession(ctx.from.id);

    const tplSettings = getTemplateSettings();
    const text = `📩 <b>XABAR SHABLONI</b>\n\n` +
      `<i>Joriy shablon:</i>\n\n` +
      `<code>${escapeHtml(tplSettings.template)}</code>\n\n` +
      `📌 <b>Sarlavha:</b> ${tplSettings.header}\n` +
      `📌 <b>Pastki matn:</b> ${tplSettings.footer}\n\n` +
      `<i>Qo'llab-quvvatlanadigan placeholderlar:</i>\n` +
      `<code>{{header}}</code>, <code>{{date}}</code>, <code>{{group}}</code>, <code>{{lessons}}</code>, <code>{{footer}}</code>, <code>{{day}}</code>, <code>{{time}}</code>`;

    await ctx.answerCallbackQuery();
    await ctx.editMessageText(text, {
      parse_mode: 'HTML',
      reply_markup: getTemplateMenuKeyboard()
    });
  });

  bot.callbackQuery('admin_tpl_edit_header', async (ctx) => {
    if (!(await checkAuth(ctx))) return;
    const tplSettings = getTemplateSettings();

    adminService.setSession(ctx.from.id, {
      action: 'SET_TEMPLATE_HEADER'
    });

    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      `✏️ <b>Sarlavhani o‘zgartirish</b>\n\n` +
      `Hozirgi sarlavha: ${tplSettings.header}\n\n` +
      `Yangi sarlavhani yuboring:\n` +
      `<i>(Masalan: <code>🏫 MAKTAB — BUGUNGI DARS JADVALI</code>)</i>`,
      {
        parse_mode: 'HTML',
        reply_markup: getCancelKeyboard('admin_template_menu')
      }
    );
  });

  bot.callbackQuery('admin_tpl_edit_footer', async (ctx) => {
    if (!(await checkAuth(ctx))) return;
    const tplSettings = getTemplateSettings();

    adminService.setSession(ctx.from.id, {
      action: 'SET_TEMPLATE_FOOTER'
    });

    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      `📝 <b>Pastki matnni (Footer) o‘zgartirish</b>\n\n` +
      `Hozirgi pastki matn: ${tplSettings.footer}\n\n` +
      `Yangi pastki matnni yuboring:\n` +
      `<i>(Masalan: <code>🔔 Darslarga o‘z vaqtida keling, sinf xonasini toza tuting!</code>)</i>`,
      {
        parse_mode: 'HTML',
        reply_markup: getCancelKeyboard('admin_template_menu')
      }
    );
  });

  bot.callbackQuery('admin_tpl_edit_full', async (ctx) => {
    if (!(await checkAuth(ctx))) return;

    adminService.setSession(ctx.from.id, {
      action: 'SET_TEMPLATE_FULL'
    });

    const helpMsg = `🛠 <b>To‘liq xabar shablonini o‘zgartirish</b>\n\n` +
      `Quyidagi placeholderlardan foydalangan holda butun xabar matnini yuboring:\n` +
      `• <code>{{header}}</code> — Sarlavha\n` +
      `• <code>{{date}}</code> — Sana\n` +
      `• <code>{{group}}</code> — Sinf/Guruh nomi\n` +
      `• <code>{{lessons}}</code> — Darslar ro‘yxati\n` +
      `• <code>{{footer}}</code> — Pastki eslatma matni\n` +
      `• <code>{{day}}</code> — Hafta kuni\n` +
      `• <code>{{time}}</code> — Vaqt\n\n` +
      `<i>Masalan:</i>\n` +
      `<code>🏫 MAKTAB DARS JADVALI\n📅 {{date}}\n\n👥 Sinf: {{group}}\n\n{{lessons}}\n\n🔔 {{footer}}</code>`;

    await ctx.answerCallbackQuery();
    await ctx.editMessageText(helpMsg, {
      parse_mode: 'HTML',
      reply_markup: getCancelKeyboard('admin_template_menu')
    });
  });

  bot.callbackQuery('admin_tpl_preview', async (ctx) => {
    if (!(await checkAuth(ctx))) return;
    const previewText = getPreviewScheduleMessage();

    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      `👁 <b>Xabar ko‘rinishi (Test ma’lumotlari bilan):</b>\n\n━━━━━━━━━━━━━━━━\n${previewText}\n━━━━━━━━━━━━━━━━`,
      {
        parse_mode: 'HTML',
        reply_markup: getTemplatePreviewKeyboard()
      }
    );
  });

  bot.callbackQuery('admin_tpl_test_send', async (ctx) => {
    if (!(await checkAuth(ctx))) return;
    const previewText = getPreviewScheduleMessage();

    try {
      await bot.api.sendMessage(ctx.from.id, `📬 <b>TEST XABAR:</b>\n\n${previewText}`, { parse_mode: 'HTML' });
      await ctx.answerCallbackQuery({ text: '✅ Test xabar shaxsiy chatingizga yuborildi!', show_alert: true });
    } catch (err) {
      await ctx.answerCallbackQuery({ text: '❌ Xabar yuborishda xatolik: ' + err.message, show_alert: true });
    }
  });

  bot.callbackQuery('admin_tpl_reset_ask', async (ctx) => {
    if (!(await checkAuth(ctx))) return;
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      `🔄 <b>Standart shablonni qaytarishni xohlaysizmi?</b>\n\nBarcha moslashtirilgan sarlavha, footer va to'liq shablon standart maktab shabloniga qaytariladi.`,
      {
        parse_mode: 'HTML',
        reply_markup: getTemplateResetConfirmKeyboard()
      }
    );
  });

  bot.callbackQuery('admin_tpl_reset_confirm', async (ctx) => {
    if (!(await checkAuth(ctx))) return;
    settingsRepo.set('schedule_template', DEFAULT_TEMPLATE);
    settingsRepo.set('template_header', DEFAULT_TEMPLATE_HEADER);
    settingsRepo.set('template_footer', DEFAULT_TEMPLATE_FOOTER);

    await ctx.answerCallbackQuery({ text: '✅ Standart shablon tiklandi' });
    const text = `✅ <b>Standart maktab shabloni muvaffaqiyatli tiklandi!</b>\n\n` +
      `<code>${escapeHtml(DEFAULT_TEMPLATE)}</code>\n\n` +
      `📌 <b>Sarlavha:</b> ${DEFAULT_TEMPLATE_HEADER}\n` +
      `📌 <b>Pastki matn:</b> ${DEFAULT_TEMPLATE_FOOTER}`;

    await ctx.editMessageText(text, {
      parse_mode: 'HTML',
      reply_markup: getTemplateMenuKeyboard()
    });
  });

  // ==========================================
  // 📤 HOZIR YUBORISH & BROADCAST
  // ==========================================

  bot.callbackQuery('admin_broadcast_now', async (ctx) => {
    if (!(await checkAuth(ctx))) return;
    const groups = groupsRepo.getAllGroups(true);
    const text = `📤 <b>Dars jadvalini sinf guruhlariga darhol yuborish:</b>\n\n` +
      `Quyidagilardan birini tanlang:\n` +
      `• Barcha faol sinflarga bir vaqtda yuborish\n` +
      `• Yoki alohida bir sinfni tanlash`;

    const keyboard = getBroadcastGroupSelectionKeyboard(groups);
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(text, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  });

  bot.callbackQuery('admin_send_all', async (ctx) => {
    if (!(await checkAuth(ctx))) return;
    await ctx.answerCallbackQuery({ text: 'Jadvallar yuborilmoqda...' });
    await ctx.editMessageText('⏳ <i>Jadvallar barcha sinflarga yuborilmoqda...</i>', { parse_mode: 'HTML' });

    const results = await adminService.broadcastTodaySchedule(bot, { force: true });
    let report = `✅ <b>Yuborish yakunlandi!</b>\n\n` +
      `📊 Jami sinflar: ${results.total}\n` +
      `📤 Muvaffaqiyatli yuborildi: ${results.sent}\n` +
      `❌ Xatolik yuz berdi: ${results.failed}\n\n`;

    results.details.forEach(d => {
      const icon = d.result.success ? '✅' : '❌';
      report += `${icon} <b>${escapeHtml(d.group)}</b>: ${d.result.success ? `yuborildi (${d.result.count} ta dars)` : `xato: ${escapeHtml(d.result.error || '')}`}\n`;
    });

    const keyboard = new InlineKeyboard().text('⬅️ Orqaga', 'admin_main');
    await ctx.editMessageText(report, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  });

  bot.callbackQuery(/^admin_send_grp_(\d+)$/, async (ctx) => {
    if (!(await checkAuth(ctx))) return;
    const groupId = parseInt(ctx.match[1], 10);
    const group = groupsRepo.getGroupById(groupId);

    if (!group) {
      await ctx.answerCallbackQuery({ text: 'Sinf topilmadi', show_alert: true });
      return;
    }

    await ctx.answerCallbackQuery({ text: `${group.name} sinfiga yuborilmoqda...` });
    const res = await adminService.sendTodayScheduleToGroup(bot, group, { force: true });

    let msg = '';
    if (res.success) {
      msg = `✅ <b>${escapeHtml(group.name)}</b> sinfiga bugungi dars jadvali muvaffaqiyatli yuborildi! (${res.count} ta dars)`;
    } else {
      msg = `❌ <b>${escapeHtml(group.name)}</b> sinfiga yuborishda xatolik yuz berdi:\n<code>${escapeHtml(res.error || '')}</code>`;
    }

    const keyboard = new InlineKeyboard().text('⬅️ Orqaga', 'admin_broadcast_now');
    await ctx.editMessageText(msg, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  });

  // ==========================================
  // 👥 SINFLAR / GURUHLAR BOSHQARUVI & O'CHIRISH
  // ==========================================

  bot.callbackQuery('admin_list_groups', async (ctx) => {
    if (!(await checkAuth(ctx))) return;
    const groups = groupsRepo.getAllGroups(false);
    let text = `👥 <b>Sinflar ro'yxati:</b>\n\n`;

    if (groups.length === 0) {
      text += `<i>Hozircha birorta ham sinf guruhi ulanmagan.</i>\n\nBotni Telegram sinf guruhiga qo'shing yoki quyidagi tugma orqali qo'shing.`;
    } else {
      text += `Sinf ma'lumotlarini ko'rish yoki boshqarish uchun ustiga bosing:`;
    }

    const keyboard = getGroupsManageKeyboard(groups);
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(text, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  });

  bot.callbackQuery('admin_delete_group_menu', async (ctx) => {
    if (!(await checkAuth(ctx))) return;
    const groups = groupsRepo.getAllGroups(false);

    if (groups.length === 0) {
      await ctx.answerCallbackQuery({ text: 'O‘chirish uchun sinflar yo‘q' });
      return;
    }

    const keyboard = getGroupsDeleteKeyboard(groups);
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      `🗑 <b>O‘chirmoqchi bo‘lgan sinfingizni tanlang:</b>\n\n` +
      `<i>Diqqat: Sinf o'chirilganda unga tegishli barcha darslar ham bazadan o'chiriladi.</i>`,
      {
        parse_mode: 'HTML',
        reply_markup: keyboard
      }
    );
  });

  bot.callbackQuery(/^admin_grp_detail_(\d+)$/, async (ctx) => {
    if (!(await checkAuth(ctx))) return;
    const groupId = parseInt(ctx.match[1], 10);
    const group = groupsRepo.getGroupById(groupId);

    if (!group) {
      await ctx.answerCallbackQuery({ text: 'Sinf topilmadi', show_alert: true });
      return;
    }

    const lessons = lessonsRepo.getWeeklyLessons(group.id);
    const text = `👥 <b>Sinf ma'lumotlari:</b>\n\n` +
      `📌 <b>Sinf:</b> ${escapeHtml(group.name)}\n` +
      `🆔 <b>Chat ID:</b> <code>${group.telegram_chat_id}</code>\n` +
      `⏰ <b>Yuborish vaqti:</b> ${group.send_time}\n` +
      `📚 <b>Kiritilgan darslar:</b> ${lessons.length} ta\n` +
      `🟢 <b>Holati:</b> ${group.is_active ? 'Faol' : 'Nofaol'}`;

    const keyboard = new InlineKeyboard()
      .text('📤 Hozir jadval yuborish', `admin_send_grp_${group.id}`)
      .row()
      .text('📋 Darslarini ko‘rish', `admin_view_grp_${group.id}`)
      .row()
      .text('⏰ Vaqtni o‘zgartirish', `admin_grp_time_${group.id}`)
      .text('🗑 Sinfni o‘chirish', `admin_grp_del_ask_${group.id}`)
      .row()
      .text('⬅️ Sinflar ro‘yxati', 'admin_list_groups');

    await ctx.answerCallbackQuery();
    await ctx.editMessageText(text, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  });

  bot.callbackQuery(/^admin_grp_del_ask_(\d+)$/, async (ctx) => {
    if (!(await checkAuth(ctx))) return;
    const groupId = parseInt(ctx.match[1], 10);
    const group = groupsRepo.getGroupById(groupId);

    if (!group) {
      await ctx.answerCallbackQuery({ text: 'Sinf topilmadi', show_alert: true });
      return;
    }

    const keyboard = getGroupDeleteConfirmKeyboard(group.id);
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      `⚠️ <b>Haqiqatan ham "${escapeHtml(group.name)}" sinfini o‘chirmoqchimisiz?</b>\n\n` +
      `❗️ Ushbu sinf va unga tegishli <b>barcha dars jadvallari</b> bazadan butunlay o‘chirib tashlanadi.`,
      {
        parse_mode: 'HTML',
        reply_markup: keyboard
      }
    );
  });

  bot.callbackQuery(/^admin_grp_del_confirm_(\d+)$/, async (ctx) => {
    if (!(await checkAuth(ctx))) return;
    const groupId = parseInt(ctx.match[1], 10);
    const group = groupsRepo.getGroupById(groupId);

    const groupName = group ? group.name : 'Sinf';
    if (group) {
      groupsRepo.deleteGroup(groupId);
    }

    await ctx.answerCallbackQuery({ text: 'Sinf o‘chirildi' });

    const groups = groupsRepo.getAllGroups(false);
    const keyboard = getGroupsManageKeyboard(groups);
    await ctx.editMessageText(
      `✅ <b>"${escapeHtml(groupName)}" sinfi va unga tegishli barcha darslar muvaffaqiyatli o‘chirildi!</b>\n\n` +
      `👥 <b>Sinflar ro'yxati:</b>`,
      {
        parse_mode: 'HTML',
        reply_markup: keyboard
      }
    );
  });

  bot.callbackQuery(/^admin_grp_time_(\d+)$/, async (ctx) => {
    if (!(await checkAuth(ctx))) return;
    const groupId = parseInt(ctx.match[1], 10);
    const group = groupsRepo.getGroupById(groupId);

    if (!group) return ctx.answerCallbackQuery();

    adminService.setSession(ctx.from.id, {
      action: 'SET_GROUP_TIME',
      groupId: group.id
    });

    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      `⏰ <b>${escapeHtml(group.name)}</b> uchun yangi dars jadvalini yuborish vaqtini kiriting:\n\n` +
      `Masalan: <code>06:00</code> yoki <code>07:30</code>`,
      {
        parse_mode: 'HTML',
        reply_markup: getCancelKeyboard('admin_list_groups')
      }
    );
  });

  bot.callbackQuery('admin_add_group', async (ctx) => {
    if (!(await checkAuth(ctx))) return;
    adminService.setSession(ctx.from.id, {
      action: 'ADD_GROUP_STEP_NAME'
    });

    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      `➕ <b>Yangi sinf qo'shish (1/3 bosqich)</b>\n\n` +
      `Iltimos, sinf nomini kiriting:\n` +
      `<i>(Masalan: 5-A sinf, 9-B sinf, 11-A sinf)</i>`,
      {
        parse_mode: 'HTML',
        reply_markup: getCancelKeyboard('admin_list_groups')
      }
    );
  });

  bot.callbackQuery('admin_set_time', async (ctx) => {
    if (!(await checkAuth(ctx))) return;
    adminService.setSession(ctx.from.id, {
      action: 'SET_DEFAULT_TIME'
    });

    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      `⏰ <b>Standart dars yuborish vaqtini sozlash:</b>\n\n` +
      `Har kuni ertalab sinf guruhlariga dars jadvali qaysi vaqtda yuborilsin?\n` +
      `Iltimos, vaqtni <code>HH:mm</code> formatida yuboring (Masalan: <code>06:00</code> yoki <code>07:00</code>):`,
      {
        parse_mode: 'HTML',
        reply_markup: getCancelKeyboard('admin_settings')
      }
    );
  });

  // ==========================================
  // 📋 JADVALNI KO'RISH
  // ==========================================

  bot.callbackQuery('admin_view_schedule', async (ctx) => {
    if (!(await checkAuth(ctx))) return;
    const groups = groupsRepo.getAllGroups(true);

    if (groups.length === 0) {
      const keyboard = new InlineKeyboard().text('➕ Yangi sinf qo‘shish', 'admin_add_group').row().text('⬅️ Orqaga', 'admin_main');
      await ctx.answerCallbackQuery();
      return ctx.editMessageText(`ℹ️ Hozircha birorta ham sinf mavjud emas. Avval sinf qo'shing.`, {
        reply_markup: keyboard
      });
    }

    const keyboard = new InlineKeyboard();
    groups.forEach((g, idx) => {
      keyboard.text(`👥 ${g.name}`, `admin_view_grp_${g.id}`);
      if ((idx + 1) % 2 === 0) keyboard.row();
    });
    keyboard.row().text('🌐 Barcha sinflar haftalik jadvali', 'admin_view_grp_all');
    keyboard.row().text('⬅️ Orqaga', 'admin_main');

    await ctx.answerCallbackQuery();
    await ctx.editMessageText(`📋 <b>Qaysi sinfning dars jadvalini ko'rmoqchisiz?</b>`, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  });

  bot.callbackQuery(/^admin_view_grp_(.+)$/, async (ctx) => {
    if (!(await checkAuth(ctx))) return;
    const param = ctx.match[1];
    const groupId = param === 'all' ? null : parseInt(param, 10);

    const { formattedText } = scheduleService.getWeeklySchedule(groupId);
    const keyboard = new InlineKeyboard().text('⬅️ Orqaga', 'admin_view_schedule');

    await ctx.answerCallbackQuery();
    await editOrReplySafely(ctx, formattedText, {
      reply_markup: keyboard
    });
  });

  // ==========================================
  // ➕ DARS QO'SHISH
  // ==========================================

  bot.callbackQuery('admin_add_lesson', async (ctx) => {
    if (!(await checkAuth(ctx))) return;
    const groups = groupsRepo.getAllGroups(true);

    if (groups.length === 0) {
      const keyboard = new InlineKeyboard().text('➕ Sinf qo‘shish', 'admin_add_group').row().text('⬅️ Orqaga', 'admin_main');
      await ctx.answerCallbackQuery();
      return ctx.editMessageText(`⚠️ Dars qo'shishdan oldin kamida bitta sinf yaratishingiz kerak!`, {
        reply_markup: keyboard
      });
    }

    const keyboard = getAdminGroupSelectionKeyboard(groups, 'admin_l_set_grp_');
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(`➕ <b>Dars qo'shish (1/6 bosqich):</b>\n\nDars qaysi sinfga tegishli? Sinfni tanlang:`, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  });

  bot.callbackQuery(/^admin_l_set_grp_(\d+)$/, async (ctx) => {
    if (!(await checkAuth(ctx))) return;
    const groupId = parseInt(ctx.match[1], 10);
    const group = groupsRepo.getGroupById(groupId);

    if (!group) return ctx.answerCallbackQuery({ text: 'Sinf topilmadi' });

    adminService.setSession(ctx.from.id, {
      action: 'ADD_LESSON',
      step: 'SELECT_DAY',
      data: {
        groupId: group.id,
        groupName: group.name
      }
    });

    const keyboard = getAdminDaySelectionKeyboard('admin_l_set_day_');
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      `➕ <b>Dars qo'shish (2/6 bosqich):</b>\n\n` +
      `👥 <b>Sinf:</b> ${escapeHtml(group.name)}\n\n` +
      `Dars qaysi kuni bo'ladi? Hafta kunini tanlang:`,
      {
        parse_mode: 'HTML',
        reply_markup: keyboard
      }
    );
  });

  bot.callbackQuery(/^admin_l_set_day_(\d+)$/, async (ctx) => {
    if (!(await checkAuth(ctx))) return;
    const dayId = parseInt(ctx.match[1], 10);
    const session = adminService.getSession(ctx.from.id);

    if (!session || session.action !== 'ADD_LESSON') {
      return ctx.answerCallbackQuery({ text: 'Sessiya eskirgan' });
    }

    session.step = 'INPUT_TIME';
    session.data.dayOfWeek = dayId;
    session.data.dayName = getDayName(dayId);
    adminService.setSession(ctx.from.id, session);

    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      `➕ <b>Dars qo'shish (3/6 bosqich):</b>\n\n` +
      `👥 <b>Sinf:</b> ${escapeHtml(session.data.groupName)}\n` +
      `🗓 <b>Kun:</b> ${escapeHtml(session.data.dayName)}\n\n` +
      `🕐 Darsning boshlanish va tugash vaqtini kiriting:\n` +
      `<i>(Format: <code>08:00 - 08:45</code> yoki <code>08:50 - 09:35</code>)</i>`,
      {
        parse_mode: 'HTML',
        reply_markup: getCancelKeyboard('admin_add_lesson')
      }
    );
  });

  // ==========================================
  // 🗑 DARS O'CHIRISH
  // ==========================================

  bot.callbackQuery('admin_delete_lesson', async (ctx) => {
    if (!(await checkAuth(ctx))) return;
    const lessons = lessonsRepo.getWeeklyLessons();

    if (lessons.length === 0) {
      const keyboard = new InlineKeyboard().text('⬅️ Orqaga', 'admin_main');
      await ctx.answerCallbackQuery();
      return ctx.editMessageText(`ℹ️ Hozircha o'chirish uchun darslar mavjud emas.`, {
        reply_markup: keyboard
      });
    }

    const keyboard = getLessonsListKeyboard(lessons, 'admin_del_l_id_');
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(`🗑 <b>O'chirmoqchi bo'lgan darsingiz ustiga bosing:</b>`, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  });

  bot.callbackQuery(/^admin_del_l_id_(\d+)$/, async (ctx) => {
    if (!(await checkAuth(ctx))) return;
    const lessonId = parseInt(ctx.match[1], 10);
    const lesson = lessonsRepo.getLessonById(lessonId);

    if (lesson) {
      lessonsRepo.deleteLesson(lessonId);
      await ctx.answerCallbackQuery({ text: 'Dars o‘chirildi' });
    }

    const lessons = lessonsRepo.getWeeklyLessons();
    const keyboard = getLessonsListKeyboard(lessons, 'admin_del_l_id_');
    await ctx.editMessageText(`✅ Dars muvaffaqiyatli o'chirildi!\n\n🗑 <b>Boshqa darsni o'chirish:</b>`, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  });

  // ==========================================
  // ✏️ DARS O'ZGARTIRISH
  // ==========================================

  bot.callbackQuery('admin_edit_lesson', async (ctx) => {
    if (!(await checkAuth(ctx))) return;
    const lessons = lessonsRepo.getWeeklyLessons();

    if (lessons.length === 0) {
      const keyboard = new InlineKeyboard().text('⬅️ Orqaga', 'admin_main');
      await ctx.answerCallbackQuery();
      return ctx.editMessageText(`ℹ️ O'zgartirish uchun darslar mavjud emas.`, {
        reply_markup: keyboard
      });
    }

    const keyboard = getLessonsListKeyboard(lessons, 'admin_edit_l_sel_');
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(`✏️ <b>O'zgartirmoqchi bo'lgan darsingizni tanlang:</b>`, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  });

  bot.callbackQuery(/^admin_edit_l_sel_(\d+)$/, async (ctx) => {
    if (!(await checkAuth(ctx))) return;
    const lessonId = parseInt(ctx.match[1], 10);
    const lesson = lessonsRepo.getLessonById(lessonId);

    if (!lesson) {
      return ctx.answerCallbackQuery({ text: 'Dars topilmadi' });
    }

    const text = `✏️ <b>Dars ma'lumotlari:</b>\n\n` +
      `👥 <b>Sinf:</b> ${escapeHtml(lesson.group_name)}\n` +
      `🗓 <b>Kun:</b> ${getDayName(lesson.day_of_week)}\n` +
      `🕐 <b>Vaqt:</b> ${lesson.start_time} — ${lesson.end_time}\n` +
      `📖 <b>Fan:</b> ${escapeHtml(lesson.subject)}\n` +
      `👨‍🏫 <b>O‘qituvchi:</b> ${escapeHtml(lesson.teacher || 'Kiritilmagan')}\n` +
      `🏫 <b>Xona:</b> ${escapeHtml(lesson.room || 'Kiritilmagan')}\n\n` +
      `Qaysi ma'lumotni o'zgartirmoqchisiz?`;

    const keyboard = new InlineKeyboard()
      .text('🕐 Vaqtni', `admin_ed_field_${lesson.id}_time`)
      .text('📖 Fanni', `admin_ed_field_${lesson.id}_subj`)
      .row()
      .text('👨‍🏫 O‘qituvchini', `admin_ed_field_${lesson.id}_teacher`)
      .text('🏫 Xonani', `admin_ed_field_${lesson.id}_room`)
      .row()
      .text('🗑 Darsni o‘chirish', `admin_del_l_id_${lesson.id}`)
      .text('⬅️ Orqaga', 'admin_edit_lesson');

    await ctx.answerCallbackQuery();
    await ctx.editMessageText(text, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  });

  bot.callbackQuery(/^admin_ed_field_(\d+)_(time|subj|teacher|room)$/, async (ctx) => {
    if (!(await checkAuth(ctx))) return;
    const lessonId = parseInt(ctx.match[1], 10);
    const field = ctx.match[2];
    const lesson = lessonsRepo.getLessonById(lessonId);

    if (!lesson) return ctx.answerCallbackQuery({ text: 'Dars topilmadi' });

    adminService.setSession(ctx.from.id, {
      action: 'EDIT_LESSON_FIELD',
      lessonId,
      field
    });

    const fieldNames = {
      time: 'yangi vaqt oralig\'ini (Masalan: <code>08:00 - 08:45</code>)',
      subj: 'yangi fan nomini (Masalan: <code>Matematika</code>)',
      teacher: 'yangi o\'qituvchi ismini (Masalan: <code>Aziza opa</code>)',
      room: 'yangi xona raqamini (Masalan: <code>204</code>)'
    };

    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      `✏️ Iltimos, dars uchun ${fieldNames[field]} kiriting:`,
      {
        parse_mode: 'HTML',
        reply_markup: getCancelKeyboard('admin_edit_lesson')
      }
    );
  });

  // ==========================================
  // ✍️ ADMIN MATNLI XABARLARINI QAYTA ISHLASH (WIZARD & AUTH)
  // ==========================================

  bot.on('message:text', async (ctx, next) => {
    if (ctx.message.text.startsWith('/') || (!isAdmin(ctx.from?.id) && !adminAuthService.isUserAdmin(ctx.from?.id))) {
      return next();
    }

    const session = adminService.getSession(ctx.from.id);
    if (!session) {
      return next();
    }

    const text = ctx.message.text.trim();

    // 0.0. ZAVUCH KODINI TEKSHIRISH (AWAITING_ZAVUCH_CODE)
    if (session.action === 'AWAITING_ZAVUCH_CODE') {
      try { await ctx.deleteMessage(); } catch (e) {}

      const lockout = adminAuthService.checkLockout(ctx.from.id);
      if (lockout.isLocked) {
        return ctx.reply(`⛔️ <b>Juda ko‘p noto‘g‘ri urinishlar!</b>\nIltimos, <b>${lockout.remainingSeconds}</b> soniya kuting.`, { parse_mode: 'HTML' });
      }

      const verifyRes = adminAuthService.verifyZavuchCode(text);

      if (verifyRes.isValid) {
        const school = verifyRes.school;
        usersRepo.upsertUser({
          telegram_id: ctx.from.id,
          username: ctx.from.username || null,
          first_name: ctx.from.first_name || null,
          is_admin: 1,
          role: 'zavuch',
          selected_school_id: school.id,
          is_role_locked: 1
        });
        adminAuthService.recordSuccessfulLogin(ctx.from.id);
        adminService.clearSession(ctx.from.id);

        return ctx.reply(
          `👑 <b>Assalomu alaykum, Hurmatli Zavuch!</b>\n\n` +
          `✅ Siz tizimga <b>${escapeHtml(school.name)}</b> boshqaruvchisi (Admin) sifatida muvaffaqiyatli ulandingiz!\n\n` +
          `🔒 <i>Profilingiz saqlandi. Endi har doim /start yoki /admin orqali to‘g‘ridan-to‘g‘ri boshqaruv paneliga kirishingiz mumkin.</i>`,
          {
            parse_mode: 'HTML',
            reply_markup: getAdminMainMenuKeyboard()
          }
        );
      } else {
        const record = adminAuthService.recordFailedAttempt(ctx.from.id);
        if (record.count >= config.MAX_FAILED_ATTEMPTS) {
          return ctx.reply(`⛔️ <b>Kod 5 marta noto‘g‘ri kiritildi.</b>\nXavfsizlik maqsadida kirish 5 daqiqaga bloklandi.`, { parse_mode: 'HTML' });
        } else {
          const remaining = config.MAX_FAILED_ATTEMPTS - record.count;
          return ctx.reply(`⛔️ <b>Zavuch kodi noto‘g‘ri!</b>\nQolgan urinishlar soni: <b>${remaining}</b>\n\nIltimos, to‘g‘ri kodni kiriting:`, { parse_mode: 'HTML' });
        }
      }
    }

    // 0. ADMIN PAROLINI TEKSHIRISH (AWAITING_ADMIN_PASSWORD)
    if (session.action === 'AWAITING_ADMIN_PASSWORD') {
      try {
        await ctx.deleteMessage(); // Parol xabarda ochiq qolmasligi uchun o'chirishga urinish
      } catch (e) {}

      // Lockout tekshirish
      const lockout = adminAuthService.checkLockout(ctx.from.id);
      if (lockout.isLocked) {
        return ctx.reply(`⛔️ <b>Juda ko‘p noto‘g‘ri urinishlar!</b>\nIltimos, <b>${lockout.remainingSeconds}</b> soniya kuting.`, { parse_mode: 'HTML' });
      }

      const isPasswordValid = adminAuthService.verifyPassword(text);

      if (isPasswordValid) {
        adminAuthService.recordSuccessfulLogin(ctx.from.id);
        adminService.clearSession(ctx.from.id);

        return ctx.reply(
          `✅ <b>Parol to‘g‘ri. Xush kelibsiz, admin!</b>\n\n⚙️ <b>Admin Boshqaruv Paneli:</b>`,
          {
            parse_mode: 'HTML',
            reply_markup: getAdminMainMenuKeyboard()
          }
        );
      } else {
        const record = adminAuthService.recordFailedAttempt(ctx.from.id);
        if (record.count >= config.MAX_FAILED_ATTEMPTS) {
          return ctx.reply(`⛔️ <b>Parol 5 marta noto‘g‘ri kiritildi.</b>\nXavfsizlik maqsadida admin panelga kirish 5 daqiqaga bloklandi.`, { parse_mode: 'HTML' });
        } else {
          const remaining = config.MAX_FAILED_ATTEMPTS - record.count;
          return ctx.reply(`⛔️ <b>Parol noto‘g‘ri.</b>\nQolgan urinishlar soni: <b>${remaining}</b>`, { parse_mode: 'HTML' });
        }
      }
    }

    // 0.1. PAROLNI O'ZGARTIRISH BOSQICHLARI
    if (session.action === 'CHANGE_PWD_OLD') {
      try { await ctx.deleteMessage(); } catch (e) {}

      if (!adminAuthService.verifyPassword(text)) {
        return ctx.reply('❌ <b>Eski parol noto‘g‘ri!</b> Iltimos, qaytadan kiriting:', {
          parse_mode: 'HTML',
          reply_markup: getCancelKeyboard()
        });
      }

      session.action = 'CHANGE_PWD_NEW';
      adminService.setSession(ctx.from.id, session);
      return ctx.reply('🔑 <b>Parolni o‘zgartirish (2/3)</b>\n\nYangi parolni kiriting:\n<i>(Kamida 4 ta belgi)</i>', {
        parse_mode: 'HTML',
        reply_markup: getCancelKeyboard()
      });
    }

    if (session.action === 'CHANGE_PWD_NEW') {
      try { await ctx.deleteMessage(); } catch (e) {}

      if (text.length < 4) {
        return ctx.reply('⚠️ Yangi parol kamida 4 ta belgidan iborat bo‘lishi kerak. Qaytadan kiriting:', {
          parse_mode: 'HTML',
          reply_markup: getCancelKeyboard()
        });
      }

      session.action = 'CHANGE_PWD_CONFIRM';
      session.newPassword = text;
      adminService.setSession(ctx.from.id, session);

      return ctx.reply('🔁 <b>Parolni o‘zgartirish (3/3)</b>\n\nYangi parolni tasdiqlash uchun qaytadan kiriting:', {
        parse_mode: 'HTML',
        reply_markup: getCancelKeyboard()
      });
    }

    if (session.action === 'CHANGE_PWD_CONFIRM') {
      try { await ctx.deleteMessage(); } catch (e) {}

      if (text !== session.newPassword) {
        adminService.clearSession(ctx.from.id);
        return ctx.reply('❌ <b>Yangi parollar mos kelmadi!</b> Amal bekor qilindi.', {
          parse_mode: 'HTML',
          reply_markup: getAdminMainMenuKeyboard()
        });
      }

      const res = adminAuthService.changePassword(config.ADMIN_PASSWORD, text);
      adminService.clearSession(ctx.from.id);

      return ctx.reply('✅ <b>Admin paroli muvaffaqiyatli o‘zgartirildi!</b>', {
        parse_mode: 'HTML',
        reply_markup: getAdminMainMenuKeyboard()
      });
    }

    // 1. Sarlavhani o'zgartirish
    if (session.action === 'SET_TEMPLATE_HEADER') {
      settingsRepo.set('template_header', text);
      adminService.clearSession(ctx.from.id);
      return ctx.reply(
        `✅ <b>Sarlavha saqlandi!</b>\n\n📌 Yangi sarlavha: ${text}`,
        {
          parse_mode: 'HTML',
          reply_markup: getTemplateMenuKeyboard()
        }
      );
    }

    // 2. Pastki matnni o'zgartirish
    if (session.action === 'SET_TEMPLATE_FOOTER') {
      settingsRepo.set('template_footer', text);
      adminService.clearSession(ctx.from.id);
      return ctx.reply(
        `✅ <b>Pastki matn saqlandi!</b>\n\n📌 Yangi footer: ${text}`,
        {
          parse_mode: 'HTML',
          reply_markup: getTemplateMenuKeyboard()
        }
      );
    }

    // 3. To'liq custom shablonni saqlash
    if (session.action === 'SET_TEMPLATE_FULL') {
      const validation = validateTemplate(text);
      if (!validation.isValid) {
        return ctx.reply(
          `❌ <b>Noma’lum placeholder(lar):</b> ${validation.invalidPlaceholders.map(p => `<code>${escapeHtml(p)}</code>`).join(', ')}\n\n` +
          `Iltimos, faqat qo'llab-quvvatlanadigan placeholderlardan foydalaning:\n` +
          `${ALLOWED_PLACEHOLDERS.map(p => `<code>${p}</code>`).join(', ')}`,
          {
            parse_mode: 'HTML',
            reply_markup: getCancelKeyboard('admin_template_menu')
          }
        );
      }

      settingsRepo.set('schedule_template', text);
      adminService.clearSession(ctx.from.id);
      return ctx.reply(
        `✅ <b>Yangi xabar shabloni muvaffaqiyatli saqlandi!</b>\n\n<code>${escapeHtml(text)}</code>`,
        {
          parse_mode: 'HTML',
          reply_markup: getTemplateMenuKeyboard()
        }
      );
    }

    // 4. Standart yuborish vaqtini o'zgartirish
    if (session.action === 'SET_DEFAULT_TIME') {
      if (!isValidTimeFormat(text)) {
        return ctx.reply('⚠️ Noto‘g‘ri format. Iltimos vaqtni <code>HH:mm</code> formatida kiriting (masalan: <code>06:00</code>):', { parse_mode: 'HTML' });
      }

      settingsRepo.set('default_send_time', text);
      adminService.clearSession(ctx.from.id);
      return ctx.reply(
        `✅ <b>Standart yuborish vaqti muvaffaqiyatli saqlandi: ${text}</b>`,
        {
          parse_mode: 'HTML',
          reply_markup: getAdminMainMenuKeyboard()
        }
      );
    }

    // 5. Sinf vaqtini o'zgartirish
    if (session.action === 'SET_GROUP_TIME') {
      if (!isValidTimeFormat(text)) {
        return ctx.reply('⚠️ Noto‘g‘ri format. Iltimos vaqtni <code>HH:mm</code> formatida kiriting (masalan: <code>06:00</code>):', { parse_mode: 'HTML' });
      }

      groupsRepo.setGroupSendTime(session.groupId, text);
      const group = groupsRepo.getGroupById(session.groupId);
      adminService.clearSession(ctx.from.id);
      return ctx.reply(
        `✅ <b>${escapeHtml(group?.name || 'Sinf')} uchun yangi yuborish vaqti saqlandi: ${text}</b>`,
        {
          parse_mode: 'HTML',
          reply_markup: getAdminMainMenuKeyboard()
        }
      );
    }

    // 6. Yangi sinf qo'shish bosqichlari
    if (session.action === 'ADD_GROUP_STEP_NAME') {
      session.action = 'ADD_GROUP_STEP_CHATID';
      session.groupName = text;
      adminService.setSession(ctx.from.id, session);

      return ctx.reply(
        `➕ <b>Yangi sinf qo'shish (2/3 bosqich)</b>\n\n` +
        `📌 Sinf nomi: <b>${escapeHtml(text)}</b>\n\n` +
        `Endi Telegram sinf guruhining Chat ID sini kiriting:\n` +
        `<i>(Masalan: <code>-1001234567890</code> yoki botni guruhga qo'shib /addgroup deb yozsangiz ham bo'ladi)</i>`,
        {
          parse_mode: 'HTML',
          reply_markup: getCancelKeyboard('admin_list_groups')
        }
      );
    }

    if (session.action === 'ADD_GROUP_STEP_CHATID') {
      session.action = 'ADD_GROUP_STEP_TIME';
      session.chatId = text;
      adminService.setSession(ctx.from.id, session);

      return ctx.reply(
        `➕ <b>Yangi sinf qo'shish (3/3 bosqich)</b>\n\n` +
        `📌 Sinf nomi: <b>${escapeHtml(session.groupName)}</b>\n` +
        `🆔 Chat ID: <code>${escapeHtml(text)}</code>\n\n` +
        `Ushbu sinfga har kuni dars jadvali soat nechida yuborilsin?\n` +
        `<i>(Masalan: <code>06:00</code> yoki standart qoldirish uchun <code>06:00</code> yozing)</i>`,
        {
          parse_mode: 'HTML',
          reply_markup: getCancelKeyboard('admin_list_groups')
        }
      );
    }

    if (session.action === 'ADD_GROUP_STEP_TIME') {
      const sendTime = isValidTimeFormat(text) ? text : config.DEFAULT_SEND_TIME;
      const newGroup = groupsRepo.addGroup({
        telegram_chat_id: session.chatId,
        name: session.groupName,
        send_time: sendTime
      });

      adminService.clearSession(ctx.from.id);
      return ctx.reply(
        `✅ <b>Sinf muvaffaqiyatli yaratildi!</b>\n\n` +
        `📌 <b>Nomi:</b> ${escapeHtml(newGroup.name)}\n` +
        `🆔 <b>Chat ID:</b> <code>${newGroup.telegram_chat_id}</code>\n` +
        `⏰ <b>Yuborish vaqti:</b> ${newGroup.send_time}`,
        {
          parse_mode: 'HTML',
          reply_markup: getAdminMainMenuKeyboard()
        }
      );
    }

    // 7. Dars maydonini tahrirlash
    if (session.action === 'EDIT_LESSON_FIELD') {
      const { lessonId, field } = session;
      const updates = {};

      if (field === 'time') {
        const parts = text.split(/[-–—]/).map(p => p.trim());
        if (parts.length < 2 || !isValidTimeFormat(parts[0]) || !isValidTimeFormat(parts[1])) {
          return ctx.reply('⚠️ Noto‘g‘ri vaqt formati. Iltimos <code>08:00 - 08:45</code> ko‘rinishida kiriting:', { parse_mode: 'HTML' });
        }
        updates.start_time = parts[0];
        updates.end_time = parts[1];
      } else if (field === 'subj') {
        updates.subject = text;
      } else if (field === 'teacher') {
        updates.teacher = text;
      } else if (field === 'room') {
        updates.room = text;
      }

      lessonsRepo.updateLesson(lessonId, updates);
      adminService.clearSession(ctx.from.id);
      return ctx.reply(
        `✅ <b>Dars ma'lumoti muvaffaqiyatli yangilandi!</b>`,
        {
          parse_mode: 'HTML',
          reply_markup: getAdminMainMenuKeyboard()
        }
      );
    }

    // 8. Dars qo'shish bosqichlari
    if (session.action === 'ADD_LESSON') {
      if (session.step === 'INPUT_TIME') {
        const parts = text.split(/[-–—]/).map(p => p.trim());
        if (parts.length < 2 || !isValidTimeFormat(parts[0]) || !isValidTimeFormat(parts[1])) {
          return ctx.reply('⚠️ Noto‘g‘ri vaqt formati. Iltimos quyidagi formatda kiriting:\n<code>08:00 - 08:45</code> yoki <code>08:50 - 09:35</code>', { parse_mode: 'HTML' });
        }

        session.data.startTime = parts[0];
        session.data.endTime = parts[1];
        session.step = 'INPUT_SUBJECT';
        adminService.setSession(ctx.from.id, session);

        return ctx.reply(
          `➕ <b>Dars qo'shish (4/6 bosqich):</b>\n\n` +
          `🕐 Vaqt: <b>${session.data.startTime} — ${session.data.endTime}</b>\n\n` +
          `Dars qaysi fan bo'ladi? Fan nomini kiriting:\n` +
          `<i>(Masalan: Matematika, Ona tili, Fizika, Kimyo, Ingliz tili)</i>`,
          {
            parse_mode: 'HTML',
            reply_markup: getCancelKeyboard('admin_add_lesson')
          }
        );
      }

      if (session.step === 'INPUT_SUBJECT') {
        session.data.subject = text;
        session.step = 'INPUT_TEACHER';
        adminService.setSession(ctx.from.id, session);

        return ctx.reply(
          `➕ <b>Dars qo'shish (5/6 bosqich):</b>\n\n` +
          `📖 Fan: <b>${escapeHtml(text)}</b>\n\n` +
          `O'qituvchi ismini kiriting:\n` +
          `<i>(Masalan: Aziza opa, Rustam aka yoki o'tkazib yuborish uchun <code>-</code> yuboring)</i>`,
          {
            parse_mode: 'HTML',
            reply_markup: getCancelKeyboard('admin_add_lesson')
          }
        );
      }

      if (session.step === 'INPUT_TEACHER') {
        session.data.teacher = text === '-' ? null : text;
        session.step = 'INPUT_ROOM';
        adminService.setSession(ctx.from.id, session);

        return ctx.reply(
          `➕ <b>Dars qo'shish (6/6 bosqich):</b>\n\n` +
          `👨‍🏫 O'qituvchi: <b>${escapeHtml(session.data.teacher || 'Kiritilmagan')}</b>\n\n` +
          `Xona raqamini kiriting:\n` +
          `<i>(Masalan: 204, 301 yoki o'tkazib yuborish uchun <code>-</code> yuboring)</i>`,
          {
            parse_mode: 'HTML',
            reply_markup: getCancelKeyboard('admin_add_lesson')
          }
        );
      }

      if (session.step === 'INPUT_ROOM') {
        session.data.room = text === '-' ? null : text;

        lessonsRepo.addLesson({
          group_id: session.data.groupId,
          day_of_week: session.data.dayOfWeek,
          start_time: session.data.startTime,
          end_time: session.data.endTime,
          subject: session.data.subject,
          teacher: session.data.teacher,
          room: session.data.room
        });

        adminService.clearSession(ctx.from.id);

        const successMsg = `🎉 <b>Dars muvaffaqiyatli qo'shildi!</b>\n\n` +
          `👥 <b>Sinf:</b> ${escapeHtml(session.data.groupName)}\n` +
          `🗓 <b>Kun:</b> ${escapeHtml(session.data.dayName)}\n` +
          `🕐 <b>Vaqt:</b> ${session.data.startTime} — ${session.data.endTime}\n` +
          `📖 <b>Fan:</b> ${escapeHtml(session.data.subject)}\n` +
          (session.data.teacher ? `👨‍🏫 <b>O'qituvchi:</b> ${escapeHtml(session.data.teacher)}\n` : '') +
          (session.data.room ? `🏫 <b>Xona:</b> ${escapeHtml(session.data.room)}\n` : '');

        return ctx.reply(successMsg, {
          parse_mode: 'HTML',
          reply_markup: getAdminMainMenuKeyboard()
        });
      }
    }

    return next();
  });
}
