import { getDatabase } from './db.js';
import { getSubjectEmoji } from '../utils/formatter.js';

export const subjectsRepo = {
  addSubject({ name, emoji = null, code = null }) {
    const db = getDatabase();
    const cleanName = name.trim();
    const cleanEmoji = emoji ? emoji.trim() : getSubjectEmoji(cleanName);
    const cleanCode = code ? code.trim().toUpperCase() : null;

    const stmt = db.prepare(`
      INSERT INTO subjects (name, emoji, code)
      VALUES (?, ?, ?)
      ON CONFLICT(name) DO UPDATE SET
        emoji = excluded.emoji,
        code = COALESCE(excluded.code, subjects.code)
    `);
    const info = stmt.run(cleanName, cleanEmoji, cleanCode);
    return this.getSubjectByName(cleanName);
  },

  getSubjectById(id) {
    const db = getDatabase();
    return db.prepare(`SELECT * FROM subjects WHERE id = ?`).get(id);
  },

  getSubjectByName(name) {
    const db = getDatabase();
    return db.prepare(`SELECT * FROM subjects WHERE LOWER(name) = LOWER(?)`).get(name.trim());
  },

  getAllSubjects() {
    const db = getDatabase();
    return db.prepare(`SELECT * FROM subjects ORDER BY name ASC`).all();
  },

  deleteSubject(id) {
    const db = getDatabase();
    return db.prepare(`DELETE FROM subjects WHERE id = ?`).run(id);
  },

  getSubjectsCount() {
    const db = getDatabase();
    const res = db.prepare(`SELECT COUNT(*) as count FROM subjects`).get();
    return res ? res.count : 0;
  }
};
