import { teachersRepo } from '../database/teachers.repo.js';
import { groupsRepo } from '../database/groups.repo.js';
import { lessonsRepo } from '../database/lessons.repo.js';
import { usersRepo } from '../database/users.repo.js';
import { settingsRepo } from '../database/settings.repo.js';
import { examsRepo } from '../database/exams.repo.js';
import { getNowInTashkent } from '../utils/date.util.js';
import { getSubjectEmoji, getLessonNumber, escapeHtml } from '../utils/formatter.js';
import { logger } from '../utils/logger.js';

export const teacherReminderService = {
  /**
   * Dars boshlanishidan 5 daqiqa oldin ustozlarga va o'quvchilarga eslatma yuborish
   * @param {Object} bot - grammY Bot instansiyasi
   * @param {number} advanceMinutes - Darsdan necha daqiqa oldin (standart: 5)
   */
  async checkAndSendAllReminders(bot, advanceMinutes = 5) {
    let totalSent = 0;
    totalSent += await this.checkAndSendTeacherReminders(bot, advanceMinutes);
    totalSent += await this.checkAndSendStudentReminders(bot, advanceMinutes);
    return totalSent;
  },

  /**
   * Dars boshlanishidan 5 daqiqa oldin ustozlarga eslatma yuborish
   */
  async checkAndSendTeacherReminders(bot, advanceMinutes = 5, customNow = null) {
    if (!bot?.api?.sendMessage) return 0;

    const now = customNow || getNowInTashkent();
    const targetTime = now.plus({ minutes: advanceMinutes });
    const targetTimeStr = targetTime.toFormat('HH:mm'); // e.g. "09:20"
    const scheduleDate = now.toFormat('yyyy-MM-dd'); // e.g. "2026-09-18"
    const dayOfWeek = now.weekday; // 1=Dushanba..6=Shanba, 7=Yakshanba

    if (dayOfWeek > 6) {
      return 0;
    }

    // Faol ustoz foydalanuvchilarni olamiz
    const teacherUsers = usersRepo.getActiveTeacherUsers();
    if (!teacherUsers || teacherUsers.length === 0) return 0;

    let sentCount = 0;

    for (const u of teacherUsers) {
      try {
        const todayLessons = teachersRepo.getTeacherLessonsByDay(u.selected_teacher_id, dayOfWeek, u.selected_school_id);
        if (!todayLessons || todayLessons.length === 0) continue;

        const upcomingLessons = todayLessons.filter(l => (l.start_time || '').trim() === targetTimeStr);

        for (const lesson of upcomingLessons) {
          const isSent = settingsRepo.isTeacherReminderSent(u.telegram_id, lesson.id, scheduleDate);
          if (isSent) continue;

          // Nazorat ishi bormi tekshiramiz
          const lessonNum = getLessonNumber(lesson.start_time);
          const groupExams = examsRepo.getExamsByDate(scheduleDate, lesson.group_id);
          const matchedExam = groupExams.find(e => 
            (e.lesson_number && e.lesson_number === lessonNum) ||
            e.subject.toLowerCase().includes(lesson.subject.toLowerCase()) ||
            lesson.subject.toLowerCase().includes(e.subject.toLowerCase())
          );

          const emoji = getSubjectEmoji(lesson.subject);
          let messageText = `🔔 <b>DARSINGIZ BOSHLANMOQDA! (5 daqiqadan so‘ng)</b>\n\n` +
            `👥 <b>Sinf:</b> <b>${escapeHtml(lesson.group_name || 'Sinf')}</b>\n` +
            `⏰ <b>Dars vaqti:</b> <code>${lesson.start_time} — ${lesson.end_time}</code>\n` +
            `${emoji} <b>Fan:</b> <b>${escapeHtml(lesson.subject)}</b>\n` +
            (lesson.room ? `🚪 <b>Xona:</b> <b>${escapeHtml(lesson.room)}-xona</b>\n` : '');

          if (matchedExam) {
            messageText += `\n📝 <b>DIQQAT: Ushbu darsda NAZORAT ISHI (${escapeHtml(matchedExam.title || 'Nazorat ishi')}) rejalashtirilgan!</b>\n`;
          }

          messageText += `\n<i>O‘quvchilar sizni kutmoqda. Darsingizga muvaffaqiyat tilaymiz!</i>`;

          await bot.api.sendMessage(u.telegram_id, messageText, { parse_mode: 'HTML' });
          settingsRepo.recordTeacherReminder(u.selected_teacher_id, u.telegram_id, lesson.id, scheduleDate);
          sentCount++;
          logger.info(`[TEACHER-REMINDER] Eslatma yuborildi: Ustoz ${u.teacher_last_name} ${u.teacher_first_name} (ID: ${u.telegram_id}) -> ${lesson.group_name} (${lesson.start_time})`);
        }
      } catch (err) {
        logger.error(`Ustozga eslatma yuborishda xatolik (ID: ${u.telegram_id}):`, err.message);
      }
    }

    return sentCount;
  },

  /**
   * Dars boshlanishidan 5 daqiqa oldin o'quvchilarga eslatma yuborish
   */
  async checkAndSendStudentReminders(bot, advanceMinutes = 5, customNow = null) {
    if (!bot?.api?.sendMessage) return 0;

    const now = customNow || getNowInTashkent();
    const targetTime = now.plus({ minutes: advanceMinutes });
    const targetTimeStr = targetTime.toFormat('HH:mm');
    const scheduleDate = now.toFormat('yyyy-MM-dd');
    const dayOfWeek = now.weekday;

    if (dayOfWeek > 6) return 0;

    const studentUsers = usersRepo.getActiveStudentUsers();
    if (!studentUsers || studentUsers.length === 0) return 0;

    let sentCount = 0;

    for (const u of studentUsers) {
      try {
        const todayLessons = lessonsRepo.getLessonsByDay(dayOfWeek, u.selected_group_id);
        if (!todayLessons || todayLessons.length === 0) continue;

        const upcomingLessons = todayLessons.filter(l => (l.start_time || '').trim() === targetTimeStr);

        for (const lesson of upcomingLessons) {
          const isSent = settingsRepo.isTeacherReminderSent(u.telegram_id, lesson.id, scheduleDate);
          if (isSent) continue;

          // Nazorat ishi bormi tekshiramiz
          const lessonNum = getLessonNumber(lesson.start_time);
          const groupExams = examsRepo.getExamsByDate(scheduleDate, u.selected_group_id);
          const matchedExam = groupExams.find(e => 
            (e.lesson_number && e.lesson_number === lessonNum) ||
            e.subject.toLowerCase().includes(lesson.subject.toLowerCase()) ||
            lesson.subject.toLowerCase().includes(e.subject.toLowerCase())
          );

          const emoji = getSubjectEmoji(lesson.subject);
          let messageText = `🔔 <b>KEYINGI DARSINGIZ BOSHLANMOQDA! (5 daqiqadan so‘ng)</b>\n\n` +
            `👥 <b>Sinf:</b> <b>${escapeHtml(u.selected_group_name || 'Sinf')}</b>\n` +
            `⏰ <b>Dars vaqti:</b> <code>${lesson.start_time} — ${lesson.end_time}</code>\n` +
            `${emoji} <b>Fan:</b> <b>${escapeHtml(lesson.subject)}</b>\n` +
            (lesson.teacher ? `👨‍🏫 <b>O‘qituvchi:</b> ${escapeHtml(lesson.teacher)}\n` : '') +
            (lesson.room ? `🚪 <b>Xona:</b> ${escapeHtml(lesson.room)}-xona\n` : '');

          if (matchedExam) {
            messageText += `\n📝 <b>DIQQAT: Ushbu darsda NAZORAT ISHI (${escapeHtml(matchedExam.title || 'Nazorat ishi')}) o‘tkaziladi!</b>\n`;
          }

          messageText += `\n💡 <i>Darsga tayyorlaning!</i>`;

          try {
            await bot.api.sendMessage(u.telegram_id, messageText, { parse_mode: 'HTML' });
            settingsRepo.recordTeacherReminder(null, u.telegram_id, lesson.id, scheduleDate);
            sentCount++;
          } catch (sendErr) {
            logger.warn(`[STUDENT-REMINDER] Yuborishda ogohlantirish (ID: ${u.telegram_id}):`, sendErr.message);
          }
        }
      } catch (userErr) {
        logger.error(`[STUDENT-REMINDER] O'quvchi tekshirishda xatolik:`, userErr);
      }
    }

    return sentCount;
  }
};
