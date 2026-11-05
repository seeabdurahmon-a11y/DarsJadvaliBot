import { InlineKeyboard } from 'grammy';
import { examsRepo } from '../../database/exams.repo.js';
import { groupsRepo } from '../../database/groups.repo.js';
import { teachersRepo } from '../../database/teachers.repo.js';
import { usersRepo } from '../../database/users.repo.js';
import { schoolsRepo } from '../../database/schools.repo.js';
import { 
  getTeacherExamMenuKeyboard, 
  getExamClassesKeyboard, 
  getExamDateSelectionKeyboard, 
  getExamLessonNumberKeyboard, 
  getExamTypeKeyboard, 
  getExamDeleteKeyboard 
} from '../keyboards/exam.keyboard.js';
import { getSubjectEmoji, escapeHtml } from '../../utils/formatter.js';
import { getTodayInfo, getNowInTashkent, isValidDateFormat } from '../../utils/date.util.js';
import { DAYS_OF_WEEK } from '../../config/constants.js';
import { replySafely, editOrReplySafely } from '../../utils/telegram-sender.util.js';
import { logger } from '../../utils/logger.js';

// In-memory wizard sessiyalari (userId -> session)
const examSessions = new Map();

export function registerExamHandlers(bot) {
  // Yordamchi: Foydalanuvchi konteksti
  function getUserContext(telegramId) {
    if (!telegramId) return { user: null, school: null, group: null, teacher: null, schoolId: 1 };
    const user = usersRepo.getUserByTelegramId(telegramId);
    let schoolId = user?.selected_school_id || 1;
    let school = schoolsRepo.getSchoolById(schoolId) || schoolsRepo.getSchoolById(1);
    let group = null;
    let teacher = null;

    if (user?.selected_group_id) {
      group = groupsRepo.getGroupById(user.selected_group_id);
    }
    if (user?.selected_teacher_id) {
      teacher = teachersRepo.getTeacherById(user.selected_teacher_id);
    }

    return { user, school, group, teacher, schoolId: school?.id || 1 };
  }

  // =========================================================================
  // 1. USTOZ: NAZORAT ISHI BOSHQARUV MENYUSI
  // =========================================================================
  bot.hears(['📝 Nazorat ishi', 'Nazorat ishi', '/nazorat', '/exam', '/nazoratishi'], async (ctx) => {
    if (ctx.chat.type !== 'private') return;

    const { user, school, teacher, schoolId } = getUserContext(ctx.from?.id);

    // Agar foydalanuvchi O'quvchi bo'lsa -> O'quvchi nazorat ishlari ko'rinishiga yo'naltiramiz
    if (user?.role === 'student') {
      return handleStudentExams(ctx);
    }

    // Agar Ustoz bo'lmasa
    if (user?.role !== 'teacher' || !teacher) {
      return ctx.reply(
        `⚠️ <b>Ushbu bo‘lim maktab o‘qituvchilari (ustozlar) uchun mo‘ljallangan.</b>\n\n` +
        `Agar siz o‘qituvchi bo‘lsangiz, avval /start orqali 👨‍🏫 <b>Ustoz</b> rolingizni tanlang.`,
        { parse_mode: 'HTML' }
      );
    }

    const today = getTodayInfo();
    const upcomingExams = examsRepo.getExamsByTeacher(teacher.id, today.dateStr, schoolId);

    let text = `👨‍🏫 <b>NAZORAT ISHLARINI BOSHQARISH</b>\n\n` +
      `👤 <b>Ustoz:</b> <b>${escapeHtml(teacher.last_name)} ${escapeHtml(teacher.first_name)}</b>\n` +
      `📚 <b>Fan:</b> <b>${escapeHtml(teacher.subject || 'O‘qituvchi')}</b>\n` +
      `🏫 <b>Maktab:</b> ${escapeHtml(school?.name || 'Maktab')}\n\n`;

    if (upcomingExams.length === 0) {
      text += `📋 <i>Hozircha rejalashtirilgan nazorat ishlari mavjud emas.</i>\n\n`;
    } else {
      text += `📋 <b>Rejalashtirilgan nazorat ishlari (${upcomingExams.length} ta):</b>\n`;
      upcomingExams.slice(0, 5).forEach((ex, idx) => {
        const emoji = getSubjectEmoji(ex.subject);
        const lesText = ex.lesson_number ? ` (${ex.lesson_number}-dars)` : '';
        text += `${idx + 1}. 🗓 <b>${ex.date}</b> — <b>${escapeHtml(ex.group_name)}</b>: ${emoji} <i>${escapeHtml(ex.title || 'Nazorat ishi')}</i>${lesText}\n`;
      });
      if (upcomingExams.length > 5) {
        text += `<i>...va yana ${upcomingExams.length - 5} ta nazorat ishi.</i>\n`;
      }
      text += `\n`;
    }

    text += `Yangi nazorat ishi belgilash yoki mavjudlarini ko‘rish uchun quyidagi tugmalardan foydalaning:`;

    return ctx.reply(text, {
      parse_mode: 'HTML',
      reply_markup: getTeacherExamMenuKeyboard()
    });
  });

  // Callback: Bosh menyuga qaytish
  bot.callbackQuery('teacher_exam_menu', async (ctx) => {
    examSessions.delete(String(ctx.from.id));
    await ctx.answerCallbackQuery().catch(() => {});

    const { school, teacher, schoolId } = getUserContext(ctx.from?.id);
    if (!teacher) {
      return ctx.editMessageText(`⚠️ Ustoz profili topilmadi.`);
    }

    const today = getTodayInfo();
    const upcomingExams = examsRepo.getExamsByTeacher(teacher.id, today.dateStr, schoolId);

    let text = `👨‍🏫 <b>NAZORAT ISHLARINI BOSHQARISH</b>\n\n` +
      `👤 <b>Ustoz:</b> <b>${escapeHtml(teacher.last_name)} ${escapeHtml(teacher.first_name)}</b>\n` +
      `📚 <b>Fan:</b> <b>${escapeHtml(teacher.subject || 'O‘qituvchi')}</b>\n` +
      `🏫 <b>Maktab:</b> ${escapeHtml(school?.name || 'Maktab')}\n\n`;

    if (upcomingExams.length === 0) {
      text += `📋 <i>Hozircha rejalashtirilgan nazorat ishlari mavjud emas.</i>\n\n`;
    } else {
      text += `📋 <b>Rejalashtirilgan nazorat ishlari (${upcomingExams.length} ta):</b>\n`;
      upcomingExams.slice(0, 5).forEach((ex, idx) => {
        const emoji = getSubjectEmoji(ex.subject);
        const lesText = ex.lesson_number ? ` (${ex.lesson_number}-dars)` : '';
        text += `${idx + 1}. 🗓 <b>${ex.date}</b> — <b>${escapeHtml(ex.group_name)}</b>: ${emoji} <i>${escapeHtml(ex.title || 'Nazorat ishi')}</i>${lesText}\n`;
      });
      text += `\n`;
    }

    text += `Quyidagi amallardan birini tanlang:`;

    return editOrReplySafely(ctx, text, {
      parse_mode: 'HTML',
      reply_markup: getTeacherExamMenuKeyboard()
    });
  });

  // =========================================================================
  // 2. WIZARD: YANGI NAZORAT ISHI QO'SHISH BOSQICHLARI
  // =========================================================================

  // 1-QADAM: Yangi nazorat ishi boshlash (Sinfni tanlash)
  bot.callbackQuery('teacher_exam_new', async (ctx) => {
    await ctx.answerCallbackQuery().catch(() => {});
    const { user, teacher, schoolId } = getUserContext(ctx.from?.id);

    if (!teacher) {
      return ctx.editMessageText('⚠️ Ustoz profili biriktirilmagan.');
    }

    // Ustoz dars beradigan sinflarni aniqlash
    const teacherWeeklyLessons = teachersRepo.getTeacherWeeklyLessons(teacher.id, schoolId);
    const teacherGroupIds = [...new Set(teacherWeeklyLessons.map(l => l.group_id))];

    // Barcha sinflar
    const groups = groupsRepo.getAllGroups(true, schoolId);

    examSessions.set(String(ctx.from.id), {
      step: 'SELECT_GROUP',
      teacherId: teacher.id,
      schoolId: schoolId,
      subject: teacher.subject || 'Dars'
    });

    const keyboard = getExamClassesKeyboard(groups, teacherGroupIds, 'teacher_exam_sinf_');

    const text = `📝 <b>YANGI NAZORAT ISHI BELGILASH</b>\n\n` +
      `<b>1-QADAM:</b> Qaysi sinfda nazorat ishi o‘tkazmoqchisiz?\n\n` +
      (teacherGroupIds.length > 0 ? `⭐ <i>Yulduzcha bilan belgilanganlar siz dars o‘tadigan sinflar.</i>\n\n` : '') +
      `Quyidagi ro‘yxatdan sinfni tanlang:`;

    return editOrReplySafely(ctx, text, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  });

  // 2-QADAM: Sinf tanlandi -> Sana tanlashga o'tish
  bot.callbackQuery(/^teacher_exam_sinf_(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery().catch(() => {});
    const groupId = parseInt(ctx.match[1], 10);
    const group = groupsRepo.getGroupById(groupId);

    if (!group) {
      return ctx.editMessageText('⚠️ Sinf topilmadi.');
    }

    const session = examSessions.get(String(ctx.from.id)) || {};
    examSessions.set(String(ctx.from.id), {
      ...session,
      step: 'SELECT_DATE',
      groupId: group.id,
      groupName: group.name
    });

    const keyboard = getExamDateSelectionKeyboard('teacher_exam_date_');

    const text = `📝 <b>YANGI NAZORAT ISHI BELGILASH</b>\n\n` +
      `👥 <b>Tanlangan sinf:</b> <b>${escapeHtml(group.name)}</b>\n\n` +
      `<b>2-QADAM:</b> Nazorat ishi <b>qaysi kuni</b> o‘tkaziladi?\n\n` +
      `Quyidagi tayyor sanalardan birini tanlang yoki o‘zingiz yozib yuboring:`;

    return editOrReplySafely(ctx, text, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  });

  // Sana bosqichiga qaytish (Orqaga tugmasi orqali)
  bot.callbackQuery('teacher_exam_step_date', async (ctx) => {
    await ctx.answerCallbackQuery().catch(() => {});
    const session = examSessions.get(String(ctx.from.id));
    if (!session || !session.groupId) {
      return ctx.editMessageText('⚠️ Jarayon muddati tugagan. Iltimos qaytadan boshlang.');
    }

    session.step = 'SELECT_DATE';
    examSessions.set(String(ctx.from.id), session);

    const keyboard = getExamDateSelectionKeyboard('teacher_exam_date_');
    const text = `📝 <b>YANGI NAZORAT ISHI BELGILASH</b>\n\n` +
      `👥 <b>Tanlangan sinf:</b> <b>${escapeHtml(session.groupName || 'Sinf')}</b>\n\n` +
      `<b>2-QADAM:</b> Qaysi kuni o‘tkaziladi?`;

    return editOrReplySafely(ctx, text, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  });

  // 3-QADAM: Sana tanlandi -> Dars soatini tanlashga o'tish
  bot.callbackQuery(/^teacher_exam_date_(\d{4}-\d{2}-\d{2})$/, async (ctx) => {
    await ctx.answerCallbackQuery().catch(() => {});
    const selectedDate = ctx.match[1];

    const session = examSessions.get(String(ctx.from.id)) || {};
    examSessions.set(String(ctx.from.id), {
      ...session,
      step: 'SELECT_LESSON',
      date: selectedDate
    });

    const keyboard = getExamLessonNumberKeyboard('teacher_exam_les_');

    const text = `📝 <b>YANGI NAZORAT ISHI BELGILASH</b>\n\n` +
      `👥 <b>Sinf:</b> <b>${escapeHtml(session.groupName || 'Sinf')}</b>\n` +
      `📅 <b>Sana:</b> <b>${selectedDate}</b>\n\n` +
      `<b>3-QADAM:</b> Nazorat ishi <b>nechanchi darsda</b> (soatda) bo‘ladi?\n\n` +
      `Kerakli dars tartib raqamini tanlang:`;

    return editOrReplySafely(ctx, text, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  });

  // Qo'lda sana kiritish tugmasi
  bot.callbackQuery('teacher_exam_date_custom', async (ctx) => {
    await ctx.answerCallbackQuery().catch(() => {});
    const session = examSessions.get(String(ctx.from.id)) || {};
    examSessions.set(String(ctx.from.id), {
      ...session,
      step: 'AWAITING_CUSTOM_DATE'
    });

    const keyboard = new InlineKeyboard().text('🔙 Orqaga', 'teacher_exam_step_date');

    const text = `📅 <b>SANANI YOZIB YUBORING</b>\n\n` +
      `Iltimos, nazorat ishi o‘tkaziladigan sanani xabar sifatida yozib yuboring.\n\n` +
      `<b>Formatlar:</b>\n` +
      `• <code>YYYY-MM-DD</code> (Masalan: <code>2026-10-15</code>)\n` +
      `• <code>DD.MM.YYYY</code> (Masalan: <code>15.10.2026</code>)\n` +
      `• <code>DD.MM</code> (Masalan: <code>15.10</code>)`;

    return editOrReplySafely(ctx, text, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  });

  // Dars soati bosqichiga qaytish
  bot.callbackQuery('teacher_exam_step_lesson', async (ctx) => {
    await ctx.answerCallbackQuery().catch(() => {});
    const session = examSessions.get(String(ctx.from.id));
    if (!session || !session.date) {
      return ctx.editMessageText('⚠️ Jarayon muddati tugagan. Qaytadan boshlang.');
    }

    session.step = 'SELECT_LESSON';
    examSessions.set(String(ctx.from.id), session);

    const keyboard = getExamLessonNumberKeyboard('teacher_exam_les_');
    const text = `📝 <b>YANGI NAZORAT ISHI BELGILASH</b>\n\n` +
      `👥 <b>Sinf:</b> <b>${escapeHtml(session.groupName || 'Sinf')}</b>\n` +
      `📅 <b>Sana:</b> <b>${session.date}</b>\n\n` +
      `<b>3-QADAM:</b> Nechanchi darsda o‘tkaziladi?`;

    return editOrReplySafely(ctx, text, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  });

  // 4-QADAM: Dars soati tanlandi -> Nazorat ishi turi/mavzusini tanlash
  bot.callbackQuery(/^teacher_exam_les_(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery().catch(() => {});
    const lessonNum = parseInt(ctx.match[1], 10);

    const session = examSessions.get(String(ctx.from.id)) || {};
    examSessions.set(String(ctx.from.id), {
      ...session,
      step: 'SELECT_TYPE',
      lessonNumber: lessonNum === 0 ? null : lessonNum
    });

    const keyboard = getExamTypeKeyboard('teacher_exam_type_');

    const lesText = lessonNum > 0 ? `${lessonNum}-dars` : 'Aniqlanmagan';
    const text = `📝 <b>YANGI NAZORAT ISHI BELGILASH</b>\n\n` +
      `👥 <b>Sinf:</b> <b>${escapeHtml(session.groupName || 'Sinf')}</b>\n` +
      `📅 <b>Sana:</b> <b>${session.date}</b>\n` +
      `⏰ <b>Dars:</b> <b>${lesText}</b>\n\n` +
      `<b>4-QADAM:</b> Nazorat ishi <b>turini</b> tanlang:`;

    return editOrReplySafely(ctx, text, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  });

  // Qo'lda nom/mavzu yozish tugmasi
  bot.callbackQuery('teacher_exam_type_custom', async (ctx) => {
    await ctx.answerCallbackQuery().catch(() => {});
    const session = examSessions.get(String(ctx.from.id)) || {};
    examSessions.set(String(ctx.from.id), {
      ...session,
      step: 'AWAITING_CUSTOM_TITLE'
    });

    const keyboard = new InlineKeyboard().text('🔙 Orqaga', 'teacher_exam_step_lesson');

    const text = `✍️ <b>NAZORAT ISHI MAVZUSINI YOZING</b>\n\n` +
      `Iltimos, nazorat ishi nomi yoki mavzusini xabar sifatida yozib yuboring.\n\n` +
      `<i>Masalan: 1-BSB (Funksiyalar bo‘yicha nazorat ishi)</i>`;

    return editOrReplySafely(ctx, text, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  });

  // 5-QADAM: Nazorat turi tanlandi -> Bazaga saqlash va yakunlash
  bot.callbackQuery(/^teacher_exam_type_(bsb|chsb|nazorat|amaliy|test)$/, async (ctx) => {
    await ctx.answerCallbackQuery().catch(() => {});
    const typeKey = ctx.match[1];

    const typeTitles = {
      bsb: 'BSB (Bo‘lim nazorati)',
      chsb: 'CHSB (Chorak nazorati)',
      nazorat: 'Nazorat ishi',
      amaliy: 'Amaliy / Laboratoriya ishi',
      test: 'Test sinovi'
    };

    const examTitle = typeTitles[typeKey] || 'Nazorat ishi';
    const session = examSessions.get(String(ctx.from.id));

    if (!session || !session.groupId || !session.date) {
      return ctx.editMessageText('⚠️ Jarayon muddati tugagan. Iltimos qaytadan boshlang.');
    }

    return saveAndFinishExam(ctx, session, examTitle);
  });

  // Yordamchi: Nazorat ishini bazaga saqlash va foydalanuvchiga tasdiq xabari berish
  async function saveAndFinishExam(ctx, session, title, description = null) {
    const { teacher, school } = getUserContext(ctx.from?.id);
    const schoolId = session.schoolId || (school ? school.id : 1);
    const subject = teacher?.subject || session.subject || 'Dars';

    try {
      const insertedExam = examsRepo.addExam({
        school_id: schoolId,
        teacher_id: teacher ? teacher.id : session.teacherId,
        group_id: session.groupId,
        subject: subject,
        date: session.date,
        lesson_number: session.lessonNumber || null,
        title: title,
        description: description
      });

      examSessions.delete(String(ctx.from.id));

      const group = groupsRepo.getGroupById(session.groupId);
      const emoji = getSubjectEmoji(subject);
      const lesText = session.lessonNumber ? `${session.lessonNumber}-dars` : 'Belgilanmagan';
      const teacherName = teacher ? `${teacher.last_name} ${teacher.first_name}` : 'Ustoz';

      const successText = `✅ <b>NAZORAT ISHI MUVAFFAQIYATLI BELGILANDI!</b>\n\n` +
        `👥 <b>Sinf:</b> <b>${escapeHtml(group?.name || session.groupName || 'Sinf')}</b>\n` +
        `📅 <b>Sana:</b> <b>${session.date}</b>\n` +
        `⏰ <b>Dars:</b> <b>${lesText}</b>\n` +
        `📚 <b>Fan:</b> ${emoji} <b>${escapeHtml(subject)}</b>\n` +
        `📝 <b>Turi/Mavzu:</b> <b>${escapeHtml(title)}</b>\n` +
        `👨‍🏫 <b>Ustoz:</b> <b>${escapeHtml(teacherName)}</b>\n` +
        (description ? `ℹ️ <b>Qo‘shimcha:</b> ${escapeHtml(description)}\n` : '') +
        `\n🔔 <i>Ushbu nazorat ishi o‘quvchilarning kunlik dars jadvalida va 5 daqiqalik eslatmalarida avtomatik ravishda ko‘rsatiladi!</i>`;

      const keyboard = new InlineKeyboard()
        .text('➕ Yana nazorat ishi qo‘shish', 'teacher_exam_new')
        .row()
        .text('📋 Mening barcha nazoratlarim', 'teacher_exam_list')
        .row()
        .text('🔙 Boshqaruv menyusi', 'teacher_exam_menu');

      await editOrReplySafely(ctx, successText, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });

      // Agar sinfning guruh Telegram chati ulangan bo'lsa (haqiqiy supergroup)
      if (group && group.telegram_chat_id && String(group.telegram_chat_id).startsWith('-100')) {
        try {
          const groupNotice = `📢 <b>DIQQAT: NAZORAT ISHI E’LON QILINDI!</b>\n\n` +
            `👥 <b>Sinf:</b> <b>${escapeHtml(group.name)}</b>\n` +
            `📅 <b>Sana:</b> <b>${session.date}</b>\n` +
            `⏰ <b>Dars:</b> <b>${lesText}</b>\n` +
            `📚 <b>Fan:</b> ${emoji} <b>${escapeHtml(subject)}</b>\n` +
            `📝 <b>Turi:</b> <b>${escapeHtml(title)}</b>\n` +
            `👨‍🏫 <b>O‘qituvchi:</b> <b>${escapeHtml(teacherName)}</b>\n\n` +
            `💡 <i>O‘quvchilar, nazorat ishiga yaxshilab tayyorgarlik ko‘rishingiz so‘raladi!</i>`;

          await ctx.api.sendMessage(group.telegram_chat_id, groupNotice, { parse_mode: 'HTML' });
          logger.info(`[EXAM] Sinf guruhiga e'lon yuborildi: ${group.name} (${session.date})`);
        } catch (chatErr) {
          logger.warn(`[EXAM] Sinf guruhiga yuborilmadi (${group.telegram_chat_id}):`, chatErr.message);
        }
      }
    } catch (err) {
      logger.error('Nazorat ishini saqlashda xatolik:', err);
      return ctx.reply(`❌ Xatolik yuz berdi: ${escapeHtml(err.message)}`);
    }
  }

  // =========================================================================
  // 3. RO'YXATNI KO'RISH VA O'CHIRISH
  // =========================================================================

  // Ustozning barcha nazorat ishlarini ro'yxat shaklida ko'rish
  bot.callbackQuery('teacher_exam_list', async (ctx) => {
    await ctx.answerCallbackQuery().catch(() => {});
    const { teacher, schoolId } = getUserContext(ctx.from?.id);

    if (!teacher) {
      return ctx.editMessageText('⚠️ Ustoz profili topilmadi.');
    }

    const today = getTodayInfo();
    const exams = examsRepo.getExamsByTeacher(teacher.id, null, schoolId);

    if (exams.length === 0) {
      const keyboard = new InlineKeyboard()
        .text('➕ Yangi nazorat ishi belgilash', 'teacher_exam_new')
        .row()
        .text('🔙 Orqaga', 'teacher_exam_menu');

      return editOrReplySafely(ctx,
        `📋 <b>MENING NAZORAT ISHLARIM</b>\n\n` +
        `<i>Hozircha siz tomoningizdan birorta ham nazorat ishi belgilanmagan.</i>`,
        { parse_mode: 'HTML', reply_markup: keyboard }
      );
    }

    let text = `📋 <b>SIZNING NAZORAT ISHLARINGIZ (${exams.length} ta):</b>\n\n`;

    exams.forEach((ex, idx) => {
      const emoji = getSubjectEmoji(ex.subject);
      const isPast = ex.date < today.dateStr;
      const statusIcon = isPast ? '☑️ (O‘tgan)' : '⏳ (Kelgusi)';
      const lesText = ex.lesson_number ? ` (${ex.lesson_number}-dars)` : '';

      text += `<b>${idx + 1}. ${statusIcon} ${ex.date}</b>\n` +
        `👥 <b>Sinf:</b> <b>${escapeHtml(ex.group_name)}</b>\n` +
        `📚 <b>Fan:</b> ${emoji} ${escapeHtml(ex.subject)}\n` +
        `📝 <b>Turi:</b> <b>${escapeHtml(ex.title || 'Nazorat ishi')}</b>${lesText}\n` +
        (ex.description ? `ℹ️ <i>${escapeHtml(ex.description)}</i>\n` : '') +
        `\n`;
    });

    const keyboard = new InlineKeyboard()
      .text('➕ Yangi nazorat ishi', 'teacher_exam_new')
      .text('🗑 O‘chirish', 'teacher_exam_del_menu')
      .row()
      .text('🔙 Boshqaruv menyusi', 'teacher_exam_menu');

    return editOrReplySafely(ctx, text, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  });

  // O'chirish menyusi
  bot.callbackQuery('teacher_exam_del_menu', async (ctx) => {
    await ctx.answerCallbackQuery().catch(() => {});
    const { teacher, schoolId } = getUserContext(ctx.from?.id);

    if (!teacher) {
      return ctx.editMessageText('⚠️ Ustoz profili topilmadi.');
    }

    const today = getTodayInfo();
    const upcomingExams = examsRepo.getExamsByTeacher(teacher.id, today.dateStr, schoolId);
    const keyboard = getExamDeleteKeyboard(upcomingExams, 'teacher_exam_del_item_');

    const text = `🗑 <b>NAZORAT ISHINI BEKOR QILISH / O‘CHIRISH</b>\n\n` +
      `Quyidagi ro‘yxatdan o‘chirmoqchi bo‘lgan nazorat ishingizni bosing:`;

    return editOrReplySafely(ctx, text, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  });

  // Muayyan nazorat ishini o'chirish
  bot.callbackQuery(/^teacher_exam_del_item_(\d+)$/, async (ctx) => {
    const examId = parseInt(ctx.match[1], 10);
    const { teacher } = getUserContext(ctx.from?.id);

    const exam = examsRepo.getExamById(examId);
    if (!exam) {
      return ctx.answerCallbackQuery({ text: 'Nazorat ishi topilmadi yoki allaqachon o‘chirilgan', show_alert: true });
    }

    // Faqat o'zining nazorat ishini o'chira oladi (yoki admin)
    if (teacher && exam.teacher_id && exam.teacher_id !== teacher.id) {
      return ctx.answerCallbackQuery({ text: 'Siz faqat o‘zingiz belgilagan nazorat ishlarini o‘chira olasiz!', show_alert: true });
    }

    examsRepo.deleteExam(examId);
    await ctx.answerCallbackQuery({ text: '✅ Nazorat ishi muvaffaqiyatli o‘chirildi!' });

    const text = `🗑 <b>Nazorat ishi bekor qilindi va o‘chirildi:</b>\n\n` +
      `👥 <b>Sinf:</b> ${escapeHtml(exam.group_name)}\n` +
      `📅 <b>Sana:</b> ${exam.date}\n` +
      `📝 <b>Turi:</b> ${escapeHtml(exam.title || 'Nazorat ishi')}`;

    const keyboard = new InlineKeyboard()
      .text('📋 Nazoratlar ro‘yxati', 'teacher_exam_list')
      .text('🔙 Menyuga qaytish', 'teacher_exam_menu');

    return editOrReplySafely(ctx, text, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  });

  // =========================================================================
  // 4. O'QUVCHI: SINFNING NAZORAT ISHLARI
  // =========================================================================
  bot.hears(['📝 Nazorat ishlari', 'Nazorat ishlari', '/nazoratlar'], async (ctx) => {
    if (ctx.chat.type !== 'private') return;
    return handleStudentExams(ctx);
  });

  async function handleStudentExams(ctx) {
    const { user, group, school } = getUserContext(ctx.from?.id);

    if (!user?.selected_group_id || !group) {
      return ctx.reply(
        `⚠️ <b>Siz hali o‘z sinfingizni biriktirmagansiz.</b>\n\n` +
        `Nazorat ishlari jadvalini ko‘rish uchun avval <b>🏫 Mening sinfim</b> tugmasi orqali o‘z sinfingizni tanlang.`,
        { parse_mode: 'HTML' }
      );
    }

    const today = getTodayInfo();
    const exams = examsRepo.getExamsByGroup(group.id, today.dateStr);

    if (exams.length === 0) {
      const keyboard = new InlineKeyboard()
        .text('📅 Bugungi dars jadvali', `user_today_grp_${group.id}`)
        .row()
        .text('🏫 Mening sinfim', 'user_my_class_menu');

      return ctx.reply(
        `🎉 <b>${escapeHtml(group.name)} sinfida yaqin kunlarda rejalashtirilgan nazorat ishlari yo‘q!</b>\n\n` +
        `🏫 <b>Maktab:</b> ${escapeHtml(school?.name || 'Maktab')}\n\n` +
        `<i>Ustozlar nazorat ishi belgilashganda ushbu bo‘limda va kunlik dars jadvalingizda avtomatik ravishda ko‘rinadi.</i>`,
        { parse_mode: 'HTML', reply_markup: keyboard }
      );
    }

    let text = `📝 <b>${escapeHtml(group.name)} — REJALASHTIRILGAN NAZORAT ISHLARI</b>\n\n` +
      `🏫 <b>Maktab:</b> ${escapeHtml(school?.name || 'Maktab')}\n\n`;

    exams.forEach((ex, idx) => {
      const emoji = getSubjectEmoji(ex.subject);
      const isToday = ex.date === today.dateStr;
      const dateBadge = isToday ? '🔴 <b>BUGUN!</b>' : `🗓 <b>${ex.date}</b>`;
      const lesText = ex.lesson_number ? ` (${ex.lesson_number}-dars)` : '';
      const teacherLine = (ex.teacher_last_name) ? `👨‍🏫 <b>Ustoz:</b> ${escapeHtml(ex.teacher_last_name)} ${escapeHtml(ex.teacher_first_name || '')}\n` : '';

      text += `${idx + 1}. ${dateBadge}\n` +
        `   📚 <b>Fan:</b> ${emoji} <b>${escapeHtml(ex.subject)}</b>\n` +
        `   📝 <b>Turi:</b> <b>${escapeHtml(ex.title || 'Nazorat ishi')}</b>${lesText}\n` +
        (teacherLine ? `   ${teacherLine}` : '') +
        (ex.description ? `   ℹ️ <i>${escapeHtml(ex.description)}</i>\n` : '') +
        `\n`;
    });

    const keyboard = new InlineKeyboard()
      .text('📅 Bugungi jadval', `user_today_grp_${group.id}`)
      .text('📆 Ertangi jadval', `user_tmr_grp_${group.id}`);

    return ctx.reply(text.trim(), {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  // =========================================================================
  // 5. MATNLI XABARLAR ORQALI QO'LDA SANAN / MAVZUNI QABUL QILISH
  // =========================================================================
  bot.on('message:text', async (ctx, next) => {
    if (ctx.chat.type !== 'private') return next();

    const session = examSessions.get(String(ctx.from.id));
    if (!session) return next();

    const text = ctx.message.text.trim();

    // 1. Qo'lda sana kiritilayotgan bo'lsa
    if (session.step === 'AWAITING_CUSTOM_DATE') {
      let parsedDate = null;

      // YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        parsedDate = text;
      }
      // DD.MM.YYYY
      else if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(text)) {
        const [d, m, y] = text.split('.');
        parsedDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
      // DD.MM
      else if (/^\d{1,2}\.\d{1,2}$/.test(text)) {
        const now = getNowInTashkent();
        const [d, m] = text.split('.');
        parsedDate = `${now.year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }

      if (!parsedDate || !isValidDateFormat(parsedDate)) {
        return ctx.reply(
          `⚠️ <b>Noto‘g‘ri sana formati!</b>\n\n` +
          `Iltimos, sanani quyidagi formatlardan birida kiriting:\n` +
          `• <code>2026-10-15</code>\n` +
          `• <code>15.10.2026</code>\n` +
          `• <code>15.10</code>`,
          { parse_mode: 'HTML' }
        );
      }

      session.date = parsedDate;
      session.step = 'SELECT_LESSON';
      examSessions.set(String(ctx.from.id), session);

      const keyboard = getExamLessonNumberKeyboard('teacher_exam_les_');
      return ctx.reply(
        `✅ <b>Sana qabul qilindi: ${parsedDate}</b>\n\n` +
        `👥 <b>Sinf:</b> <b>${escapeHtml(session.groupName || 'Sinf')}</b>\n\n` +
        `<b>3-QADAM:</b> Nazorat ishi <b>nechanchi darsda</b> bo‘ladi?`,
        { parse_mode: 'HTML', reply_markup: keyboard }
      );
    }

    // 2. Qo'lda mavzu / nom kiritilayotgan bo'lsa
    if (session.step === 'AWAITING_CUSTOM_TITLE') {
      if (!text || text.length < 2) {
        return ctx.reply(`⚠️ Mavzu nomi juda qisqa. Iltimos to‘liqroq yozing:`);
      }

      return saveAndFinishExam(ctx, session, text);
    }

    return next();
  });
}
