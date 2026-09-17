import { getDatabase } from './db.js';

export const teachersRepo = {
  addTeacher({ school_id = 1, first_name, last_name, subject = null, phone = null }) {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO teachers (school_id, first_name, last_name, subject, phone)
      VALUES (?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      school_id || 1,
      first_name.trim(),
      last_name.trim(),
      subject ? subject.trim() : null,
      phone ? phone.trim() : null
    );
    return this.getTeacherById(info.lastInsertRowid);
  },

  getTeacherById(id) {
    const db = getDatabase();
    return db.prepare(`SELECT * FROM teachers WHERE id = ?`).get(id);
  },

  getAllTeachers(schoolId = null) {
    const db = getDatabase();
    if (schoolId) {
      return db.prepare(`SELECT * FROM teachers WHERE school_id = ? ORDER BY last_name ASC, first_name ASC`).all(schoolId);
    }
    return db.prepare(`SELECT * FROM teachers ORDER BY last_name ASC, first_name ASC`).all();
  },

  updateTeacher(id, { first_name, last_name, subject, phone, school_id }) {
    const db = getDatabase();
    const current = this.getTeacherById(id);
    if (!current) return null;

    const newFirstName = first_name !== undefined ? first_name.trim() : current.first_name;
    const newLastName = last_name !== undefined ? last_name.trim() : current.last_name;
    const newSubject = subject !== undefined ? (subject ? subject.trim() : null) : current.subject;
    const newPhone = phone !== undefined ? (phone ? phone.trim() : null) : current.phone;
    const newSchoolId = school_id !== undefined ? school_id : current.school_id;

    db.prepare(`
      UPDATE teachers
      SET first_name = ?, last_name = ?, subject = ?, phone = ?, school_id = ?
      WHERE id = ?
    `).run(newFirstName, newLastName, newSubject, newPhone, newSchoolId, id);

    return this.getTeacherById(id);
  },

  deleteTeacher(id) {
    const db = getDatabase();
    return db.prepare(`DELETE FROM teachers WHERE id = ?`).run(id);
  },

  getTeacherSchedule(teacherName, schoolId = null) {
    const db = getDatabase();
    if (!teacherName) return [];
    
    const searchPattern = `%${teacherName.trim()}%`;
    let query = `
      SELECT l.*, g.name as group_name, g.telegram_chat_id
      FROM lessons l
      JOIN groups g ON l.group_id = g.id
      WHERE l.teacher LIKE ? AND g.is_active = 1
    `;
    const params = [searchPattern];
    if (schoolId) {
      query += ` AND (l.school_id = ? OR g.school_id = ?)`;
      params.push(schoolId, schoolId);
    }
    query += ` ORDER BY l.day_of_week ASC, l.start_time ASC`;
    return db.prepare(query).all(...params);
  },

  getTeachersCount(schoolId = null) {
    const db = getDatabase();
    if (schoolId) {
      const res = db.prepare(`SELECT COUNT(*) as count FROM teachers WHERE school_id = ?`).get(schoolId);
      return res ? res.count : 0;
    }
    const res = db.prepare(`SELECT COUNT(*) as count FROM teachers`).get();
    return res ? res.count : 0;
  }
};
