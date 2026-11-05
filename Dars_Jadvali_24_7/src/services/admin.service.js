import { InlineKeyboard } from 'grammy';
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
      });

      try {
        await bot.api.sendMessage(group.telegram_chat_id, message, { parse_mode: 'HTML' });
        settingsRepo.recordSentSchedule(group.id, today.dateStr);
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
    });

    try {
      const chunks = splitTelegramMessage(message, 3900);
      for (const chunk of chunks) {
        await bot.api.sendMessage(group.telegram_chat_id, chunk, { parse_mode: 'HTML' });
      }
      settingsRepo.recordSentSchedule(group.id, today.dateStr);
      logger.info(`[SCHEDULER] Guruhga (${group.name}) ${lessons.length} ta dars jadvali muvaffaqiyatli yuborildi.`);

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
  },

  /**
   * Barcha ustozlarga (va ma'murlarga) Nazorat ishi qo'llanmasini tarqatish
   */
  async broadcastExamGuideToTeachers(bot, { schoolId = null, includeAllUsers = true } = {}) {
    const text = `📢 <b>HURMATLI USTOZLAR DIQQATIGA!</b> 👨‍🏫👩‍🏫\n\n` +
      `Maktabimiz Telegram botida <b>Nazorat ishlari (BSB, CHSB va joriy nazoratlar)</b> tizimi ishga tushirildi!\n\n` +
      `✨ <b>Ushbu tizim orqali nimalar qilish mumkin?</b>\n` +
      `1️⃣ <b>Sinf tanlash:</b> Qaysi sinfda nazorat ishi o‘tkazmoqchi bo‘lsangiz, ro‘yxatdan tanlaysiz.\n` +
      `2️⃣ <b>Sana va dars soati:</b> Nazorat ishi qaysi kuni va nechanchi darsda bo‘lishini belgilaysiz.\n` +
      `3️⃣ <b>Nazorat turi:</b> BSB, CHSB, Yozma ish yoki test turini kiritasiz.\n` +
      `4️⃣ <b>O‘quvchilarni ogohlantirish:</b> Siz kiritgan nazorat ishi avtomatik ravishda o‘quvchilar jadvaliga yoziladi va ularga eslatma yuboriladi.\n\n` +
      `📝 <b>Qanday boshlash mumkin?</b>\n` +
      `Quyidagi <b>«➕ Yangi nazorat ishi belgilash»</b> tugmasini bosing yoki bot menyusidagi <b>«📝 Nazorat ishi»</b> bo‘limiga kiring.\n\n` +
      `<i>(Agar rolingiz biriktirilmagan bo‘lsa, /start buyrug‘ini bosib o‘zingizni ustoz sifatida tanlang)</i>`;

    const keyboard = new InlineKeyboard()
      .text('➕ Yangi nazorat ishi belgilash', 'teacher_exam_new')
      .row()
      .text('📋 Mening nazorat ishlarim', 'teacher_exam_list');

    // Foydalanuvchilarni yig'ish
    const teachers = usersRepo.getActiveTeacherUsers(schoolId);
    let targetUsers = [...teachers];

    if (includeAllUsers || targetUsers.length === 0) {
      const allUsers = usersRepo.getAllUsers(schoolId);
      const seenIds = new Set(targetUsers.map(u => String(u.telegram_id)));
      for (const u of allUsers) {
        if (u.telegram_id && !seenIds.has(String(u.telegram_id)) && String(u.telegram_id) !== '1087968824') {
          targetUsers.push(u);
          seenIds.add(String(u.telegram_id));
        }
      }
    }

    const results = {
      total: targetUsers.length,
      sent: 0,
      failed: 0,
      details: []
    };

    for (const u of targetUsers) {
      try {
        await bot.api.sendMessage(u.telegram_id, text, {
          parse_mode: 'HTML',
          reply_markup: keyboard
        });
        results.sent++;
        results.details.push({ telegram_id: u.telegram_id, name: u.first_name || u.username, success: true });
        logger.info(`[BROADCAST] Nazorat ishi qo'llanmasi ${u.telegram_id} (${u.first_name || u.username}) ga muvaffaqiyatli yuborildi.`);
        await new Promise(res => setTimeout(res, 50));
      } catch (err) {
        results.failed++;
        results.details.push({ telegram_id: u.telegram_id, name: u.first_name || u.username, success: false, error: err.message });
        logger.warn(`[BROADCAST] ${u.telegram_id} ga xabar yuborishda xatolik:`, err.message);
      }
    }

    return results;
  },

  /**
   * Dars jadvali yangilangani haqida barcha foydalanuvchilarga xabar yuborish
   */
  async broadcastScheduleUpdateNotification(bot, { schoolId = null, customText = null } = {}) {
    const text = customText || (
      `🔔 <b>DIQQAT: MAKTAB DARS JADVALI YANGILANDI!</b> 📅\n\n` +
      `Hurmatli ustozlar, o‘quvchilar va ota-onalar!\n\n` +
      `Maktabimizda <b>yangi dars jadvali (19.10.2026 holatiga ko‘ra)</b> tizimga to‘liq yuklandi va amaliyotga tatbiq etildi.\n\n` +
      `✨ <b>Asosiy o‘zgarishlar:</b>\n` +
      `• Barcha 40 ta sinf (1-A dan 11-G gacha) dars jadvallari yangilandi.\n` +
      `• Ayrim fanlar va dars soatlari o‘zaro optimallashtirildi.\n` +
      `• O‘qituvchilar dars vaqtlari qayta muvofiqlashtirildi.\n\n` +
      `📌 <i>O‘zingizning sinfingiz yoki dars jadvalingizni quyidagi tugma orqali tekshirib olishingiz mumkin.</i>`
    );

    const keyboard = new InlineKeyboard()
      .text('📅 Mening sinfim jadvali', 'user_my_class_menu')
      .row()
      .text('🔄 Maktab / Sinfni almashtirish', 'user_reset_profile_prompt');

    const allUsers = usersRepo.getAllUsers(schoolId);
    const targetUsers = [];
    const seenIds = new Set();

    for (const u of allUsers) {
      if (u.telegram_id && !seenIds.has(String(u.telegram_id)) && String(u.telegram_id) !== '1087968824') {
        targetUsers.push(u);
        seenIds.add(String(u.telegram_id));
      }
    }

    const results = {
      total: targetUsers.length,
      sent: 0,
      failed: 0,
      details: []
    };

    for (const u of targetUsers) {
      try {
        await bot.api.sendMessage(u.telegram_id, text, {
          parse_mode: 'HTML',
          reply_markup: keyboard
        });
        results.sent++;
        results.details.push({ telegram_id: u.telegram_id, name: u.first_name || u.username, success: true });
        logger.info(`[BROADCAST-SCHEDULE] ${u.telegram_id} (${u.first_name || u.username}) ga jadval yangilanish xabari yuborildi.`);
        await new Promise(res => setTimeout(res, 50));
      } catch (err) {
        results.failed++;
        results.details.push({ telegram_id: u.telegram_id, name: u.first_name || u.username, success: false, error: err.message });
        logger.warn(`[BROADCAST-SCHEDULE] ${u.telegram_id} ga xabar yuborishda xatolik:`, err.message);
      }
    }

    return results;
  }
};
