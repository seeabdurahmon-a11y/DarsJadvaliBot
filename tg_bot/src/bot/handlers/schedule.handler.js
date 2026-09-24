import { InlineKeyboard } from 'grammy';
import { scheduleService } from '../../services/schedule.service.js';
import { schoolsRepo } from '../../database/schools.repo.js';
import { groupsRepo } from '../../database/groups.repo.js';
import { teachersRepo } from '../../database/teachers.repo.js';
import { usersRepo } from '../../database/users.repo.js';
import { getClassesGridInlineKeyboard, getRoleSelectionInlineKeyboard, getStudentMainMenuKeyboard, getTeacherMainMenuKeyboard } from '../keyboards/user.keyboard.js';
import { adminAuthService } from '../../services/admin-auth.service.js';
import { replySafely } from '../../utils/telegram-sender.util.js';
import { escapeHtml } from '../../utils/formatter.js';

export function registerScheduleHandlers(bot) {
  // Yordamchi: Foydalanuvchining biriktirilgan maktabi, sinfi va ustoz profilini olish
  function getUserContext(telegramId) {
    if (!telegramId) return { user: null, school: null, group: null, teacher: null, schoolId: 1 };
    const user = usersRepo.getUserByTelegramId(telegramId);
    let schoolId = user?.selected_school_id || 1;
    let school = schoolsRepo.getSchoolById(schoolId) || schoolsRepo.getSchoolById(1);
    let group = null;
    let teacher = null;

    if (user?.selected_group_id) {
      group = groupsRepo.getGroupById(user.selected_group_id);
      if (group && !group.is_active) group = null;
    }

    if (user?.selected_teacher_id) {
      teacher = teachersRepo.getTeacherById(user.selected_teacher_id);
    }

    return { user, school, group, teacher, schoolId: school?.id || 1 };
  }

  // Yordamchi: Foydalanuvchi hisobi biriktirilganligini tekshirish
  function isUserAuthenticated(user, telegramId) {
    if (!user) return false;
    if (user.is_admin || adminAuthService.isUserAdmin(telegramId)) return true;
    if (user.role === 'teacher' && user.selected_teacher_id) return true;
    if (user.role === 'student' && user.selected_group_id) return true;
    return false;
  }

  // Yordamchi: Hisobga kirmagan/chiqarilgan foydalanuvchiga xabar berish
  function sendUnauthenticatedPrompt(ctx, actionName = 'Dars jadvalini') {
    return ctx.reply(
      `⚠️ <b>Siz hali profilingizga kirmagansiz yoki hisobingiz administrator tomonidan chiqarilgan.</b>\n\n` +
      `${actionName} ko‘rish uchun iltimos, avval hisobingizga kiring va o‘z rolingizni tanlang:`,
      {
        parse_mode: 'HTML',
        reply_markup: getRoleSelectionInlineKeyboard()
      }
    );
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

    const { user, school, group, schoolId } = getUserContext(ctx.from?.id);

    if (!isUserAuthenticated(user, ctx.from?.id)) {
      return sendUnauthenticatedPrompt(ctx, "Sinf ma'lumotlarini");
    }

    // Agar foydalanuvchi Ustoz bo'lsa
    if (user?.role === 'teacher' && user?.selected_teacher_id) {
      return ctx.reply(
        `👨‍🏫 <b>Siz Ustoz sifatida ro‘yxatdan o‘tgansiz.</b>\n\n` +
        `O‘z dars jadvalingizni ko‘rish uchun <b>📅 Bugungi darslarim</b> yoki <b>📚 Haftalik dars jadvalim</b> tugmalaridan foydalaning.\n\n` +
        `<i>O‘quvchi roliga o‘tish uchun admin /adminchiqarish qilishi lozim.</i>`,
        { parse_mode: 'HTML' }
      );
    }

    const groups = groupsRepo.getAllGroups(true, schoolId);

    if (group) {
      const keyboard = new InlineKeyboard()
        .text('📅 Bugungi jadval', `user_today_grp_${group.id}`)
        .text('🔔 Hozirgi dars', `user_now_grp_${group.id}`)
        .row()
        .text('📆 Ertangi jadval', `user_tmr_grp_${group.id}`)
        .text('📚 Haftalik jadval', `user_week_grp_${group.id}`);

      keyboard.row()
        .text('🔄 Maktab / Sinfni almashtirish', 'user_reset_profile_prompt');

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

  // 👨‍🏫 Mening profilim (Ustozlar uchun)
  bot.hears(['👨‍🏫 Mening profilim', 'Mening profilim', 'Profilim', 'profilim'], async (ctx) => {
    if (ctx.chat.type !== 'private') return;

    const { user, school, teacher } = getUserContext(ctx.from?.id);

    if (!isUserAuthenticated(user, ctx.from?.id)) {
      return sendUnauthenticatedPrompt(ctx, 'Shaxsiy profilingizni');
    }

    if (user?.role === 'teacher' && teacher) {
      const isNotifyEnabled = user.teacher_notifications !== 0;
      const keyboard = new InlineKeyboard()
        .text(
          isNotifyEnabled ? '🔕 Eslatmalarni o‘chirish' : '🔔 Eslatmalarni yoqish (5 daqiqa oldin)',
          'user_toggle_teacher_notify'
        )
        .row()
        .text('🔄 Maktab / Profilni almashtirish', 'user_reset_profile_prompt');

      return ctx.reply(
        `👨‍🏫 <b>USTOZNING SHAXSIY PROFILI</b>\n\n` +
        `👤 <b>F.I.O:</b> <b>${escapeHtml(teacher.last_name)} ${escapeHtml(teacher.first_name)}</b>\n` +
        `📚 <b>Fan:</b> <b>${escapeHtml(teacher.subject || 'O‘qituvchi')}</b>\n` +
        (teacher.phone ? `📞 <b>Telefon:</b> ${escapeHtml(teacher.phone)}\n` : '') +
        `🏫 <b>Maktab:</b> ${escapeHtml(school?.name || 'Maktab')} (Kodi: <code>${school?.code || 'M-01'}</code>)\n` +
        `🔔 <b>Darsdan 5 daqiqa oldin ogohlantirish:</b> ${isNotifyEnabled ? '✅ <b>Faol (Yoqilgan)</b>' : '❌ <b>O‘chirilgan</b>'}\n` +
        `🆔 <b>Telegram ID:</b> <code>${ctx.from.id}</code>\n\n` +
        `ℹ️ <i>Boshqa maktab yoki profilga o‘tish uchun quyidagi tugmadan yoki /reset buyrug‘idan foydalaning.</i>`,
        { parse_mode: 'HTML', reply_markup: keyboard }
      );
    }

    if (user?.role === 'student' && user?.selected_group_name) {
      const keyboard = new InlineKeyboard()
        .text('🔄 Maktab / Sinfni almashtirish', 'user_reset_profile_prompt');

      return ctx.reply(
        `👨‍🎓 <b>O‘QUVCHI PROFILI</b>\n\n` +
        `👥 <b>Sinfingiz:</b> <b>${escapeHtml(user.selected_group_name)}</b>\n` +
        `🏫 <b>Maktab:</b> ${escapeHtml(school?.name || 'Maktab')} (Kodi: <code>${school?.code || 'M-01'}</code>)\n` +
        `🆔 <b>Telegram ID:</b> <code>${ctx.from.id}</code>`,
        { parse_mode: 'HTML', reply_markup: keyboard }
      );
    }

    return sendUnauthenticatedPrompt(ctx, 'Shaxsiy profilingizni');
  });

  // ==========================================
  // 🔔 5 DAQIQA OLDIN ESLATMA (BILDIRISHNOMA)
  // ==========================================

  bot.hears(['🔔 5 daqiqa oldin eslatma', '5 daqiqa oldin eslatma', 'Dars eslatmasi', 'Eslatma', 'eslatma', 'eslatmalar'], async (ctx) => {
    if (ctx.chat.type !== 'private') return;

    const { user, school, group, teacher } = getUserContext(ctx.from?.id);

    if (!isUserAuthenticated(user, ctx.from?.id)) {
      return sendUnauthenticatedPrompt(ctx, 'Dars eslatmalarini');
    }

    if (user?.role === 'teacher' && teacher) {
      const isNotifyEnabled = user.teacher_notifications !== 0;
      const keyboard = new InlineKeyboard()
        .text(
          isNotifyEnabled ? '🔕 Eslatmalarni o‘chirish' : '🔔 Eslatmalarni yoqish (5 daqiqa oldin)',
          'user_toggle_teacher_notify'
        );

      return ctx.reply(
        `🔔 <b>DARS BOSHLANISHIDAN 5 DAQIQA OLDIN OGOHLANTIRISH</b>\n\n` +
        `👤 <b>Ustoz:</b> <b>${escapeHtml(teacher.last_name)} ${escapeHtml(teacher.first_name)}</b>\n` +
        `📚 <b>Fan:</b> <b>${escapeHtml(teacher.subject || 'O‘qituvchi')}</b>\n` +
        `🏫 <b>Maktab:</b> ${escapeHtml(school?.name || 'Maktab')} (Kodi: <code>${school?.code || 'M-01'}</code>)\n\n` +
        `🔔 <b>Eslatma holati:</b> ${isNotifyEnabled ? '✅ <b>Faol (Yoqilgan)</b>' : '❌ <b>O‘chirilgan</b>'}\n\n` +
        `ℹ️ <i>Tizim har kuni dars jadvalingiz bo‘yicha har bir dars boshlanishidan 5 daqiqa oldin qaysi sinfda darsingiz borligi, xona va fan haqida avtomatik ogohlantirish xabarini yuboradi.</i>`,
        { parse_mode: 'HTML', reply_markup: keyboard }
      );
    }

    if (group || user?.selected_group_name) {
      const isNotifyEnabled = user?.teacher_notifications !== 0;
      const keyboard = new InlineKeyboard()
        .text(
          isNotifyEnabled ? '🔕 Eslatmalarni o‘chirish' : '🔔 Eslatmalarni yoqish (5 daqiqa oldin)',
          'user_toggle_student_notify'
        );

      return ctx.reply(
        `🔔 <b>DARS BOSHLANISHIDAN 5 DAQIQA OLDIN OGOHLANTIRISH</b>\n\n` +
        `👥 <b>Sinf:</b> <b>${escapeHtml(group?.name || user?.selected_group_name || 'Sinf')}</b>\n` +
        `🏫 <b>Maktab:</b> ${escapeHtml(school?.name || 'Maktab')} (Kodi: <code>${school?.code || 'M-01'}</code>)\n\n` +
        `🔔 <b>Eslatma holati:</b> ${isNotifyEnabled ? '✅ <b>Faol (Yoqilgan)</b>' : '❌ <b>O‘chirilgan</b>'}\n\n` +
        `ℹ️ <i>Har bir dars boshlanishidan 5 daqiqa oldin qaysi fan, o‘qituvchi va qaysi xonada dars bo‘lishi haqida Telegram orqali avtomatik eslatma yuboriladi.</i>`,
        { parse_mode: 'HTML', reply_markup: keyboard }
      );
    }

    return sendUnauthenticatedPrompt(ctx, 'Dars eslatmalarini');
  });

  bot.command(['eslatma', 'eslatmalar', 'notify', 'reminder', 'ogohlantirish'], async (ctx) => {
    if (ctx.chat.type !== 'private') return;

    const { user, school, group, teacher } = getUserContext(ctx.from?.id);

    if (!isUserAuthenticated(user, ctx.from?.id)) {
      return sendUnauthenticatedPrompt(ctx, 'Dars eslatmalarini');
    }

    if (user?.role === 'teacher' && teacher) {
      const isNotifyEnabled = user.teacher_notifications !== 0;
      const keyboard = new InlineKeyboard()
        .text(
          isNotifyEnabled ? '🔕 Eslatmalarni o‘chirish' : '🔔 Eslatmalarni yoqish (5 daqiqa oldin)',
          'user_toggle_teacher_notify'
        );

      return ctx.reply(
        `🔔 <b>DARS BOSHLANISHIDAN 5 DAQIQA OLDIN OGOHLANTIRISH</b>\n\n` +
        `👤 <b>Ustoz:</b> <b>${escapeHtml(teacher.last_name)} ${escapeHtml(teacher.first_name)}</b>\n` +
        `📚 <b>Fan:</b> <b>${escapeHtml(teacher.subject || 'O‘qituvchi')}</b>\n` +
        `🏫 <b>Maktab:</b> ${escapeHtml(school?.name || 'Maktab')} (Kodi: <code>${school?.code || 'M-01'}</code>)\n\n` +
        `🔔 <b>Eslatma holati:</b> ${isNotifyEnabled ? '✅ <b>Faol (Yoqilgan)</b>' : '❌ <b>O‘chirilgan</b>'}\n\n` +
        `ℹ️ <i>Tizim har kuni dars jadvalingiz bo‘yicha har bir dars boshlanishidan 5 daqiqa oldin qaysi sinfda darsingiz borligi, xona va fan haqida avtomatik ogohlantirish xabarini yuboradi.</i>`,
        { parse_mode: 'HTML', reply_markup: keyboard }
      );
    }

    if (group || user?.selected_group_name) {
      const isNotifyEnabled = user?.teacher_notifications !== 0;
      const keyboard = new InlineKeyboard()
        .text(
          isNotifyEnabled ? '🔕 Eslatmalarni o‘chirish' : '🔔 Eslatmalarni yoqish (5 daqiqa oldin)',
          'user_toggle_student_notify'
        );

      return ctx.reply(
        `🔔 <b>DARS BOSHLANISHIDAN 5 DAQIQA OLDIN OGOHLANTIRISH</b>\n\n` +
        `👥 <b>Sinf:</b> <b>${escapeHtml(group?.name || user?.selected_group_name || 'Sinf')}</b>\n` +
        `🏫 <b>Maktab:</b> ${escapeHtml(school?.name || 'Maktab')} (Kodi: <code>${school?.code || 'M-01'}</code>)\n\n` +
        `🔔 <b>Eslatma holati:</b> ${isNotifyEnabled ? '✅ <b>Faol (Yoqilgan)</b>' : '❌ <b>O‘chirilgan</b>'}\n\n` +
        `ℹ️ <i>Har bir dars boshlanishidan 5 daqiqa oldin qaysi fan, o‘qituvchi va qaysi xonada dars bo‘lishi haqida Telegram orqali avtomatik eslatma yuboriladi.</i>`,
        { parse_mode: 'HTML', reply_markup: keyboard }
      );
    }

    return ctx.reply(
      `ℹ️ Eslatmalarni sozlash uchun avval /start orqali o‘z sinfingiz yoki ustoz profilingizni biriktiring.`
    );
  });

  // Callback: Ustoz eslatmalarini yoqish/o'chirish (user_toggle_teacher_notify)
  bot.callbackQuery('user_toggle_teacher_notify', async (ctx) => {
    const user = usersRepo.getUserByTelegramId(ctx.from.id);
    if (!user || user.role !== 'teacher') {
      return ctx.answerCallbackQuery({ text: 'Faqat ustozlar uchun', show_alert: true });
    }

    const currentStatus = user.teacher_notifications !== 0;
    const newStatus = !currentStatus;
    usersRepo.setTeacherNotifications(ctx.from.id, newStatus ? 1 : 0);

    await ctx.answerCallbackQuery({
      text: newStatus ? '🔔 Dars eslatmalari yoqildi!' : '🔕 Dars eslatmalari o‘chirildi!'
    });

    const teacher = teachersRepo.getTeacherById(user.selected_teacher_id);
    const school = schoolsRepo.getSchoolById(user.selected_school_id || 1);

    const keyboard = new InlineKeyboard()
      .text(
        newStatus ? '🔕 Eslatmalarni o‘chirish' : '🔔 Eslatmalarni yoqish (5 daqiqa oldin)',
        'user_toggle_teacher_notify'
      );

    await ctx.editMessageText(
      `🔔 <b>DARS BOSHLANISHIDAN 5 DAQIQA OLDIN OGOHLANTIRISH</b>\n\n` +
      `👤 <b>Ustoz:</b> <b>${escapeHtml(teacher?.last_name || '')} ${escapeHtml(teacher?.first_name || '')}</b>\n` +
      `📚 <b>Fan:</b> <b>${escapeHtml(teacher?.subject || 'O‘qituvchi')}</b>\n` +
      (teacher?.phone ? `📞 <b>Telefon:</b> ${escapeHtml(teacher.phone)}\n` : '') +
      `🏫 <b>Maktab:</b> ${escapeHtml(school?.name || 'Maktab')} (Kodi: <code>${school?.code || 'M-01'}</code>)\n\n` +
      `🔔 <b>Eslatma holati:</b> ${newStatus ? '✅ <b>Faol (Yoqilgan)</b>' : '❌ <b>O‘chirilgan</b>'}\n\n` +
      `ℹ️ <i>Tizim har kuni dars jadvalingiz bo‘yicha har bir dars boshlanishidan 5 daqiqa oldin qaysi sinfda darsingiz borligi, xona va fan haqida avtomatik ogohlantirish xabarini yuboradi.</i>`,
      { parse_mode: 'HTML', reply_markup: keyboard }
    );
  });

  // Callback: O'quvchi eslatmalarini yoqish/o'chirish (user_toggle_student_notify)
  bot.callbackQuery('user_toggle_student_notify', async (ctx) => {
    const user = usersRepo.getUserByTelegramId(ctx.from.id);
    const currentStatus = user?.teacher_notifications !== 0;
    const newStatus = !currentStatus;
    usersRepo.setTeacherNotifications(ctx.from.id, newStatus ? 1 : 0);

    await ctx.answerCallbackQuery({
      text: newStatus ? '🔔 Dars eslatmalari yoqildi!' : '🔕 Dars eslatmalari o‘chirildi!'
    });

    const { school, group } = getUserContext(ctx.from?.id);
    const keyboard = new InlineKeyboard()
      .text(
        newStatus ? '🔕 Eslatmalarni o‘chirish' : '🔔 Eslatmalarni yoqish (5 daqiqa oldin)',
        'user_toggle_student_notify'
      );

    await ctx.editMessageText(
      `🔔 <b>DARS BOSHLANISHIDAN 5 DAQIQA OLDIN OGOHLANTIRISH</b>\n\n` +
      `👥 <b>Sinf:</b> <b>${escapeHtml(group?.name || user?.selected_group_name || 'Sinf')}</b>\n` +
      `🏫 <b>Maktab:</b> ${escapeHtml(school?.name || 'Maktab')} (Kodi: <code>${school?.code || 'M-01'}</code>)\n\n` +
      `🔔 <b>Eslatma holati:</b> ${newStatus ? '✅ <b>Faol (Yoqilgan)</b>' : '❌ <b>O‘chirilgan</b>'}\n\n` +
      `ℹ️ <i>Har bir dars boshlanishidan 5 daqiqa oldin qaysi fan, o‘qituvchi va qaysi xonada dars bo‘lishi haqida Telegram orqali avtomatik eslatma yuboriladi.</i>`,
      { parse_mode: 'HTML', reply_markup: keyboard }
    );
  });

  // /sinf buyrug'i
  bot.command(['sinf', 'sinfim', 'mysinf', 'myclass', 'tanlash', 'class'], async (ctx) => {
    if (ctx.chat.type !== 'private') return;

    const { user, school, group, schoolId } = getUserContext(ctx.from?.id);

    if (user?.role === 'teacher' && user?.selected_teacher_id) {
      return ctx.reply(
        `👨‍🏫 <b>Siz Ustoz sifatida ro‘yxatdan o‘tgansiz.</b>\n` +
        `Dars jadvalingizni ko‘rish uchun <b>📅 Bugungi darslarim</b> tugmasidan foydalaning.`,
        { parse_mode: 'HTML' }
      );
    }

    const input = ctx.match?.trim();
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

    const user = usersRepo.getUserByTelegramId(ctx.from.id);
    if (user?.is_role_locked && user?.role === 'student' && user?.selected_group_id && user.selected_group_id !== groupId) {
      return ctx.answerCallbackQuery({
        text: 'Siz allaqachon boshqa sinfga biriktirilgansiz va uni o‘zgartira olmaysiz!',
        show_alert: true
      });
    }

    // Sinfni biriktiramiz va qulflaymiz (lock = true)
    usersRepo.setSelectedGroup(ctx.from.id, group.id, group.school_id, true);
    await ctx.answerCallbackQuery({ text: `✅ ${group.name} saqlandi!` });

    await ctx.editMessageText(
      `✅ <b>Sinfingiz muvaffaqiyatli biriktirildi: ${escapeHtml(group.name)}</b>\n\n` +
      `🔒 <i>Profilingiz saqlandi va qulflandi. Endi doimiy ravishda o‘z sinfingiz dars jadvalini ko‘rib borishingiz mumkin.</i>\n\n` +
      `<i>O‘zgartirish faqat maktab admini orqali (/adminchiqarish) amalga oshiriladi.</i>`,
      { parse_mode: 'HTML' }
    );

    await ctx.reply(
      `Asosiy menyu faollashtirildi:`,
      { reply_markup: getStudentMainMenuKeyboard() }
    );

    const { formattedText } = scheduleService.getTodaySchedule(group.id);
    return replySafely(ctx, formattedText, { reply_markup: getScheduleActionKeyboard(group.id, 'today') });
  });

  // Callback: Sinfni o'zgartirish (user_change_sinf)
  bot.callbackQuery('user_change_sinf', async (ctx) => {
    await ctx.answerCallbackQuery().catch(() => {});
    const { user, schoolId } = getUserContext(ctx.from?.id);

    if (user?.is_role_locked) {
      const msg = user.role === 'teacher'
        ? `⚠️ Ustoz profilini o‘zgartira olmaysiz. Adminga murojaat qiling (/adminchiqarish).`
        : `⚠️ Sinf profilini o‘zgartira olmaysiz. Profilingiz qulflangan. Adminga murojaat qiling (/adminchiqarish).`;
      return ctx.reply(msg);
    }

    const groups = groupsRepo.getAllGroups(true, schoolId);
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
    const { user, school, group, schoolId } = getUserContext(ctx.from?.id);
    const groups = groupsRepo.getAllGroups(true, schoolId);

    if (group) {
      const keyboard = new InlineKeyboard()
        .text('📅 Bugungi jadval', `user_today_grp_${group.id}`)
        .text('🔔 Hozirgi dars', `user_now_grp_${group.id}`)
        .row()
        .text('📆 Ertangi jadval', `user_tmr_grp_${group.id}`)
        .text('📚 Haftalik jadval', `user_week_grp_${group.id}`)
        .row()
        .text('🔄 Maktab / Sinfni almashtirish', 'user_reset_profile_prompt');

      return ctx.editMessageText(
        `🏫 <b>Maktab:</b> ${escapeHtml(school?.name || 'Maktab')} (Kodi: <code>${school?.code || 'M-01'}</code>)\n` +
        `👥 <b>Sizning sinfingiz:</b> <b>${escapeHtml(group.name)}</b>`,
        { parse_mode: 'HTML', reply_markup: keyboard }
      );
    }

    const keyboard = getClassesGridInlineKeyboard(groups, 'user_bind_sinf_');
    keyboard.row().text('🔄 Boshqa maktabni tanlash', 'user_change_school');
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

  bot.hears(['🔔 Hozirgi dars', '🔔 Hozirgi darsim', 'Hozirgi dars', 'Hozirgi darsim', 'hozir'], async (ctx) => {
    if (ctx.chat.type !== 'private') return;

    const { user, group, schoolId } = getUserContext(ctx.from?.id);

    if (!isUserAuthenticated(user, ctx.from?.id)) {
      return sendUnauthenticatedPrompt(ctx, 'Hozirgi darsni');
    }

    // Agar foydalanuvchi Ustoz bo'lsa
    if (user?.role === 'teacher' && user?.selected_teacher_id) {
       const { formattedText } = scheduleService.getTeacherCurrentLesson(user.selected_teacher_id, schoolId);
      return replySafely(ctx, formattedText, { reply_markup: getTeacherMainMenuKeyboard() });
    }

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

    const { user, group, schoolId } = getUserContext(ctx.from?.id);

    if (!isUserAuthenticated(user, ctx.from?.id)) {
      return sendUnauthenticatedPrompt(ctx, 'Hozirgi darsni');
    }

    if (user?.role === 'teacher' && user?.selected_teacher_id) {
      const { formattedText } = scheduleService.getTeacherCurrentLesson(user.selected_teacher_id, schoolId);
      return replySafely(ctx, formattedText, { reply_markup: getTeacherMainMenuKeyboard() });
    }

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
  // 📅 BUGUNGI JADVAL / BUGUNGI DARSLARIM
  // ==========================================

  bot.hears(['📅 Bugungi jadval', '📅 Bugungi darslarim', 'Bugungi jadval', 'Bugungi darslarim', 'bugun'], async (ctx) => {
    if (ctx.chat.type !== 'private') return;

    const { user, group, schoolId } = getUserContext(ctx.from?.id);

    if (!isUserAuthenticated(user, ctx.from?.id)) {
      return sendUnauthenticatedPrompt(ctx, 'Bugungi dars jadvalini');
    }

    // Agar Ustoz bo'lsa -> ustozning bugungi darslari va qaysi sinflarda darsi borligi
    if (user?.role === 'teacher' && user?.selected_teacher_id) {
      const { formattedText } = scheduleService.getTeacherTodaySchedule(user.selected_teacher_id, schoolId);
      return replySafely(ctx, formattedText, { reply_markup: getTeacherMainMenuKeyboard() });
    }

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

  // /darsjadvali, /today, /bugun buyruqlari
  bot.command(['darsjadvali', 'today', 'bugun', 'schedule'], async (ctx) => {
    if (ctx.chat.type !== 'private') return;

    const { user, group, schoolId } = getUserContext(ctx.from?.id);

    if (!isUserAuthenticated(user, ctx.from?.id)) {
      return sendUnauthenticatedPrompt(ctx, 'Bugungi dars jadvalini');
    }

    if (user?.role === 'teacher' && user?.selected_teacher_id) {
      const { formattedText } = scheduleService.getTeacherTodaySchedule(user.selected_teacher_id, schoolId);
      return replySafely(ctx, formattedText, { reply_markup: getTeacherMainMenuKeyboard() });
    }

    if (group) {
      const { formattedText } = scheduleService.getTodaySchedule(group.id);
      return replySafely(ctx, formattedText, { reply_markup: getScheduleActionKeyboard(group.id, 'today') });
    }

    const groups = groupsRepo.getAllGroups(true, schoolId);
    const keyboard = getClassesGridInlineKeyboard(groups, 'user_today_grp_', true);
    return ctx.reply(`👥 <b>Qaysi sinf bo‘yicha bugungi dars jadvalini ko‘rmoqchisiz?</b>`, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  });

  // ==========================================
  // 📆 ERTANGI JADVAL / ERTANGI DARSLARIM
  // ==========================================

  bot.hears(['📆 Ertangi jadval', '📆 Ertangi darslarim', 'Ertangi jadval', 'Ertangi darslarim', 'ertaga'], async (ctx) => {
    if (ctx.chat.type !== 'private') return;

    const { user, group, schoolId } = getUserContext(ctx.from?.id);

    if (!isUserAuthenticated(user, ctx.from?.id)) {
      return sendUnauthenticatedPrompt(ctx, 'Ertangi dars jadvalini');
    }

    if (user?.role === 'teacher' && user?.selected_teacher_id) {
      const { formattedText } = scheduleService.getTeacherTomorrowSchedule(user.selected_teacher_id, schoolId);
      return replySafely(ctx, formattedText, { reply_markup: getTeacherMainMenuKeyboard() });
    }

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

  bot.command(['ertaga', 'tomorrow'], async (ctx) => {
    if (ctx.chat.type !== 'private') return;

    const { user, group, schoolId } = getUserContext(ctx.from?.id);

    if (!isUserAuthenticated(user, ctx.from?.id)) {
      return sendUnauthenticatedPrompt(ctx, 'Ertangi dars jadvalini');
    }

    if (user?.role === 'teacher' && user?.selected_teacher_id) {
      const { formattedText } = scheduleService.getTeacherTomorrowSchedule(user.selected_teacher_id, schoolId);
      return replySafely(ctx, formattedText, { reply_markup: getTeacherMainMenuKeyboard() });
    }

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
  // 📚 HAFTALIK JADVAL / HAFTALIK DARSLARIM
  // ==========================================

  bot.hears(['📚 Haftalik jadval', '📚 Haftalik dars jadvalim', 'Haftalik jadval', 'Haftalik dars jadvalim', 'hafta'], async (ctx) => {
    if (ctx.chat.type !== 'private') return;

    const { user, group, schoolId } = getUserContext(ctx.from?.id);

    if (!isUserAuthenticated(user, ctx.from?.id)) {
      return sendUnauthenticatedPrompt(ctx, 'Haftalik dars jadvalini');
    }

    if (user?.role === 'teacher' && user?.selected_teacher_id) {
      const { formattedText } = scheduleService.getTeacherWeeklySchedule(user.selected_teacher_id, schoolId);
      return replySafely(ctx, formattedText, { reply_markup: getTeacherMainMenuKeyboard() });
    }

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

  bot.command(['hafta', 'week', 'weekly'], async (ctx) => {
    if (ctx.chat.type !== 'private') return;

    const { user, group, schoolId } = getUserContext(ctx.from?.id);

    if (!isUserAuthenticated(user, ctx.from?.id)) {
      return sendUnauthenticatedPrompt(ctx, 'Haftalik dars jadvalini');
    }

    if (user?.role === 'teacher' && user?.selected_teacher_id) {
      const { formattedText } = scheduleService.getTeacherWeeklySchedule(user.selected_teacher_id, schoolId);
      return replySafely(ctx, formattedText, { reply_markup: getTeacherMainMenuKeyboard() });
    }

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

  // Ustozlar uchun dars jadvali callback query lari
  bot.callbackQuery(/^user_tch_today_(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery().catch(() => {});
    const teacherId = parseInt(ctx.match[1], 10);
    const { schoolId } = getUserContext(ctx.from?.id);
    const { formattedText } = scheduleService.getTeacherTodaySchedule(teacherId, schoolId);
    const keyboard = new InlineKeyboard()
      .text('📅 Bugungi darslarim', `user_tch_today_${teacherId}`)
      .text('📆 Ertangi darslarim', `user_tch_tmr_${teacherId}`)
      .row()
      .text('📚 Haftalik jadvalim', `user_tch_week_${teacherId}`);
    await editOrReplySafely(ctx, formattedText, { reply_markup: keyboard });
  });

  bot.callbackQuery(/^user_tch_tmr_(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery().catch(() => {});
    const teacherId = parseInt(ctx.match[1], 10);
    const { schoolId } = getUserContext(ctx.from?.id);
    const { formattedText } = scheduleService.getTeacherTomorrowSchedule(teacherId, schoolId);
    const keyboard = new InlineKeyboard()
      .text('📅 Bugungi darslarim', `user_tch_today_${teacherId}`)
      .text('📆 Ertangi darslarim', `user_tch_tmr_${teacherId}`)
      .row()
      .text('📚 Haftalik jadvalim', `user_tch_week_${teacherId}`);
    await editOrReplySafely(ctx, formattedText, { reply_markup: keyboard });
  });

  bot.callbackQuery(/^user_tch_week_(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery().catch(() => {});
    const teacherId = parseInt(ctx.match[1], 10);
    const { schoolId } = getUserContext(ctx.from?.id);
    const { formattedText } = scheduleService.getTeacherWeeklySchedule(teacherId, schoolId);
    const keyboard = new InlineKeyboard()
      .text('📅 Bugungi darslarim', `user_tch_today_${teacherId}`)
      .text('📆 Ertangi darslarim', `user_tch_tmr_${teacherId}`)
      .row()
      .text('📚 Haftalik jadvalim', `user_tch_week_${teacherId}`);
    await editOrReplySafely(ctx, formattedText, { reply_markup: keyboard });
  });
}
