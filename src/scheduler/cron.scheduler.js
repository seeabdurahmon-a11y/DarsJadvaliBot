import cron from 'node-cron';
import { groupsRepo } from '../database/groups.repo.js';
import { settingsRepo } from '../database/settings.repo.js';
import { adminService } from '../services/admin.service.js';
import { teacherReminderService } from '../services/teacher-reminder.service.js';
import { getTodayInfo } from '../utils/date.util.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

let cronTask = null;

export const scheduler = {
  /**
   * Schedulerni ishga tushirish
   */
  init(bot) {
    if (cronTask) {
      cronTask.stop();
    }

    logger.info(`[SCHEDULER] Dars jadvali va ustozlar eslatuvchi scheduler ishga tushdi (Vaqt mintaqasi: ${config.TZ})`);

    // Har daqiqada tekshirish (* * * * *)
    cronTask = cron.schedule('* * * * *', async () => {
      try {
        // 1. Sinf guruhlariga tonggi dars jadvalini yuborish
        await this.checkAndSendSchedules(bot);

        // 2. Ustozlarga dars boshlanishidan 5 daqiqa oldin eslatma yuborish
        await teacherReminderService.checkAndSendTeacherReminders(bot, 5);
      } catch (err) {
        logger.error('[SCHEDULER] Avtomatik yuborishda kutilmagan xatolik:', err);
      }
    });

    return cronTask;
  },

  /**
   * Guruhlarning yuborish vaqtini tekshirish va yuborish
   */
  async checkAndSendSchedules(bot) {
    const today = getTodayInfo();
    const currentTime = today.timeStr; // "06:00"

    const groups = groupsRepo.getAllGroups(true);
    if (!groups || groups.length === 0) return;

    for (const group of groups) {
      const groupSendTime = (group.send_time || config.DEFAULT_SEND_TIME).trim();

      // Agar hozirgi vaqt guruhning yuborish vaqtiga to'g'ri kelsa
      if (groupSendTime === currentTime) {
        // Allaqachon yuborilganmi tekshirish
        const isAlreadySent = settingsRepo.isScheduleAlreadySent(group.id, today.dateStr);

        if (!isAlreadySent) {
          logger.info(`[SCHEDULER] Vaqt keldi (${currentTime})! Guruhga jadval yuborilmoqda: ${group.name} (${group.telegram_chat_id})`);
          await adminService.sendTodayScheduleToGroup(bot, group, { force: false });
        }
      }
    }
  },

  /**
   * Schedulerni to'xtatish
   */
  stop() {
    if (cronTask) {
      cronTask.stop();
      cronTask = null;
      logger.info('[SCHEDULER] Scheduler to\'xtatildi.');
    }
  }
};
