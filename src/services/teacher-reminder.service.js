import { teachersRepo } from '../database/teachers.repo.js';
import { usersRepo } from '../database/users.repo.js';
import { settingsRepo } from '../database/settings.repo.js';
import { getNowInTashkent } from '../utils/date.util.js';
import { getSubjectEmoji, escapeHtml } from '../utils/formatter.js';
import { logger } from '../utils/logger.js';

export const teacherReminderService = {
  /**
   * Dars boshlanishidan 5 daqiqa oldin ustozlarga eslatma yuborish
   * @param {Object} bot - grammY Bot instansiyasi
   * @param {number} advanceMinutes - Darsdan necha daqiqa oldin (standart: 5)
   */
  async checkAndSendTeacherReminders(bot, advanceMinutes = 5) {
    if (!bot?.api?.sendMessage) return 0;

    const now = getNowInTashkent();
    const targetTime = now.plus({ minutes: advanceMinutes });
    const targetTimeStr = targetTime.toFormat('HH:mm'); // e.g. "09:20"
    const scheduleDate = now.toFormat('yyyy-MM-dd'); // e.g. "2026-09-18"
    const dayOfWeek = now.weekday; // 1=Dushanba..6=Shanba, 7=Yakshanba

    if (dayOfWeek > 6) {
      // Yakshanba kuni darslar bo'lmaydi
      return 0;
    }

    // Faol ustoz foydalanuvchilarni olamiz
    const teacherUsers = usersRepo.getActiveTeacherUsers();
    if (!teacherUsers || teacherUsers.length === 0) return 0;

    let sentCount = 0;

    for (const u of teacherUsers) {
      try {
        // Ushbu ustozning bugungi darslarini olamiz
        const todayLessons = teachersRepo.getTeacherLessonsByDay(u.selected_teacher_id, dayOfWeek, u.selected_school_id);
        if (!todayLessons || todayLessons.length === 0) continue;

        // Boshlanish vaqti targetTimeStr bo'lgan darslarni topamiz
        const upcomingLessons = todayLessons.filter(l => (l.start_time || '').trim() === targetTimeStr);

        for (const lesson of upcomingLessons) {
          // Allaqachon eslatma yuborilganmi?
          const isSent = settingsRepo.isTeacherReminderSent(u.telegram_id, lesson.id, scheduleDate);
          if (isSent) continue;

          const emoji = getSubjectEmoji(lesson.subject);
          const messageText = `🔔 <b>DARSINGIZ BOSHLANMOQDA! (5 daqiqadan so‘ng)</b>\n\n` +
            `👥 <b>Sinf:</b> <b>${escapeHtml(lesson.group_name || 'Sinf')}</b>\n` +
            `⏰ <b>Dars vaqti:</b> <code>${lesson.start_time} — ${lesson.end_time}</code>\n` +
            `${emoji} <b>Fan:</b> <b>${escapeHtml(lesson.subject)}</b>\n` +
            (lesson.room ? `🚪 <b>Xona:</b> ${escapeHtml(lesson.room)}-xona\n` : '') +
            `\n` +
            `💡 <i>Hurmatli ustoz, darsga tayyorgarlik ko‘ring!</i>`;

          try {
            await bot.api.sendMessage(u.telegram_id, messageText, { parse_mode: 'HTML' });
            settingsRepo.recordTeacherReminder(u.selected_teacher_id, u.telegram_id, lesson.id, scheduleDate);
            sentCount++;
            logger.info(`[TEACHER-REMINDER] Eslatma yuborildi: Ustoz ${u.teacher_last_name} ${u.teacher_first_name} (ID: ${u.telegram_id}) -> ${lesson.group_name} (${lesson.start_time})`);
          } catch (sendErr) {
            logger.warn(`[TEACHER-REMINDER] Yuborishda ogohlantirish (Telegram ID: ${u.telegram_id}):`, sendErr.message);
          }
        }
      } catch (userErr) {
        logger.error(`[TEACHER-REMINDER] Ustoz tekshirishda xatolik:`, userErr);
      }
    }

    return sentCount;
  }
};
