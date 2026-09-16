import { getDatabase } from './db.js';

export const settingsRepo = {
  get(key, defaultValue = null) {
    const db = getDatabase();
    const row = db.prepare(`SELECT value FROM settings WHERE key = ?`).get(key);
    return row ? row.value : defaultValue;
  },

  set(key, value) {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO settings (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);
    stmt.run(key, String(value));
  },

  /**
   * Bugungi sana va guruh uchun jadval allaqachon yuborilganmi?
   */
  isScheduleAlreadySent(groupId, scheduleDate) {
    const db = getDatabase();
    const row = db.prepare(`
      SELECT id FROM sent_schedules
      WHERE group_id = ? AND schedule_date = ?
    `).get(groupId, scheduleDate);
    return Boolean(row);
  },

  /**
   * Jadval yuborilganligini qayd etish (takrorlanishni oldini olish uchun)
   */
  recordSentSchedule(groupId, scheduleDate) {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO sent_schedules (group_id, schedule_date, sent_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `);
    return stmt.run(groupId, scheduleDate);
  },

  /**
   * Bugun necha guruhga jadval yuborilganligini hisoblash
   */
  getSentCountToday(scheduleDate) {
    const db = getDatabase();
    const res = db.prepare(`
      SELECT COUNT(*) as count FROM sent_schedules
      WHERE schedule_date = ?
    `).get(scheduleDate);
    return res ? res.count : 0;
  }
};
