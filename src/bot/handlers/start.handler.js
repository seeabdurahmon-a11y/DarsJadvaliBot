import { BOT_TEXTS } from '../../config/constants.js';
import { InlineKeyboard } from 'grammy';
import { 
  getRoleSelectionInlineKeyboard, 
  getSchoolsSelectionInlineKeyboard,
  getStudentMainMenuKeyboard, 
  getTeacherMainMenuKeyboard, 
  getClassesGridInlineKeyboard, 
  getTeachersGridInlineKeyboard, 
  getWebAppInlineKeyboard 
} from '../keyboards/user.keyboard.js';
import { getAdminMainMenuKeyboard } from '../keyboards/admin.keyboard.js';
import { schoolsRepo } from '../../database/schools.repo.js';
import { groupsRepo } from '../../database/groups.repo.js';
import { teachersRepo } from '../../database/teachers.repo.js';
import { usersRepo } from '../../database/users.repo.js';
import { scheduleService } from '../../services/schedule.service.js';
import { adminAuthService } from '../../services/admin-auth.service.js';
import { adminService } from '../../services/admin.service.js';
import { escapeHtml } from '../../utils/formatter.js';
import { replySafely } from '../../utils/telegram-sender.util.js';
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

    // 0. Deep linking orqali zavuch kodi yuborilgan bo'lsa (masalan: /start zavuch yoki /start zavuch_code)
    if (startPayload && (startPayload.toLowerCase() === 'zavuch' || startPayload.toLowerCase().startsWith('zavuch_'))) {
      const subCode = startPayload.replace(/^zavuch_?/i, '').trim();
      if (subCode) {
        const verifyRes = adminAuthService.verifyZavuchCode(subCode);
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
            `✅ Siz tizimga <b>${escapeHtml(school.name)}</b> administratori sifatida muvaffaqiyatli ulandingiz!\n\n` +
            `Quyidagi menyu orqali maktab dars jadvallarini boshqarishingiz mumkin:`,
            {
              parse_mode: 'HTML',
              reply_markup: getAdminMainMenuKeyboard()
            }
          );
        }
      }

      adminService.setSession(ctx.from.id, { action: 'AWAITING_ZAVUCH_CODE' });
      return ctx.reply(
        `👑 <b>Zavuch (Admin) Bo‘limi</b>\n\n` +
        `🔐 Iltimos, maktab boshqaruvchi <b>Zavuch maxsus kodi yoki paroli</b>ni kiriting:\n\n` +
        `<i>(Kodni xabar sifatida yozib yuboring)</i>`,
        { parse_mode: 'HTML' }
      );
    }

    // 1. Deep linking orqali maktab kodi yuborilgan bo'lsa (masalan: /start code_M01 yoki /start M-01)
    if (startPayload) {
      const cleanCode = startPayload.replace(/^code_/, '').trim();
      const school = schoolsRepo.getSchoolByCode(cleanCode);
      if (school) {
        usersRepo.setSelectedSchool(ctx.from.id, school.id);
        await ctx.reply(
          `🏫 <b>Maktab ulandi: ${escapeHtml(school.name)}</b> (Kodi: <code>${school.code}</code>)\n\n` +
          `Iltimos, botdan foydalanish uchun kimligingizni tanlang:`,
          { parse_mode: 'HTML', reply_markup: getRoleSelectionInlineKeyboard(school) }
        );
        return;
      }
    }

    // 2. Foydalanuvchi ma'lumotlarini bazadan olish
    const user = usersRepo.getUserByTelegramId(ctx.from.id);

    // Agar foydalanuvchi allaqachon Zavuch (Admin) bo'lsa -> To'g'ridan-to'g'ri Admin menyusi (Rol so'ralmaydi!)
    if (adminAuthService.isUserAdmin(ctx.from.id) || user?.is_admin === 1 || user?.role === 'zavuch' || user?.role === 'admin') {
      adminAuthService.extendSession(ctx.from.id);
      return ctx.reply(
        `👑 <b>Assalomu alaykum, Hurmatli Zavuch (${escapeHtml(user?.first_name || 'Admin')})!</b>\n\n` +
        `🏫 Maktab: <b>${escapeHtml(user?.selected_school_name || '1-umumiy o‘rta ta’lim maktabi')}</b>\n\n` +
        `Maktab boshqaruv menyusi:`,
        {
          parse_mode: 'HTML',
          reply_markup: getAdminMainMenuKeyboard()
        }
      );
    }

    // Agar foydalanuvchi allaqachon Ustoz sifatida biriktirilgan bo'lsa
    if (user?.role === 'teacher' && user?.selected_teacher_id) {
      const teacher = teachersRepo.getTeacherById(user.selected_teacher_id);
      const teacherName = teacher ? `${teacher.last_name} ${teacher.first_name}` : 'Ustoz';
      
      await ctx.reply(
        `👨‍🏫 <b>Assalomu alaykum, Hurmatli ${escapeHtml(teacherName)} ustoz!</b>\n\n` +
        `🏫 Maktab: <b>${escapeHtml(user.selected_school_name || 'Maktab')}</b>\n` +
        `📚 Siz <b>${escapeHtml(teacher?.subject || 'O‘qituvchi')}</b> ustozi sifatida biriktirilgansiz.\n` +
        `Quyidagi menyu orqali dars jadvalingizni ko‘rishingiz mumkin:`,
        {
          parse_mode: 'HTML',
          reply_markup: getTeacherMainMenuKeyboard()
        }
      );

      // Bugungi jadvalni darhol chiqarib beramiz
      const { formattedText } = scheduleService.getTeacherTodaySchedule(user.selected_teacher_id, user.selected_school_id);
      return replySafely(ctx, formattedText, { reply_markup: getTeacherMainMenuKeyboard() });
    }

    // Agar foydalanuvchi allaqachon O'quvchi sifatida sinfga biriktirilgan bo'lsa
    if (user?.role === 'student' && user?.selected_group_id) {
      await ctx.reply(
        `👨‍🎓 <b>Assalomu alaykum!</b>\n` +
        `Sizning sinfingiz: <b>${escapeHtml(user.selected_group_name || 'Sinf')}</b>\n` +
        `🏫 Maktab: <b>${escapeHtml(user.selected_school_name || 'Maktab')}</b>\n\n` +
        `Dars jadvalini ko‘rish uchun quyidagi tugmalardan foydalaning:`,
        {
          parse_mode: 'HTML',
          reply_markup: getStudentMainMenuKeyboard()
        }
      );

      // Bugungi jadvalni darhol chiqarib beramiz
      const { formattedText } = scheduleService.getTodaySchedule(user.selected_group_id, user.selected_school_id);
      return replySafely(ctx, formattedText, { reply_markup: getStudentMainMenuKeyboard() });
    }

    // 3. Agar foydalanuvchi hali maktab tanlamagan bo'lsa
    const schools = schoolsRepo.getAllSchools(true);
    let selectedSchool = user?.selected_school_id ? schoolsRepo.getSchoolById(user.selected_school_id) : null;

    if (!selectedSchool) {
      if (schools.length === 1) {
        selectedSchool = schools[0];
        usersRepo.setSelectedSchool(ctx.from.id, selectedSchool.id);
      } else if (schools.length > 1) {
        // Maktablar bir nechta bo'lsa, avval maktabni tanlashni so'raymiz
        const keyboard = getSchoolsSelectionInlineKeyboard(schools);
        return ctx.reply(
          `🎓 <b>Assalomu alaykum! Maktab elektron dars jadvali botiga xush kelibsiz.</b>\n\n` +
          `🏫 Iltimos, avval <b>o‘z maktabingizni tanlang</b> yoki maktab kodini yuboring (Masalan: <code>/kod M-01</code>):`,
          {
            parse_mode: 'HTML',
            reply_markup: keyboard
          }
        );
      }
    }

    // Rol tanlashni so'raymiz!
    const schoolInfo = selectedSchool ? `\n🏫 Maktab: <b>${escapeHtml(selectedSchool.name)}</b> (Kodi: <code>${selectedSchool.code}</code>)\n` : '';
    await ctx.reply(
      `🎓 <b>Assalomu alaykum! Maktab elektron dars jadvali botiga xush kelibsiz.</b>\n` +
      `${schoolInfo}\n` +
      `Botdan to‘g‘ri foydalanish uchun kimligingizni tanlang:`,
      {
        parse_mode: 'HTML',
        reply_markup: getRoleSelectionInlineKeyboard(selectedSchool)
      }
    );
  });

  // ==========================================
  // 🎭 ROL TANLASH CALLBACK QUERY-LARI
  // ==========================================

  // 1. O'quvchi tanlanganda
  bot.callbackQuery('user_role_student', async (ctx) => {
    await ctx.answerCallbackQuery().catch(() => {});
    const user = usersRepo.getUserByTelegramId(ctx.from.id);

    // Agar foydalanuvchi allaqachon ustoz sifatida qulflangan bo'lsa
    if (user?.is_role_locked && user?.role === 'teacher' && user?.selected_teacher_id) {
      return ctx.reply(
        `⚠️ <b>Siz allaqachon Ustoz sifatida qulflangansiz!</b>\n\n` +
        `Profilni qaytadan sozlash uchun /reset buyrug‘ini yuboring.`,
        { parse_mode: 'HTML' }
      );
    }

    // Agar foydalanuvchi allaqachon o'quvchi sifatida qulflangan bo'lsa
    if (user?.is_role_locked && user?.role === 'student' && user?.selected_group_id) {
      return ctx.reply(
        `⚠️ <b>Siz allaqachon biriktirilgansiz: ${escapeHtml(user.selected_group_name || 'Sinf')}</b>\n\n` +
        `Sinf yoki maktabni almashtirish uchun /reset buyrug‘idan foydalaning.`,
        { parse_mode: 'HTML', reply_markup: getStudentMainMenuKeyboard() }
      );
    }

    // Agar maktab tanlanmagan bo'lsa, avval maktabni so'raymiz
    let schoolId = user?.selected_school_id;
    if (!schoolId) {
      const schools = schoolsRepo.getAllSchools(true);
      if (schools.length === 1) {
        schoolId = schools[0].id;
        usersRepo.setSelectedSchool(ctx.from.id, schoolId);
      } else if (schools.length > 1) {
        const keyboard = getSchoolsSelectionInlineKeyboard(schools);
        return ctx.editMessageText(
          `🏫 <b>Iltimos, avval o‘z maktabingizni tanlang:</b>`,
          { parse_mode: 'HTML', reply_markup: keyboard }
        );
      } else {
        schoolId = 1;
      }
    }

    usersRepo.setRole(ctx.from.id, 'student');
    const school = schoolsRepo.getSchoolById(schoolId);
    const groups = groupsRepo.getAllGroups(true, schoolId);

    const keyboard = getClassesGridInlineKeyboard(groups, 'user_bind_sinf_');
    keyboard.row().text('🔄 Boshqa maktabni tanlash', 'user_change_school');

    await ctx.editMessageText(
      `👨‍🎓 <b>O‘quvchi bo‘limi</b>\n` +
      `🏫 Maktab: <b>${escapeHtml(school?.name || 'Maktab')}</b>\n\n` +
      `O‘zingiz o‘qiydigan sinfni tanlang:\n\n` +
      `🔒 <i>Diqqat: Sinf tanlangach, profilingiz saqlanadi. Keyinchalik /reset buyrug‘i orqali o‘zgartirishingiz mumkin.</i>`,
      { parse_mode: 'HTML', reply_markup: keyboard }
    );
  });

  // 2. Ustoz tanlanganda
  bot.callbackQuery('user_role_teacher', async (ctx) => {
    await ctx.answerCallbackQuery().catch(() => {});
    const user = usersRepo.getUserByTelegramId(ctx.from.id);

    // Agar foydalanuvchi allaqachon boshqa ustoz sifatida qulflangan bo'lsa
    if (user?.is_role_locked && user?.role === 'teacher' && user?.selected_teacher_id) {
      const teacher = teachersRepo.getTeacherById(user.selected_teacher_id);
      const teacherName = teacher ? `${teacher.last_name} ${teacher.first_name}` : 'Ustoz';
      return ctx.reply(
        `⚠️ <b>Siz allaqachon biriktirilgansiz: ${escapeHtml(teacherName)}</b>\n\n` +
        `Ustozlik profilini qaytadan tanlash yoki maktabni o‘zgartirish uchun /reset buyrug‘ini yuboring.`,
        { parse_mode: 'HTML', reply_markup: getTeacherMainMenuKeyboard() }
      );
    }

    // Agar maktab tanlanmagan bo'lsa, avval maktabni so'raymiz
    let schoolId = user?.selected_school_id;
    if (!schoolId) {
      const schools = schoolsRepo.getAllSchools(true);
      if (schools.length === 1) {
        schoolId = schools[0].id;
        usersRepo.setSelectedSchool(ctx.from.id, schoolId);
      } else if (schools.length > 1) {
        const keyboard = getSchoolsSelectionInlineKeyboard(schools);
        return ctx.editMessageText(
          `🏫 <b>Hurmatli Ustoz, avval o‘z maktabingizni tanlang:</b>`,
          { parse_mode: 'HTML', reply_markup: keyboard }
        );
      } else {
        schoolId = 1;
      }
    }

    usersRepo.setRole(ctx.from.id, 'teacher');
    const school = schoolsRepo.getSchoolById(schoolId);
    const teachers = teachersRepo.getAllTeachers(schoolId);

    if (!teachers || teachers.length === 0) {
      const keyboard = new InlineKeyboard()
        .text('🔄 Boshqa maktabni tanlash', 'user_change_school');
      return ctx.editMessageText(
        `⚠️ <b>${escapeHtml(school?.name || 'Maktab')}da hozircha o‘qituvchilar ro‘yxati kiritilmagan.</b>\n\n` +
        `Iltimos, maktab adminiga murojaat qiling yoki boshqa maktabni tanlang:`,
        { parse_mode: 'HTML', reply_markup: keyboard }
      );
    }

    const keyboard = getTeachersGridInlineKeyboard(teachers, 'user_bind_tch_');
    keyboard.row().text('🔄 Boshqa maktabni tanlash', 'user_change_school');

    await ctx.editMessageText(
      `👨‍🏫 <b>Hurmatli Ustoz!</b>\n` +
      `🏫 Maktab: <b>${escapeHtml(school?.name || 'Maktab')}</b>\n\n` +
      `Quyidagi ro‘yxatdan o‘zingizning ism-familiyangizni tanlang:\n\n` +
      `🔒 <i>Diqqat: Ustozlik profili tanlangach saqlanadi. Keyinchalik /reset buyrug‘i orqali o‘zgartirishingiz mumkin.</i>`,
      { parse_mode: 'HTML', reply_markup: keyboard }
    );
  });

  // 3. Ustoz nomini tanlash (user_bind_tch_<id>)
  bot.callbackQuery(/^user_bind_tch_(\d+)$/, async (ctx) => {
    const teacherId = parseInt(ctx.match[1], 10);
    const teacher = teachersRepo.getTeacherById(teacherId);

    if (!teacher) {
      return ctx.answerCallbackQuery({ text: 'O‘qituvchi topilmadi', show_alert: true });
    }

    const user = usersRepo.getUserByTelegramId(ctx.from.id);
    if (user?.is_role_locked && user?.role === 'teacher' && user?.selected_teacher_id && user.selected_teacher_id !== teacherId) {
      return ctx.answerCallbackQuery({
        text: 'Siz allaqachon boshqa ustozga biriktirilgansiz va uni o‘zgartira olmaysiz!',
        show_alert: true
      });
    }

    // Ustozni biriktiramiz va qulflaymiz (lock = true)
    usersRepo.setSelectedTeacher(ctx.from.id, teacher.id, true);
    await ctx.answerCallbackQuery({ text: `✅ ${teacher.last_name} ${teacher.first_name} saqlandi!` });

    await ctx.editMessageText(
      `✅ <b>Hurmatli ${escapeHtml(teacher.first_name)} ${escapeHtml(teacher.last_name)}!</b>\n\n` +
      `Siz tizimga <b>${escapeHtml(teacher.subject || 'O‘qituvchi')}</b> ustozi sifatida muvaffaqiyatli biriktirildingiz.\n\n` +
      `🔒 <i>Profilingiz saqlandi va qulflandi. Endi doimiy ravishda o‘z dars jadvalingizni va qaysi sinfda darsingiz borligini ko‘rib borishingiz mumkin.</i>`,
      { parse_mode: 'HTML' }
    );

    await ctx.reply(
      `Asosiy menyu faollashtirildi:`,
      { reply_markup: getTeacherMainMenuKeyboard() }
    );

    // Bugungi jadvalni darhol ko'rsatamiz
    const { formattedText } = scheduleService.getTeacherTodaySchedule(teacher.id, teacher.school_id);
    const actionKeyboard = new InlineKeyboard()
      .text('📅 Bugungi darslarim', `user_tch_today_${teacher.id}`)
      .text('📆 Ertangi darslarim', `user_tch_tmr_${teacher.id}`)
      .row()
      .text('📚 Haftalik jadvalim', `user_tch_week_${teacher.id}`);
    return replySafely(ctx, formattedText, { reply_markup: actionKeyboard });
  });

  // 4. Zavuch (Admin kodi) tanlanganda
  bot.callbackQuery('user_role_zavuch', async (ctx) => {
    await ctx.answerCallbackQuery().catch(() => {});
    adminService.setSession(ctx.from.id, { action: 'AWAITING_ZAVUCH_CODE' });

    await ctx.editMessageText(
      `👑 <b>Zavuch (Maktab Admini) Bo‘limi</b>\n\n` +
      `🔐 Iltimos, maktab boshqaruvchisi uchun berilgan <b>maxsus Zavuch kodi yoki paroli</b>ni kiriting:\n\n` +
      `<i>(Kodni xabar sifatida yozib yuboring)</i>`,
      { parse_mode: 'HTML' }
    );
  });

  // /zavuch, /kodzavuch, /maktabadmin buyruqlari
  bot.command(['zavuch', 'kodzavuch', 'maktabadmin'], async (ctx) => {
    if (ctx.chat.type !== 'private') return;

    const input = ctx.match?.trim();
    if (input) {
      const verifyRes = adminAuthService.verifyZavuchCode(input);
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
          `✅ Siz tizimga <b>${escapeHtml(school.name)}</b> administratori sifatida muvaffaqiyatli ulandingiz!\n\n` +
          `Quyidagi menyu orqali maktab dars jadvallarini boshqarishingiz mumkin:`,
          {
            parse_mode: 'HTML',
            reply_markup: getAdminMainMenuKeyboard()
          }
        );
      } else {
        return ctx.reply(`⛔️ <b>Kiritilgan Zavuch kodi noto‘g‘ri!</b>\nIltimos, qaytadan tekshirib kiriting.`, { parse_mode: 'HTML' });
      }
    }

    adminService.setSession(ctx.from.id, { action: 'AWAITING_ZAVUCH_CODE' });
    await ctx.reply(
      `👑 <b>Zavuch (Maktab Admini) Bo‘limi</b>\n\n` +
      `🔐 Iltimos, maktab boshqaruvchi <b>Zavuch maxsus kodi yoki paroli</b>ni kiriting:\n\n` +
      `<i>(Kodni xabar sifatida yozib yuboring)</i>`,
      { parse_mode: 'HTML' }
    );
  });

  // Callback: Maktab tanlanganda (user_select_sch_<id>)
  bot.callbackQuery(/^user_select_sch_(\d+)$/, async (ctx) => {
    const schoolId = parseInt(ctx.match[1], 10);
    const school = schoolsRepo.getSchoolById(schoolId);

    if (!school) {
      return ctx.answerCallbackQuery({ text: 'Maktab topilmadi', show_alert: true });
    }

    // Yangi maktab tanlanganda avvalgi rolni tozalaymiz
    usersRepo.releaseUserRole(ctx.from.id);
    usersRepo.setSelectedSchool(ctx.from.id, school.id);
    await ctx.answerCallbackQuery({ text: `✅ ${school.name} tanlandi!` });

    await ctx.editMessageText(
      `🏫 <b>Maktab tanlandi: ${escapeHtml(school.name)}</b> (Kodi: <code>${school.code}</code>)\n\n` +
      `Iltimos, botdan to‘g‘ri foydalanish uchun kimligingizni tanlang:`,
      { parse_mode: 'HTML', reply_markup: getRoleSelectionInlineKeyboard(school) }
    );
  });

  // Callback: Maktabni almashtirish (user_change_school)
  bot.callbackQuery('user_change_school', async (ctx) => {
    await ctx.answerCallbackQuery().catch(() => {});
    const schools = schoolsRepo.getAllSchools(true);
    const keyboard = getSchoolsSelectionInlineKeyboard(schools);

    await ctx.editMessageText(
      `🏫 <b>O‘z maktabingizni tanlang:</b>\n\n` +
      `Yoki maktab kodini to‘g‘ridan-to‘g‘ri yozing (Masalan: <code>/kod M-01</code> yoki <code>/kod M-02</code>):`,
      { parse_mode: 'HTML', reply_markup: keyboard }
    );
  });

  // Callback: Profilni qayta sozlash so'rovi (user_reset_profile_prompt)
  bot.callbackQuery('user_reset_profile_prompt', async (ctx) => {
    await ctx.answerCallbackQuery().catch(() => {});
    const keyboard = new InlineKeyboard()
      .text('✅ Ha, qayta sozlash', 'user_confirm_reset_profile')
      .text('❌ Bekor qilish', 'user_cancel_reset_profile');

    await ctx.reply(
      `🔄 <b>Profilingizni qayta sozlamoqchimisiz?</b>\n\n` +
      `Siz yangitdan o‘z maktabingiz va ustozlik/o‘quvchilik profilingizni tanlashingiz mumkin bo‘ladi.`,
      { parse_mode: 'HTML', reply_markup: keyboard }
    );
  });

  // Callback: Profilni qayta sozlashni tasdiqlash (user_confirm_reset_profile)
  bot.callbackQuery('user_confirm_reset_profile', async (ctx) => {
    await ctx.answerCallbackQuery({ text: 'Profil tozalandi!' });
    usersRepo.releaseUserRole(ctx.from.id);
    usersRepo.setSelectedSchool(ctx.from.id, null);

    const schools = schoolsRepo.getAllSchools(true);
    if (schools.length > 1) {
      const keyboard = getSchoolsSelectionInlineKeyboard(schools);
      await ctx.editMessageText(
        `🔄 <b>Profilingiz muvaffaqiyatli tozalandi!</b>\n\n` +
        `🏫 Iltimos, o‘z <b>maktabingizni tanlang</b>:`,
        { parse_mode: 'HTML', reply_markup: keyboard }
      );
    } else {
      if (schools.length === 1) {
        usersRepo.setSelectedSchool(ctx.from.id, schools[0].id);
      }
      await ctx.editMessageText(
        `🔄 <b>Profilingiz muvaffaqiyatli tozalandi!</b>\n\n` +
        `Iltimos, kimligingizni tanlang:`,
        { parse_mode: 'HTML', reply_markup: getRoleSelectionInlineKeyboard(schools[0] || null) }
      );
    }
  });

  // Callback: Profilni qayta sozlashni bekor qilish (user_cancel_reset_profile)
  bot.callbackQuery('user_cancel_reset_profile', async (ctx) => {
    await ctx.answerCallbackQuery({ text: 'Bekor qilindi' });
    await ctx.editMessageText(`✅ Qayta sozlash bekor qilindi.`);
  });

  // /reset, /chiqish, /logout, /qaytatashkil buyruqlari
  bot.command(['reset', 'chiqish', 'logout', 'qaytatashkil'], async (ctx) => {
    if (ctx.chat.type !== 'private') return;

    usersRepo.releaseUserRole(ctx.from.id);
    usersRepo.setSelectedSchool(ctx.from.id, null);

    const schools = schoolsRepo.getAllSchools(true);
    let keyboard;
    let text = `🔄 <b>Profilingiz muvaffaqiyatli tozalandi!</b>\n\n`;

    if (schools.length > 1) {
      keyboard = getSchoolsSelectionInlineKeyboard(schools);
      text += `🏫 Iltimos, o‘z <b>maktabingizni tanlang</b> yoki kodini yuboring (Masalan: <code>/kod M-01</code>):`;
    } else {
      if (schools.length === 1) {
        usersRepo.setSelectedSchool(ctx.from.id, schools[0].id);
      }
      keyboard = getRoleSelectionInlineKeyboard(schools[0] || null);
      text += `Iltimos, kimligingizni tanlang:`;
    }

    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard });
  });

  // /kod, /maktab, /code buyruqlari
  bot.command(['kod', 'maktab', 'code', 'school'], async (ctx) => {
    if (ctx.chat.type !== 'private') return;

    const input = ctx.match?.trim();

    // 1. Foydalanuvchi kodni to'g'ridan-to'g'ri yozgan bo'lsa (masalan: /kod M-01 yoki /kod 12)
    if (input) {
      const school = schoolsRepo.getSchoolByCode(input);
      if (school) {
        usersRepo.releaseUserRole(ctx.from.id);
        usersRepo.setSelectedSchool(ctx.from.id, school.id);
        return ctx.reply(
          `✅ <b>Maktab muvaffaqiyatli tanlandi: ${escapeHtml(school.name)}</b> (Kodi: <code>${school.code}</code>)\n\n` +
          `Iltimos, botdan to‘g‘ri foydalanish uchun kimligingizni tanlang:`,
          { parse_mode: 'HTML', reply_markup: getRoleSelectionInlineKeyboard(school) }
        );
      } else {
        return ctx.reply(
          `⚠️ <b>"${escapeHtml(input)}"</b> kodli maktab topilmadi.\n\n` +
          `Iltimos, maktab kodini to‘g‘ri kiriting (Masalan: <code>/kod M-01</code> yoki <code>/kod M-02</code>).`,
          { parse_mode: 'HTML' }
        );
      }
    }

    // 2. Parametrsiz chaqirilganda: Ro'yxatni tugmalar orqali chiqarish
    const user = usersRepo.getUserByTelegramId(ctx.from.id);
    const schools = schoolsRepo.getAllSchools(true);

    let text = `🏫 <b>Maktabingizni tanlang yoki kodini kiriting:</b>\n\n` +
      `Masalan: <code>/kod M-01</code> yoki <code>/kod M-02</code>\n\n`;

    if (user?.selected_school_name) {
      text += `📌 Joriy maktabingiz: <b>${escapeHtml(user.selected_school_name)}</b> (Kodi: <code>${user.selected_school_code}</code>)\n\n`;
    }

    const keyboard = getSchoolsSelectionInlineKeyboard(schools);
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard });
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
      `🔹 <code>/sinf 11-D</code> — O‘z sinfingizni biriktirish (O‘quvchilar uchun)\n` +
      `🔹 <code>/hozir</code> — Hozir qaysi dars ketayotganini ko‘rish\n` +
      `🔹 <code>/darsjadvali</code> — Bugungi dars jadvalini olish\n` +
      `🔹 <code>/eslatma</code> — Darsdan 5 daqiqa oldin eslatma sozlamalari\n` +
      `🔹 <code>/schedule</code> — Dars jadvalini ko‘rish\n` +
      `🔹 <code>/cods</code> — Barcha buyruqlar ro‘yxati\n\n` +
      `👥 <b>Guruh buyruqlari (Sinf guruhlari uchun):</b>\n` +
      `🔹 <code>/kod M-01 11-D</code> — Guruhni maktab va sinfga ulash <i>(Admin)</i>\n` +
      `🔹 <code>/setclass 11-D</code> — Guruhni sinfga biriktirish <i>(Admin)</i>\n` +
      `🔹 <code>/hozir</code> — Guruhning hozirgi darsini ko‘rish\n` +
      `🔹 <code>/darsjadvali</code> — Guruhning bugungi jadvalini olish\n` +
      `🔹 <code>/resend</code> — Guruhga jadvalni qaytadan yuborish <i>(Admin)</i>\n\n` +
      `👑 <b>Admin buyruqlari:</b>\n` +
      `🔹 <code>/admin</code> — Admin boshqaruv panelini ochish\n` +
      `🔹 <code>/adminchiqarish [id]</code> — Foydalanuvchi yoki ustozni bo‘shatish/chiqarish\n`;

    await ctx.reply(helpText, { parse_mode: 'HTML' });
  });

  // ℹ️ Bot haqida tugmasi
  bot.hears('ℹ️ Bot haqida', async (ctx) => {
    await ctx.reply(BOT_TEXTS.ABOUT, { parse_mode: 'HTML' });
  });
}
