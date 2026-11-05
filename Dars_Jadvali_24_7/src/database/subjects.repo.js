import { getDatabase } from './db.js';
import { getSubjectEmoji } from '../utils/formatter.js';

export const subjectsRepo = {
  addSubject({ school_id = 1, name, emoji = null, code = null }) {
    const db = getDatabase();
    const cleanName = name.trim();
    const cleanEmoji = emoji ? emoji.trim() : getSubjectEmoji(cleanName);
    const cleanCode = code ? code.trim().toUpperCase() : null;

    const existing = db.prepare(`SELECT * FROM subjects WHERE school_id = ? AND LOWER(name) = LOWER(?)`).get(school_id || 1, cleanName);
    if (existing) {
      db.prepare(`UPDATE subjects SET emoji = ?, code = COALESCE(?, code) WHERE id = ?`).run(cleanEmoji, cleanCode, existing.id);
      return this.getSubjectById(existing.id);
    }

    const stmt = db.prepare(`
      INSERT INTO subjects (school_id, name, emoji, code)
      VALUES (?, ?, ?, ?)
    `);
    const info = stmt.run(school_id || 1, cleanName, cleanEmoji, cleanCode);
    return this.getSubjectById(info.lastInsertRowid);
  },

  getSubjectById(id) {
    const db = getDatabase();
    return db.prepare(`SELECT * FROM subjects WHERE id = ?`).get(id);
  },

  getSubjectByName(name, schoolId = null) {
    const db = getDatabase();
    if (schoolId) {
      return db.prepare(`SELECT * FROM subjects WHERE LOWER(name) = LOWER(?) AND school_id = ?`).get(name.trim(), schoolId);
    }
    return db.prepare(`SELECT * FROM subjects WHERE LOWER(name) = LOWER(?)`).get(name.trim());
  },

  getAllSubjects(schoolId = null) {
    const db = getDatabase();
    if (schoolId) {
      return db.prepare(`SELECT * FROM subjects WHERE school_id = ? ORDER BY name ASC`).all(schoolId);
    }
    return db.prepare(`SELECT * FROM subjects ORDER BY name ASC`).all();
  },

  deleteSubject(id) {
    const db = getDatabase();
    return db.prepare(`DELETE FROM subjects WHERE id = ?`).run(id);
  },

  getSubjectsCount(schoolId = null) {
    const db = getDatabase();
    if (schoolId) {
      const res = db.prepare(`SELECT COUNT(*) as count FROM subjects WHERE school_id = ?`).get(schoolId);
      return res ? res.count : 0;
    }
    const res = db.prepare(`SELECT COUNT(*) as count FROM subjects`).get();
    return res ? res.count : 0;
  }
};
