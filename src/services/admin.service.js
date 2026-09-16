import { usersRepo } from '../database/users.repo.js';
import { groupsRepo } from '../database/groups.repo.js';
import { lessonsRepo } from '../database/lessons.repo.js';
import { settingsRepo } from '../database/settings.repo.js';
import { getTodayInfo } from '../utils/date.util.js';
import { formatDailySchedule } from '../utils/formatter.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import { splitTelegramMessage } from '../utils/telegram-sender.util.js';

// Admin interaktiv amallar holatini saqlash (in-memory wizard)
const adminSessions = new Map();

export const adminService = {
  /**
   * Admin sessiyasini o'rnatish
   */
  setSession(userId, sessionData) {
    adminSessions.set(String(userId), {
      ...sessionData,
      updatedAt: Date.now()
    });
  },

  /**
   * Admin sessiyasini olish
   */
  getSession(userId) {
    return adminSessions.get(String(userId)) || null;
  },

  /**
   * Admin sessiyasini tozalash
   */
  clearSession(userId) {
    adminSessions.delete(String(userId));
  },

  /**
   * Barcha tizim statistikasini yig'ish
   */
  getStats() {
    const today = getTodayInfo();
    const usersCount = usersRepo.getUsersCount();
    const groupsCount = groupsRepo.getGroupsCount();
    const lessonsCount = lessonsRepo.getLessonsCount();
    const sentCountToday = settingsRepo.getSentCountToday(today.dateStr);
    const defaultSendTime = settingsRepo.get('default_send_time', config.DEFAULT_SEND_TIME);

    return {
      usersCount,
      groupsCount,
      lessonsCount,
      sentCountToday,
      defaultSendTime,
      today
    };
  },

  /**
   * Bitta guruhga bugungi dars jadvalini yuborish
   */
  async sendTodayScheduleToGroup(bot, group, { force = false } = {}) {
    const today = getTodayInfo();

    // Faqat haqiqiy Telegram chat ID ga yuborish
    if (!group.telegram_chat_id || group.telegram_chat_id.startsWith('class_') || group.telegram_chat_id.startsWith('unlinked_')) {
      logger.info(`[SCHEDULER] Sinfga (${group.name}) hali Telegram guruh ulanmagan. O'tkazib yuborildi.`);
      return { success: false, skipped: true, reason: 'no_telegram_group' };
    }

    // Takroriy yuborishni oldini olish tekshiruvi (agar force/manual bo'lmasa)
    if (!force && settingsRepo.isScheduleAlreadySent(group.id, today.dateStr)) {
      logger.info(`[SCHEDULER] Guruhga (${group.name}) bugun (${today.dateStr}) jadval allaqachon yuborilgan. O'tkazib yuborildi.`);
      return { success: false, skipped: true, reason: 'already_sent' };
    }

    const lessons = lessonsRepo.getLessonsByDay(today.dayOfWeek, group.id);

    // Agar darslar bo'lmasa
    if (lessons.length === 0) {
      logger.info(`[SCHEDULER] Guruhda (${group.name}) bugun darslar yo'q.`);
      const message = formatDailySchedule({
        title: '🏫 MAKTAB DARS JADVALI',
        dateHeader: `Bugun: ${today.formattedDate}`,
        lessons: [],
        groupName: group.name
      }) + '\n\n<i>⏳ Ushbu xabar 5 daqiqadan so‘ng avtomatik o‘chiriladi.</i>';

      try {
        const sent = await bot.api.sendMessage(group.telegram_chat_id, message, { parse_mode: 'HTML' });
        settingsRepo.recordSentSchedule(group.id, today.dateStr);

        // 5 daqiqadan keyin xabarni o'chirish
        setTimeout(async () => {
          try {
            await bot.api.deleteMessage(group.telegram_chat_id, sent.message_id);
            logger.info(`[AUTO DELETE] ${group.name} guruhidagi dars jadvali xabari 5 daqiqadan so'ng o'chirildi.`);
          } catch (delErr) {
            // silent catch
          }
        }, 5 * 60 * 1000);

        return { success: true, count: 0 };
      } catch (err) {
        logger.error(`[SCHEDULER] Guruhga (${group.name}) xabar yuborishda xatolik:`, err);
        return { success: false, error: err.message };
      }
    }

    const message = formatDailySchedule({
      title: '🏫 MAKTAB DARS JADVALI',
      dateHeader: `Bugun: ${today.formattedDate}`,
      lessons,
      groupName: group.name
    }) + '\n\n<i>⏳ Ushbu xabar 5 daqiqadan so‘ng avtomatik o‘chiriladi.</i>';

    try {
      const chunks = splitTelegramMessage(message, 3900);
      const sentIds = [];
      for (const chunk of chunks) {
        const sent = await bot.api.sendMessage(group.telegram_chat_id, chunk, { parse_mode: 'HTML' });
        sentIds.push(sent.message_id);
      }
      settingsRepo.recordSentSchedule(group.id, today.dateStr);
      logger.info(`[SCHEDULER] Guruhga (${group.name}) ${lessons.length} ta dars jadvali muvaffaqiyatli yuborildi.`);

      // 5 daqiqadan keyin xabarni o'chirish (300 000 ms)
      setTimeout(async () => {
        for (const msgId of sentIds) {
          try {
            await bot.api.deleteMessage(group.telegram_chat_id, msgId);
          } catch (delErr) {
            // silent catch if already deleted or permissions missing
          }
        }
        logger.info(`[AUTO DELETE] ${group.name} guruhidagi dars jadvali xabari 5 daqiqadan so'ng o'chirildi.`);
      }, 5 * 60 * 1000);

      return { success: true, count: lessons.length };
    } catch (err) {
      logger.error(`[SCHEDULER] Guruhga (${group.name} - ChatID: ${group.telegram_chat_id}) xabar yuborishda xatolik:`, err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Barcha faol guruhlarga bugungi jadvalni yuborish
   */
  async broadcastTodaySchedule(bot, { force = false } = {}) {
    const groups = groupsRepo.getAllGroups(true);
    const results = {
      total: groups.length,
      sent: 0,
      skipped: 0,
      failed: 0,
      details: []
    };

    for (const group of groups) {
      const res = await this.sendTodayScheduleToGroup(bot, group, { force });
      if (res.success) {
        results.sent++;
      } else if (res.skipped) {
        results.skipped++;
      } else {
        results.failed++;
      }
      results.details.push({ group: group.name, result: res });
    }

    return results;
  }
};
