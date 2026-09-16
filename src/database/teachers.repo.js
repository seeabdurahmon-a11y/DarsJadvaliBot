import { getDatabase } from './db.js';

export const teachersRepo = {
  addTeacher({ first_name, last_name, subject = null, phone = null }) {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO teachers (first_name, last_name, subject, phone)
      VALUES (?, ?, ?, ?)
    `);
    const info = stmt.run(
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

  getAllTeachers() {
    const db = getDatabase();
    return db.prepare(`SELECT * FROM teachers ORDER BY last_name ASC, first_name ASC`).all();
  },

  updateTeacher(id, { first_name, last_name, subject, phone }) {
    const db = getDatabase();
    const current = this.getTeacherById(id);
    if (!current) return null;

    const newFirstName = first_name !== undefined ? first_name.trim() : current.first_name;
    const newLastName = last_name !== undefined ? last_name.trim() : current.last_name;
    const newSubject = subject !== undefined ? (subject ? subject.trim() : null) : current.subject;
    const newPhone = phone !== undefined ? (phone ? phone.trim() : null) : current.phone;

    db.prepare(`
      UPDATE teachers
      SET first_name = ?, last_name = ?, subject = ?, phone = ?
      WHERE id = ?
    `).run(newFirstName, newLastName, newSubject, newPhone, id);

    return this.getTeacherById(id);
  },

  deleteTeacher(id) {
    const db = getDatabase();
    return db.prepare(`DELETE FROM teachers WHERE id = ?`).run(id);
  },

  getTeacherSchedule(teacherName) {
    const db = getDatabase();
    if (!teacherName) return [];
    
    // Name matching query (e.g., "Aliyev", "Aliyev A.", "Karimova")
    const searchPattern = `%${teacherName.trim()}%`;
    return db.prepare(`
      SELECT l.*, g.name as group_name, g.telegram_chat_id
      FROM lessons l
      JOIN groups g ON l.group_id = g.id
      WHERE l.teacher LIKE ? AND g.is_active = 1
      ORDER BY l.day_of_week ASC, l.start_time ASC
    `).all(searchPattern);
  },

  getTeachersCount() {
    const db = getDatabase();
    const res = db.prepare(`SELECT COUNT(*) as count FROM teachers`).get();
    return res ? res.count : 0;
  }
};
