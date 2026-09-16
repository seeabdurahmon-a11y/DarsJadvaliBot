import { lessonsRepo } from '../database/lessons.repo.js';
import { groupsRepo } from '../database/groups.repo.js';
import { getTodayInfo, getTomorrowInfo } from '../utils/date.util.js';
import { formatDailySchedule, formatWeeklySchedule, getSubjectEmoji } from '../utils/formatter.js';

export const scheduleService = {
  /**
   * Bugungi dars jadvalini olish va formatlash
   */
  getTodaySchedule(groupId = null) {
    const today = getTodayInfo();
    const lessons = lessonsRepo.getLessonsByDay(today.dayOfWeek, groupId);

    let groupName = null;
    if (groupId) {
      const grp = groupsRepo.getGroupById(groupId);
      if (grp) groupName = grp.name;
    }

    const formattedText = formatDailySchedule({
      title: '🏫 MAKTAB DARS JADVALI',
      dateHeader: `Bugun: ${today.formattedDate}`,
      lessons,
      groupName
    });

    return {
      today,
      lessons,
      formattedText
    };
  },

  /**
   * Hozir qaysi dars ketayotganini aniqlash va formatlash
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

    // Agar tanaffus bo'lsa (oldingi darslar bor va keyingi dars ham bor)
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

    // Agar darslar hali boshlanmagan bo'lsa (birinchi darsdan oldin)
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
   * Ertangi dars jadvalini olish va formatlash
   */
  getTomorrowSchedule(groupId = null) {
    const tomorrow = getTomorrowInfo();
    const lessons = lessonsRepo.getLessonsByDay(tomorrow.dayOfWeek, groupId);

    let groupName = null;
    if (groupId) {
      const grp = groupsRepo.getGroupById(groupId);
      if (grp) groupName = grp.name;
    }

    const formattedText = formatDailySchedule({
      title: '🏫 MAKTAB DARS JADVALI',
      dateHeader: `Ertaga: ${tomorrow.formattedDate}`,
      lessons,
      groupName
    });

    return {
      tomorrow,
      lessons,
      formattedText
    };
  },

  /**
   * Haftalik dars jadvalini olish va formatlash
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
  }
};
