import { BOT_TEXTS } from '../../config/constants.js';
import { 
  getRoleSelectionInlineKeyboard, 
  getStudentMainMenuKeyboard, 
  getTeacherMainMenuKeyboard, 
  getClassesGridInlineKeyboard, 
  getTeachersGridInlineKeyboard, 
  getWebAppInlineKeyboard 
} from '../keyboards/user.keyboard.js';
import { schoolsRepo } from '../../database/schools.repo.js';
import { groupsRepo } from '../../database/groups.repo.js';
import { teachersRepo } from '../../database/teachers.repo.js';
import { usersRepo } from '../../database/users.repo.js';
import { scheduleService } from '../../services/schedule.service.js';
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

    // 1. Deep linking orqali maktab kodi yuborilgan bo'lsa (masalan: /start code_M01 yoki /start M-01)
    if (startPayload) {
      const cleanCode = startPayload.replace(/^code_/, '').trim();
      const school = schoolsRepo.getSchoolByCode(cleanCode);
      if (school) {
        usersRepo.setSelectedSchool(ctx.from.id, school.id);
        await ctx.reply(
          `🏫 <b>Maktab ulandi: ${escapeHtml(school.name)}</b> (Kodi: <code>${school.code}</code>)\n\n` +
          `Iltimos, botdan foydalanish uchun kimligingizni tanlang:`,
          { parse_mode: 'HTML', reply_markup: getRoleSelectionInlineKeyboard() }
        );
        return;
      }
    }

    // 2. Foydalanuvchi ma'lumotlarini bazadan olish
    const user = usersRepo.getUserByTelegramId(ctx.from.id);

    // Agar foydalanuvchi allaqachon Ustoz sifatida biriktirilgan bo'lsa
    if (user?.role === 'teacher' && user?.selected_teacher_id) {
      const teacher = teachersRepo.getTeacherById(user.selected_teacher_id);
      const teacherName = teacher ? `${teacher.last_name} ${teacher.first_name}` : 'Ustoz';
      
      await ctx.reply(
        `👨‍🏫 <b>Assalomu alaykum, Hurmatli ${escapeHtml(teacherName)} ustoz!</b>\n\n` +
        `Siz <b>${escapeHtml(teacher?.subject || 'O‘qituvchi')}</b> ustozi sifatida biriktirilgansiz.\n` +
        `Quyidagi menyu orqali dars jadvalingizni ko‘rishingiz mumkin:`,
        {
          parse_mode: 'HTML',
          reply_markup: getTeacherMainMenuKeyboard()
        }
      );

      // Bugungi jadvalni darhol chiqarib beramiz
      const { formattedText } = scheduleService.getTeacherTodaySchedule(user.selected_teacher_id, user.selected_school_id);
      return replySafely(ctx, formattedText);
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
      const { formattedText } = scheduleService.getTodaySchedule(user.selected_group_id);
      return replySafely(ctx, formattedText);
    }

    // Agar foydalanuvchi hali rol tanlamagan bo'lsa -> Kimligini so'raymiz!
    await ctx.reply(
      `🎓 <b>Assalomu alaykum! Maktab elektron dars jadvali botiga xush kelibsiz.</b>\n\n` +
      `Botdan to‘g‘ri foydalanish uchun kimligingizni tanlang:`,
      {
        parse_mode: 'HTML',
        reply_markup: getRoleSelectionInlineKeyboard()
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
        `O‘quvchi roliga o‘tish uchun maktab admini /adminchiqarish qilishi kerak.`,
        { parse_mode: 'HTML' }
      );
    }

    usersRepo.setRole(ctx.from.id, 'student');
    const schoolId = user?.selected_school_id || 1;
    const groups = groupsRepo.getAllGroups(true, schoolId);

    const keyboard = getClassesGridInlineKeyboard(groups, 'user_bind_sinf_');
    await ctx.editMessageText(
      `👨‍🎓 <b>O‘quvchi bo‘limi</b>\n\n` +
      `O‘zingiz o‘qiydigan sinfni tanlang:`,
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
        `Ustozlik profilini mustaqil o‘zgartira olmaysiz. O‘zgartirish uchun maktab admini /adminchiqarish buyrug‘ini berishi kerak.`,
        { parse_mode: 'HTML', reply_markup: getTeacherMainMenuKeyboard() }
      );
    }

    const schoolId = user?.selected_school_id || 1;
    const teachers = teachersRepo.getAllTeachers(schoolId);

    if (!teachers || teachers.length === 0) {
      return ctx.editMessageText(
        `⚠️ <b>Maktabda o‘qituvchilar ro‘yxati topilmadi.</b>\n\n` +
        `Iltimos, maktab adminiga murojaat qiling yoki keyinroq qayta urinib ko‘ring.`,
        { parse_mode: 'HTML' }
      );
    }

    const keyboard = getTeachersGridInlineKeyboard(teachers, 'user_bind_tch_');
    await ctx.editMessageText(
      `👨‍🏫 <b>Hurmatli Ustoz!</b>\n\n` +
      `Quyidagi ro‘yxatdan o‘zingizning ism-familiyangizni tanlang:\n\n` +
      `🔒 <i>Diqqat: Ustozlik profili 1 marta tanlanadi va qulflanadi. O‘zgartirish faqat admin orqali amalga oshiriladi.</i>`,
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
    return replySafely(ctx, formattedText);
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
        return ctx.reply(
          `✅ <b>Maktab muvaffaqiyatli tanlandi: ${escapeHtml(school.name)}</b> (Kodi: <code>${school.code}</code>)\n\n` +
          `Iltimos, kimligingizni tanlang:`,
          { parse_mode: 'HTML', reply_markup: getRoleSelectionInlineKeyboard() }
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
