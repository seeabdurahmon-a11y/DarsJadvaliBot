import { lessonsRepo } from '../database/lessons.repo.js';
import { groupsRepo } from '../database/groups.repo.js';
import { getTodayInfo, getTomorrowInfo } from '../utils/date.util.js';
import { formatDailySchedule, formatWeeklySchedule } from '../utils/formatter.js';

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
