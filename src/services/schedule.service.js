import { lessonsRepo } from '../database/lessons.repo.js';
import { groupsRepo } from '../database/groups.repo.js';
import { teachersRepo } from '../database/teachers.repo.js';
import { schoolsRepo } from '../database/schools.repo.js';
import { examsRepo } from '../database/exams.repo.js';
import { getTodayInfo, getTomorrowInfo, getDayName } from '../utils/date.util.js';
import { formatDailySchedule, formatWeeklySchedule, getSubjectEmoji, getLessonNumber, escapeHtml } from '../utils/formatter.js';

export const scheduleService = {
  /**
   * Bugungi dars jadvalini olish va formatlash (Sinf uchun)
   */
  getTodaySchedule(groupId = null) {
    const today = getTodayInfo();
    const lessons = lessonsRepo.getLessonsByDay(today.dayOfWeek, groupId);

    let groupName = null;
    let exams = [];
    if (groupId) {
      const grp = groupsRepo.getGroupById(groupId);
      if (grp) groupName = grp.name;
      exams = examsRepo.getExamsByDate(today.dateStr, groupId);
    }

    let formattedText = formatDailySchedule({
      title: '🏫 MAKTAB DARS JADVALI',
      dateHeader: `Bugun: ${today.formattedDate}`,
      lessons,
      groupName
    });

    if (exams && exams.length > 0) {
      let examBlock = `\n\n📝 <b>BUGUNGI NAZORAT ISHLARI:</b>\n`;
      exams.forEach(ex => {
        const emoji = getSubjectEmoji(ex.subject);
        const lesText = ex.lesson_number ? `${ex.lesson_number}-dars: ` : '';
        examBlock += `⚠️ <b>${lesText}</b>${emoji} <b>${escapeHtml(ex.subject)}</b> — <i>${escapeHtml(ex.title || 'Nazorat ishi')}</i>\n`;
      });
      formattedText += examBlock.trimEnd();
    }

    return {
      today,
      lessons,
      exams,
      formattedText
    };
  },

  /**
   * Hozir qaysi dars ketayotganini aniqlash va formatlash (Sinf uchun)
   */
  getCurrentLesson(groupId = null) {
    const today = getTodayInfo();
    const lessons = lessonsRepo.getLessonsByDay(today.dayOfWeek, groupId);

    let groupName = null;
    if (groupId) {
      const grp = groupsRepo.getGroupById(groupId);
      if (grp) groupName = grp.name;
    }

    const nowStr = today.timeStr; // e.g. "11:25"

    if (!lessons || lessons.length === 0) {
      return {
        status: 'no_lessons',
        groupName,
        today,
        formattedText: `🏫 <b>MAKTAB${groupName ? ` — ${groupName}` : ''}</b>\n\n` +
          `📅 <b>Bugun:</b> ${today.formattedDate}\n` +
          `🕐 <b>Hozirgi vaqt:</b> ${nowStr}\n\n` +
          `<i>📚 Bugun darslar mavjud emas yoki dam olish kuni.</i>`
      };
    }

    // Darslarni boshlanish vaqti bo'yicha saralash
    const sorted = [...lessons].sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));

    const currentLesson = sorted.find(l => l.start_time && l.end_time && nowStr >= l.start_time && nowStr <= l.end_time);
    const nextLesson = sorted.find(l => l.start_time && nowStr < l.start_time);
    const pastLessons = sorted.filter(l => l.end_time && nowStr > l.end_time);

    let formattedText = '';

    if (currentLesson) {
      const emoji = getSubjectEmoji(currentLesson.subject);
      const nextEmoji = nextLesson ? getSubjectEmoji(nextLesson.subject) : '';

      formattedText = `🔔 <b>HOZIRGI DARS:</b>\n\n` +
        `🏫 <b>Sinf:</b> <b>${groupName || currentLesson.group_name || 'Sinf'}</b>\n` +
        `🕐 <b>Vaqt:</b> <code>${currentLesson.start_time} — ${currentLesson.end_time}</code>\n` +
        `${emoji} <b>Fan:</b> <b>${currentLesson.subject}</b>\n` +
        (currentLesson.teacher ? `👨‍🏫 <b>O‘qituvchi:</b> ${currentLesson.teacher}\n` : '') +
        (currentLesson.room ? `🏫 <b>Xona:</b> ${currentLesson.room}-xona\n` : '') +
        `\n` +
        (nextLesson
          ? `➡️ <i>Keyingi dars:</i> ${nextEmoji} <b>${nextLesson.subject}</b> (soat <code>${nextLesson.start_time}</code> da)\n`
          : `🏁 <i>Bu bugungi oxirgi dars.</i>\n`) +
        `\n📖 <i>To‘liq jadval uchun:</i> <code>/darsjadvali</code>`;

      return {
        status: 'ongoing',
        currentLesson,
        nextLesson,
        groupName,
        today,
        formattedText
      };
    }

    // Agar tanaffus bo'lsa
    if (pastLessons.length > 0 && nextLesson) {
      const nextEmoji = getSubjectEmoji(nextLesson.subject);
      formattedText = `☕ <b>HOZIR TANAFFUS</b>\n\n` +
        `🏫 <b>Sinf:</b> <b>${groupName || nextLesson.group_name || 'Sinf'}</b>\n` +
        `🕐 <b>Hozirgi vaqt:</b> <code>${nowStr}</code>\n\n` +
        `➡️ <b>Keyingi dars:</b>\n` +
        `⏰ <b>Boshlanish vaqti:</b> <code>${nextLesson.start_time} — ${nextLesson.end_time}</code>\n` +
        `${nextEmoji} <b>Fan:</b> <b>${nextLesson.subject}</b>\n` +
        (nextLesson.teacher ? `👨‍🏫 <b>O‘qituvchi:</b> ${nextLesson.teacher}\n` : '') +
        (nextLesson.room ? `🏫 <b>Xona:</b> ${nextLesson.room}-xona\n` : '') +
        `\n📖 <i>To‘liq jadval uchun:</i> <code>/darsjadvali</code>`;

      return {
        status: 'break',
        nextLesson,
        groupName,
        today,
        formattedText
      };
    }

    // Agar darslar hali boshlanmagan bo'lsa
    if (pastLessons.length === 0 && nextLesson) {
      const firstLesson = nextLesson;
      const firstEmoji = getSubjectEmoji(firstLesson.subject);
      formattedText = `⏳ <b>DARSLAR HALI BOSHLANMAGAN</b>\n\n` +
        `🏫 <b>Sinf:</b> <b>${groupName || firstLesson.group_name || 'Sinf'}</b>\n` +
        `🕐 <b>Hozirgi vaqt:</b> <code>${nowStr}</code>\n\n` +
        `🔔 <b>Birinchi dars:</b>\n` +
        `⏰ <b>Boshlanish vaqti:</b> <code>${firstLesson.start_time} — ${firstLesson.end_time}</code>\n` +
        `${firstEmoji} <b>Fan:</b> <b>${firstLesson.subject}</b>\n` +
        (firstLesson.teacher ? `👨‍🏫 <b>O‘qituvchi:</b> ${firstLesson.teacher}\n` : '') +
        (firstLesson.room ? `🏫 <b>Xona:</b> ${firstLesson.room}-xona\n` : '') +
        `\n📖 <i>To‘liq jadval uchun:</i> <code>/darsjadvali</code>`;

      return {
        status: 'before_school',
        firstLesson,
        groupName,
        today,
        formattedText
      };
    }

    // Barcha darslar tugagan bo'lsa
    formattedText = `🏁 <b>BUGUNGI DARSLAR YAKUNLANGAN</b>\n\n` +
      `🏫 <b>Sinf:</b> <b>${groupName || (sorted[0] && sorted[0].group_name) || 'Sinf'}</b>\n` +
      `🕐 <b>Hozirgi vaqt:</b> <code>${nowStr}</code>\n\n` +
      `Bugungi rejadagi barcha (${sorted.length} ta) darslar o‘z nihoyasiga yetdi.\n\n` +
      `📆 <i>Ertangi kun jadvali uchun:</i> <code>/tomorrow</code>`;

    return {
      status: 'ended',
      groupName,
      today,
      formattedText
    };
  },

  /**
   * Ertangi dars jadvalini olish va formatlash (Sinf uchun)
   */
  getTomorrowSchedule(groupId = null) {
    const tomorrow = getTomorrowInfo();
    const lessons = lessonsRepo.getLessonsByDay(tomorrow.dayOfWeek, groupId);

    let groupName = null;
    let exams = [];
    if (groupId) {
      const grp = groupsRepo.getGroupById(groupId);
      if (grp) groupName = grp.name;
      exams = examsRepo.getExamsByDate(tomorrow.dateStr, groupId);
    }

    let formattedText = formatDailySchedule({
      title: '🏫 MAKTAB DARS JADVALI',
      dateHeader: `Ertaga: ${tomorrow.formattedDate}`,
      lessons,
      groupName
    });

    if (exams && exams.length > 0) {
      let examBlock = `\n\n📝 <b>ERTANGI NAZORAT ISHLARI:</b>\n`;
      exams.forEach(ex => {
        const emoji = getSubjectEmoji(ex.subject);
        const lesText = ex.lesson_number ? `${ex.lesson_number}-dars: ` : '';
        examBlock += `⚠️ <b>${lesText}</b>${emoji} <b>${escapeHtml(ex.subject)}</b> — <i>${escapeHtml(ex.title || 'Nazorat ishi')}</i>\n`;
      });
      formattedText += examBlock.trimEnd();
    }

    return {
      tomorrow,
      lessons,
      exams,
      formattedText
    };
  },

  /**
   * Haftalik dars jadvalini olish va formatlash (Sinf uchun)
   */
  getWeeklySchedule(groupId = null) {
    const lessons = lessonsRepo.getWeeklyLessons(groupId);

    let groupName = null;
    if (groupId) {
      const grp = groupsRepo.getGroupById(groupId);
      if (grp) groupName = grp.name;
    }

    const formattedText = formatWeeklySchedule({
      title: 'HAFTALIK JADVAL',
      lessons,
      groupName
    });

    return {
      lessons,
      formattedText
    };
  },

  // ==========================================
  // 👨‍🏫 USTOZLAR DARS JADVALI (TEACHER METHODS)
  // ==========================================

  /**
   * Ustozning bugungi dars jadvali
   */
  getTeacherTodaySchedule(teacherIdOrName, schoolId = null) {
    const today = getTodayInfo();
    const teacher = (typeof teacherIdOrName === 'number' || (!isNaN(teacherIdOrName) && Number(teacherIdOrName) > 0))
      ? teachersRepo.getTeacherById(Number(teacherIdOrName))
      : null;

    const teacherName = teacher ? `${teacher.last_name} ${teacher.first_name}` : String(teacherIdOrName);
    const lessons = teachersRepo.getTeacherLessonsByDay(teacherIdOrName, today.dayOfWeek, schoolId);

    let formattedText = `👨‍🏫 <b>USTOZ DARS JADVALI</b>\n` +
      `👤 <b>O‘qituvchi:</b> <b>${escapeHtml(teacherName)}</b> ${teacher?.subject ? `(${escapeHtml(teacher.subject)})` : ''}\n` +
      `📅 <b>Bugun:</b> ${today.formattedDate}\n\n`;

    if (!lessons || lessons.length === 0) {
      formattedText += `<i>📚 Bugun sizga darslar biriktirilmagan yoki dam olish kuni.</i>`;
    } else {
      formattedText += `📋 <b>Bugungi darslaringiz (${lessons.length} ta):</b>\n\n`;
      lessons.forEach((l) => {
        const emoji = getSubjectEmoji(l.subject);
        const lessonNum = getLessonNumber(l.start_time);
        formattedText += `<b>${lessonNum}-dars:</b> ⏰ <code>${l.start_time} — ${l.end_time}</code>\n` +
          `👥 <b>Sinf:</b> <b>${escapeHtml(l.group_name || 'Sinf')}</b>\n` +
          `${emoji} <b>Fan:</b> ${escapeHtml(l.subject)}\n` +
          (l.room ? `🚪 <b>Xona:</b> ${escapeHtml(l.room)}-xona\n` : '') +
          `\n`;
      });
    }

    // Bugungi rejalashtirilgan nazorat ishlari
    const teacherId = teacher ? teacher.id : (typeof teacherIdOrName === 'number' ? teacherIdOrName : null);
    let teacherExams = [];
    if (teacherId) {
      teacherExams = examsRepo.getExamsByTeacher(teacherId, today.dateStr, schoolId).filter(e => e.date === today.dateStr);
    }
    if (teacherExams && teacherExams.length > 0) {
      formattedText += `\n📝 <b>BUGUNGI NAZORAT ISHLARINGIZ:</b>\n`;
      teacherExams.forEach(ex => {
        const emoji = getSubjectEmoji(ex.subject);
        const lesText = ex.lesson_number ? ` (${ex.lesson_number}-dars)` : '';
        formattedText += `⚠️ <b>${escapeHtml(ex.group_name)}</b>: ${emoji} <b>${escapeHtml(ex.title || 'Nazorat ishi')}</b>${lesText}\n`;
      });
    }

    return {
      today,
      teacher,
      lessons,
      exams: teacherExams,
      formattedText: formattedText.trim()
    };
  },

  /**
   * Ustozning ertangi dars jadvali
   */
  getTeacherTomorrowSchedule(teacherIdOrName, schoolId = null) {
    const tomorrow = getTomorrowInfo();
    const teacher = (typeof teacherIdOrName === 'number' || (!isNaN(teacherIdOrName) && Number(teacherIdOrName) > 0))
      ? teachersRepo.getTeacherById(Number(teacherIdOrName))
      : null;

    const teacherName = teacher ? `${teacher.last_name} ${teacher.first_name}` : String(teacherIdOrName);
    const lessons = teachersRepo.getTeacherLessonsByDay(teacherIdOrName, tomorrow.dayOfWeek, schoolId);

    let formattedText = `👨‍🏫 <b>USTOZ DARS JADVALI</b>\n` +
      `👤 <b>O‘qituvchi:</b> <b>${escapeHtml(teacherName)}</b> ${teacher?.subject ? `(${escapeHtml(teacher.subject)})` : ''}\n` +
      `📆 <b>Ertaga:</b> ${tomorrow.formattedDate}\n\n`;

    if (!lessons || lessons.length === 0) {
      formattedText += `<i>📚 Ertaga sizga darslar biriktirilmagan yoki dam olish kuni.</i>`;
    } else {
      formattedText += `📋 <b>Ertangi darslaringiz (${lessons.length} ta):</b>\n\n`;
      lessons.forEach((l) => {
        const emoji = getSubjectEmoji(l.subject);
        const lessonNum = getLessonNumber(l.start_time);
        formattedText += `<b>${lessonNum}-dars:</b> ⏰ <code>${l.start_time} — ${l.end_time}</code>\n` +
          `👥 <b>Sinf:</b> <b>${escapeHtml(l.group_name || 'Sinf')}</b>\n` +
          `${emoji} <b>Fan:</b> ${escapeHtml(l.subject)}\n` +
          (l.room ? `🚪 <b>Xona:</b> ${escapeHtml(l.room)}-xona\n` : '') +
          `\n`;
      });
    }

    // Ertangi rejalashtirilgan nazorat ishlari
    const teacherId = teacher ? teacher.id : (typeof teacherIdOrName === 'number' ? teacherIdOrName : null);
    let teacherExams = [];
    if (teacherId) {
      teacherExams = examsRepo.getExamsByTeacher(teacherId, tomorrow.dateStr, schoolId).filter(e => e.date === tomorrow.dateStr);
    }
    if (teacherExams && teacherExams.length > 0) {
      formattedText += `\n📝 <b>ERTANGI NAZORAT ISHLARINGIZ:</b>\n`;
      teacherExams.forEach(ex => {
        const emoji = getSubjectEmoji(ex.subject);
        const lesText = ex.lesson_number ? ` (${ex.lesson_number}-dars)` : '';
        formattedText += `⚠️ <b>${escapeHtml(ex.group_name)}</b>: ${emoji} <b>${escapeHtml(ex.title || 'Nazorat ishi')}</b>${lesText}\n`;
      });
    }

    return {
      tomorrow,
      teacher,
      lessons,
      exams: teacherExams,
      formattedText: formattedText.trim()
    };
  },

  /**
   * Ustozning haftalik dars jadvali (Barcha sinflar bo‘yicha)
   */
  getTeacherWeeklySchedule(teacherIdOrName, schoolId = null) {
    const teacher = (typeof teacherIdOrName === 'number' || (!isNaN(teacherIdOrName) && Number(teacherIdOrName) > 0))
      ? teachersRepo.getTeacherById(Number(teacherIdOrName))
      : null;

    const teacherName = teacher ? `${teacher.last_name} ${teacher.first_name}` : String(teacherIdOrName);
    const allLessons = teachersRepo.getTeacherWeeklyLessons(teacherIdOrName, schoolId);

    let formattedText = `📚 <b>USTOZ HAFTALIK DARS JADVALI</b>\n` +
      `👤 <b>O‘qituvchi:</b> <b>${escapeHtml(teacherName)}</b> ${teacher?.subject ? `(${escapeHtml(teacher.subject)})` : ''}\n\n`;

    if (!allLessons || allLessons.length === 0) {
      formattedText += `<i>Jadvalda sizga hali darslar biriktirilmagan.</i>`;
      return { teacher, allLessons, formattedText };
    }

    const DAYS = [
      { id: 1, name: 'Dushanba' },
      { id: 2, name: 'Seshanba' },
      { id: 3, name: 'Chorshanba' },
      { id: 4, name: 'Payshanba' },
      { id: 5, name: 'Juma' },
      { id: 6, name: 'Shanba' }
    ];

    DAYS.forEach(d => {
      const dayLessons = allLessons.filter(l => l.day_of_week === d.id);
      if (dayLessons.length > 0) {
        formattedText += `🗓 <b>${d.name.toUpperCase()} (${dayLessons.length} ta dars):</b>\n`;
        dayLessons.forEach((l) => {
          const emoji = getSubjectEmoji(l.subject);
          const lessonNum = getLessonNumber(l.start_time);
          formattedText += `  • <b>${lessonNum}-dars</b> (<code>${l.start_time}</code>) — <b>${escapeHtml(l.group_name || 'Sinf')}</b>: ${emoji} ${escapeHtml(l.subject)}${l.room ? ` (<i>${escapeHtml(l.room)}-xona</i>)` : ''}\n`;
        });
        formattedText += `\n`;
      }
    });

    return {
      teacher,
      allLessons,
      formattedText: formattedText.trim()
    };
  },

  /**
   * Ustozning hozirgi darsi va tanaffus holati
   */
  getTeacherCurrentLesson(teacherIdOrName, schoolId = null) {
    const today = getTodayInfo();
    const teacher = (typeof teacherIdOrName === 'number' || (!isNaN(teacherIdOrName) && Number(teacherIdOrName) > 0))
      ? teachersRepo.getTeacherById(Number(teacherIdOrName))
      : null;

    const teacherName = teacher ? `${teacher.last_name} ${teacher.first_name}` : String(teacherIdOrName);
    const lessons = teachersRepo.getTeacherLessonsByDay(teacherIdOrName, today.dayOfWeek, schoolId);
    const nowStr = today.timeStr;

    if (!lessons || lessons.length === 0) {
      return {
        status: 'no_lessons',
        formattedText: `👨‍🏫 <b>Ustoz:</b> ${escapeHtml(teacherName)}\n\n` +
          `📅 <b>Bugun:</b> ${today.formattedDate}\n` +
          `🕐 <b>Hozirgi vaqt:</b> ${nowStr}\n\n` +
          `<i>Bugun sizga darslar biriktirilmagan yoki dam olish kuni.</i>`
      };
    }

    const sorted = [...lessons].sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
    const currentLesson = sorted.find(l => l.start_time && l.end_time && nowStr >= l.start_time && nowStr <= l.end_time);
    const nextLesson = sorted.find(l => l.start_time && nowStr < l.start_time);
    const pastLessons = sorted.filter(l => l.end_time && nowStr > l.end_time);

    let formattedText = '';

    if (currentLesson) {
      const emoji = getSubjectEmoji(currentLesson.subject);
      const nextEmoji = nextLesson ? getSubjectEmoji(nextLesson.subject) : '';

      formattedText = `🔔 <b>HOZIRGI DARSINGIZ:</b>\n\n` +
        `👨‍🏫 <b>Ustoz:</b> ${escapeHtml(teacherName)}\n` +
        `👥 <b>Sinf:</b> <b>${escapeHtml(currentLesson.group_name || 'Sinf')}</b>\n` +
        `🕐 <b>Vaqt:</b> <code>${currentLesson.start_time} — ${currentLesson.end_time}</code>\n` +
        `${emoji} <b>Fan:</b> <b>${escapeHtml(currentLesson.subject)}</b>\n` +
        (currentLesson.room ? `🚪 <b>Xona:</b> ${escapeHtml(currentLesson.room)}-xona\n` : '') +
        `\n` +
        (nextLesson
          ? `➡️ <i>Keyingi darsingiz:</i> <b>${escapeHtml(nextLesson.group_name || 'Sinf')}</b> da ${nextEmoji} <b>${escapeHtml(nextLesson.subject)}</b> (soat <code>${nextLesson.start_time}</code>)\n`
          : `🏁 <i>Bu bugungi oxirgi darsingiz.</i>\n`);

      return { status: 'ongoing', currentLesson, nextLesson, formattedText };
    }

    if (pastLessons.length > 0 && nextLesson) {
      const nextEmoji = getSubjectEmoji(nextLesson.subject);
      formattedText = `☕ <b>HOZIR TANAFFUS</b>\n\n` +
        `👨‍🏫 <b>Ustoz:</b> ${escapeHtml(teacherName)}\n` +
        `🕐 <b>Hozirgi vaqt:</b> <code>${nowStr}</code>\n\n` +
        `➡️ <b>Keyingi darsingiz:</b>\n` +
        `👥 <b>Sinf:</b> <b>${escapeHtml(nextLesson.group_name || 'Sinf')}</b>\n` +
        `⏰ <b>Vaqt:</b> <code>${nextLesson.start_time} — ${nextLesson.end_time}</code>\n` +
        `${nextEmoji} <b>Fan:</b> <b>${escapeHtml(nextLesson.subject)}</b>\n` +
        (nextLesson.room ? `🚪 <b>Xona:</b> ${escapeHtml(nextLesson.room)}-xona\n` : '');

      return { status: 'break', nextLesson, formattedText };
    }

    if (pastLessons.length === 0 && nextLesson) {
      const firstLesson = nextLesson;
      const firstEmoji = getSubjectEmoji(firstLesson.subject);
      const lessonNum = getLessonNumber(firstLesson.start_time);
      formattedText = `⏳ <b>DARSLAR HALI BOSHLANMAGAN</b>\n\n` +
        `👨‍🏫 <b>Ustoz:</b> ${escapeHtml(teacherName)}\n` +
        `🕐 <b>Hozirgi vaqt:</b> <code>${nowStr}</code>\n\n` +
        `🔔 <b>Birinchi darsingiz (${lessonNum}-dars):</b>\n` +
        `👥 <b>Sinf:</b> <b>${escapeHtml(firstLesson.group_name || 'Sinf')}</b>\n` +
        `⏰ <b>Vaqt:</b> <code>${firstLesson.start_time} — ${firstLesson.end_time}</code>\n` +
        `${firstEmoji} <b>Fan:</b> <b>${escapeHtml(firstLesson.subject)}</b>\n` +
        (firstLesson.room ? `🚪 <b>Xona:</b> ${escapeHtml(firstLesson.room)}-xona\n` : '');

      return { status: 'before_school', firstLesson, formattedText };
    }

    formattedText = `🏁 <b>BUGUNGI BARCHA DARSLARINGIZ YAKUNLANGAN</b>\n\n` +
      `👨‍🏫 <b>Ustoz:</b> ${escapeHtml(teacherName)}\n` +
      `🕐 <b>Hozirgi vaqt:</b> <code>${nowStr}</code>\n\n` +
      `Bugungi rejadagi barcha (${sorted.length} ta) darslaringiz o‘z nihoyasiga yetdi. Rahmat!\n\n` +
      `📆 <i>Ertangi jadvalingizni ko‘rish uchun pastdagi "Ertangi darslarim" tugmasini bosing.</i>`;

    return { status: 'ended', formattedText };
  }
};
