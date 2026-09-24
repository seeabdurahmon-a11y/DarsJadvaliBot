import { getDatabase } from './db.js';

export const examsRepo = {
  /**
   * Yangi nazorat ishi qo'shish
   */
  addExam({ school_id = null, teacher_id = null, group_id, subject, date, lesson_number = null, title = 'Nazorat ishi', description = null }) {
    const db = getDatabase();
    let effectiveSchoolId = school_id;

    if (!effectiveSchoolId && group_id) {
      const grp = db.prepare(`SELECT school_id FROM groups WHERE id = ?`).get(group_id);
      effectiveSchoolId = grp ? grp.school_id : 1;
    }

    const stmt = db.prepare(`
      INSERT INTO exams (school_id, teacher_id, group_id, subject, date, lesson_number, title, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      effectiveSchoolId || 1,
      teacher_id || null,
      group_id,
      subject.trim(),
      date.trim(),
      lesson_number ? Number(lesson_number) : null,
      (title || 'Nazorat ishi').trim(),
      description ? description.trim() : null
    );

    return this.getExamById(info.lastInsertRowid);
  },

  /**
   * ID bo'yicha nazorat ishini olish
   */
  getExamById(id) {
    const db = getDatabase();
    return db.prepare(`
      SELECT e.*, 
             g.name as group_name, 
             g.telegram_chat_id,
             t.first_name as teacher_first_name, 
             t.last_name as teacher_last_name,
             t.subject as teacher_subject
      FROM exams e
      JOIN groups g ON e.group_id = g.id
      LEFT JOIN teachers t ON e.teacher_id = t.id
      WHERE e.id = ?
    `).get(id);
  },

  /**
   * Muayyan sana bo'yicha nazorat ishlarini olish
   */
  getExamsByDate(date, groupId = null, schoolId = null) {
    const db = getDatabase();
    let query = `
      SELECT e.*, 
             g.name as group_name, 
             g.telegram_chat_id,
             t.first_name as teacher_first_name, 
             t.last_name as teacher_last_name
      FROM exams e
      JOIN groups g ON e.group_id = g.id
      LEFT JOIN teachers t ON e.teacher_id = t.id
      WHERE e.date = ?
    `;
    const params = [date.trim()];

    if (groupId) {
      query += ` AND e.group_id = ?`;
      params.push(groupId);
    }
    if (schoolId) {
      query += ` AND e.school_id = ?`;
      params.push(schoolId);
    }

    query += ` ORDER BY e.lesson_number ASC, e.id ASC`;
    return db.prepare(query).all(...params);
  },

  /**
   * Muayyan sinf bo'yicha nazorat ishlarini olish (Kelgusi yoki barcha)
   */
  getExamsByGroup(groupId, fromDate = null) {
    const db = getDatabase();
    let query = `
      SELECT e.*, 
             g.name as group_name, 
             g.telegram_chat_id,
             t.first_name as teacher_first_name, 
             t.last_name as teacher_last_name
      FROM exams e
      JOIN groups g ON e.group_id = g.id
      LEFT JOIN teachers t ON e.teacher_id = t.id
      WHERE e.group_id = ?
    `;
    const params = [groupId];

    if (fromDate) {
      query += ` AND e.date >= ?`;
      params.push(fromDate.trim());
    }

    query += ` ORDER BY e.date ASC, e.lesson_number ASC`;
    return db.prepare(query).all(...params);
  },

  /**
   * O'qituvchi bo'yicha nazorat ishlarini olish
   */
  getExamsByTeacher(teacherId, fromDate = null, schoolId = null) {
    const db = getDatabase();
    let query = `
      SELECT e.*, 
             g.name as group_name, 
             g.telegram_chat_id,
             t.first_name as teacher_first_name, 
             t.last_name as teacher_last_name
      FROM exams e
      JOIN groups g ON e.group_id = g.id
      LEFT JOIN teachers t ON e.teacher_id = t.id
      WHERE e.teacher_id = ?
    `;
    const params = [teacherId];

    if (fromDate) {
      query += ` AND e.date >= ?`;
      params.push(fromDate.trim());
    }
    if (schoolId) {
      query += ` AND e.school_id = ?`;
      params.push(schoolId);
    }

    query += ` ORDER BY e.date ASC, e.lesson_number ASC`;
    return db.prepare(query).all(...params);
  },

  /**
   * Maktab bo'yicha kelgusi barcha nazorat ishlari
   */
  getUpcomingExams(schoolId = null, fromDate = null, limit = 30) {
    const db = getDatabase();
    let query = `
      SELECT e.*, 
             g.name as group_name, 
             g.telegram_chat_id,
             t.first_name as teacher_first_name, 
             t.last_name as teacher_last_name
      FROM exams e
      JOIN groups g ON e.group_id = g.id
      LEFT JOIN teachers t ON e.teacher_id = t.id
    `;
    const params = [];

    if (fromDate) {
      query += ` WHERE e.date >= ?`;
      params.push(fromDate.trim());
    }

    if (schoolId) {
      query += params.length ? ` AND e.school_id = ?` : ` WHERE e.school_id = ?`;
      params.push(schoolId);
    }

    query += ` ORDER BY e.date ASC, e.lesson_number ASC LIMIT ?`;
    params.push(limit);

    return db.prepare(query).all(...params);
  },

  /**
   * Nazorat ishini o'chirish
   */
  deleteExam(id) {
    const db = getDatabase();
    return db.prepare(`DELETE FROM exams WHERE id = ?`).run(id);
  },

  /**
   * Ustoz o'zining nazorat ishini o'chirishi
   */
  deleteTeacherExam(id, teacherId) {
    const db = getDatabase();
    return db.prepare(`DELETE FROM exams WHERE id = ? AND teacher_id = ?`).run(id, teacherId);
  },

  /**
   * Nazorat ishlari soni
   */
  getExamsCount(schoolId = null) {
    const db = getDatabase();
    if (schoolId) {
      const res = db.prepare(`SELECT COUNT(*) as count FROM exams WHERE school_id = ?`).get(schoolId);
      return res ? res.count : 0;
    }
    const res = db.prepare(`SELECT COUNT(*) as count FROM exams`).get();
    return res ? res.count : 0;
  }
};
