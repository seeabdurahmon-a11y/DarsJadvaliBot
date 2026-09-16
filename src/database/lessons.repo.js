import { getDatabase } from './db.js';

export const lessonsRepo = {
  addLesson({ group_id, day_of_week, date = null, start_time, end_time, subject, teacher = null, room = null }) {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO lessons (group_id, day_of_week, date, start_time, end_time, subject, teacher, room)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      group_id,
      day_of_week,
      date || null,
      start_time.trim(),
      end_time.trim(),
      subject.trim(),
      teacher ? teacher.trim() : null,
      room ? room.trim() : null
    );
    return this.getLessonById(info.lastInsertRowid);
  },

  getLessonById(id) {
    const db = getDatabase();
    return db.prepare(`
      SELECT l.*, g.name as group_name, g.telegram_chat_id
      FROM lessons l
      JOIN groups g ON l.group_id = g.id
      WHERE l.id = ?
    `).get(id);
  },

  getLessonsByDay(dayOfWeek, groupId = null) {
    const db = getDatabase();
    let query = `
      SELECT l.*, g.name as group_name, g.telegram_chat_id
      FROM lessons l
      JOIN groups g ON l.group_id = g.id
      WHERE l.day_of_week = ? AND g.is_active = 1
    `;
    const params = [dayOfWeek];

    if (groupId) {
      query += ` AND l.group_id = ?`;
      params.push(groupId);
    }

    query += ` ORDER BY l.start_time ASC, g.name ASC`;
    return db.prepare(query).all(...params);
  },

  getWeeklyLessons(groupId = null) {
    const db = getDatabase();
    let query = `
      SELECT l.*, g.name as group_name, g.telegram_chat_id
      FROM lessons l
      JOIN groups g ON l.group_id = g.id
      WHERE g.is_active = 1
    `;
    const params = [];

    if (groupId) {
      query += ` AND l.group_id = ?`;
      params.push(groupId);
    }

    query += ` ORDER BY l.day_of_week ASC, l.start_time ASC, g.name ASC`;
    return db.prepare(query).all(...params);
  },

  updateLesson(id, fields) {
    const db = getDatabase();
    const current = this.getLessonById(id);
    if (!current) return null;

    const group_id = fields.group_id !== undefined ? fields.group_id : current.group_id;
    const day_of_week = fields.day_of_week !== undefined ? fields.day_of_week : current.day_of_week;
    const date = fields.date !== undefined ? fields.date : current.date;
    const start_time = fields.start_time !== undefined ? fields.start_time : current.start_time;
    const end_time = fields.end_time !== undefined ? fields.end_time : current.end_time;
    const subject = fields.subject !== undefined ? fields.subject : current.subject;
    const teacher = fields.teacher !== undefined ? fields.teacher : current.teacher;
    const room = fields.room !== undefined ? fields.room : current.room;

    db.prepare(`
      UPDATE lessons
      SET group_id = ?, day_of_week = ?, date = ?, start_time = ?, end_time = ?, subject = ?, teacher = ?, room = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(group_id, day_of_week, date, start_time, end_time, subject, teacher, room, id);

    return this.getLessonById(id);
  },

  deleteLesson(id) {
    const db = getDatabase();
    return db.prepare(`DELETE FROM lessons WHERE id = ?`).run(id);
  },

  getAllLessons(groupId = null) {
    const db = getDatabase();
    let query = `
      SELECT l.*, g.name as group_name, g.telegram_chat_id
      FROM lessons l
      JOIN groups g ON l.group_id = g.id
      WHERE g.is_active = 1
    `;
    const params = [];
    if (groupId) {
      query += ` AND l.group_id = ?`;
      params.push(groupId);
    }
    query += ` ORDER BY l.day_of_week ASC, l.start_time ASC`;
    return db.prepare(query).all(...params);
  },

  getLessonsCount() {
    const db = getDatabase();
    const res = db.prepare(`SELECT COUNT(*) as count FROM lessons`).get();
    return res ? res.count : 0;
  }
};
