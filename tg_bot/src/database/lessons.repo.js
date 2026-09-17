import { getDatabase } from './db.js';

export const lessonsRepo = {
  addLesson({ school_id = null, group_id, day_of_week, date = null, start_time, end_time, subject, teacher = null, room = null }) {
    const db = getDatabase();
    let effectiveSchoolId = school_id;

    if (!effectiveSchoolId && group_id) {
      const grp = db.prepare(`SELECT school_id FROM groups WHERE id = ?`).get(group_id);
      effectiveSchoolId = grp ? grp.school_id : 1;
    }

    const stmt = db.prepare(`
      INSERT INTO lessons (school_id, group_id, day_of_week, date, start_time, end_time, subject, teacher, room)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      effectiveSchoolId || 1,
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

  getLessonsByDay(dayOfWeek, groupId = null, schoolId = null) {
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
    if (schoolId) {
      query += ` AND (l.school_id = ? OR g.school_id = ?)`;
      params.push(schoolId, schoolId);
    }

    query += ` ORDER BY l.start_time ASC, g.name ASC`;
    return db.prepare(query).all(...params);
  },

  getWeeklyLessons(groupId = null, schoolId = null) {
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
    if (schoolId) {
      query += ` AND (l.school_id = ? OR g.school_id = ?)`;
      params.push(schoolId, schoolId);
    }

    query += ` ORDER BY l.day_of_week ASC, l.start_time ASC, g.name ASC`;
    return db.prepare(query).all(...params);
  },

  updateLesson(id, fields) {
    const db = getDatabase();
    const current = this.getLessonById(id);
    if (!current) return null;

    const school_id = fields.school_id !== undefined ? fields.school_id : current.school_id;
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
      SET school_id = ?, group_id = ?, day_of_week = ?, date = ?, start_time = ?, end_time = ?, subject = ?, teacher = ?, room = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(school_id, group_id, day_of_week, date, start_time, end_time, subject, teacher, room, id);

    return this.getLessonById(id);
  },

  deleteLesson(id) {
    const db = getDatabase();
    return db.prepare(`DELETE FROM lessons WHERE id = ?`).run(id);
  },

  getAllLessons(groupId = null, schoolId = null) {
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
    if (schoolId) {
      query += ` AND (l.school_id = ? OR g.school_id = ?)`;
      params.push(schoolId, schoolId);
    }
    query += ` ORDER BY l.day_of_week ASC, l.start_time ASC`;
    return db.prepare(query).all(...params);
  },

  getLessonsCount(schoolId = null) {
    const db = getDatabase();
    if (schoolId) {
      const res = db.prepare(`SELECT COUNT(*) as count FROM lessons WHERE school_id = ?`).get(schoolId);
      return res ? res.count : 0;
    }
    const res = db.prepare(`SELECT COUNT(*) as count FROM lessons`).get();
    return res ? res.count : 0;
  }
};
