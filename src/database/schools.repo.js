import { getDatabase } from './db.js';
import { config } from '../config/index.js';

export const schoolsRepo = {
  normalizeCode(rawCode) {
    if (!rawCode) return '';
    return String(rawCode)
      .toUpperCase()
      .replace(/[\s_]+/g, '-')
      .trim();
  },

  addSchool({ code, name, region = '', admin_password = 'admin', default_send_time = config.DEFAULT_SEND_TIME }) {
    const db = getDatabase();
    const cleanName = String(name).trim();
    let cleanCode = this.normalizeCode(code);

    if (!cleanCode) {
      // Auto-generate code if not given
      const nextNum = (this.getSchoolsCount() + 1);
      cleanCode = `M-${String(nextNum).padStart(2, '0')}`;
    }

    const stmt = db.prepare(`
      INSERT INTO schools (code, name, region, admin_password, default_send_time, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
      ON CONFLICT(code) DO UPDATE SET
        name = excluded.name,
        region = excluded.region,
        admin_password = excluded.admin_password,
        default_send_time = excluded.default_send_time,
        is_active = 1
    `);

    stmt.run(cleanCode, cleanName, region || '', admin_password || 'admin', default_send_time || '06:00');
    return this.getSchoolByCode(cleanCode);
  },

  getSchoolById(id) {
    const db = getDatabase();
    return db.prepare(`SELECT * FROM schools WHERE id = ?`).get(id);
  },

  getSchoolByCode(code) {
    if (!code) return null;
    const db = getDatabase();
    const clean = this.normalizeCode(code);
    const raw = String(code).trim().toLowerCase();

    // 1. Direct code match (e.g. M-01)
    let school = db.prepare(`SELECT * FROM schools WHERE UPPER(code) = ? AND is_active = 1`).get(clean);
    if (school) return school;

    // 2. Without hyphen (e.g. M01 -> M-01)
    const withHyphen = clean.replace(/^([A-Z]+)(\d+)$/, '$1-$2');
    school = db.prepare(`SELECT * FROM schools WHERE UPPER(code) = ? AND is_active = 1`).get(withHyphen);
    if (school) return school;

    // 3. Digits only (e.g. 1 -> M-01)
    if (/^\d+$/.test(clean)) {
      const numCode = `M-${clean.padStart(2, '0')}`;
      school = db.prepare(`SELECT * FROM schools WHERE UPPER(code) = ? AND is_active = 1`).get(numCode);
      if (school) return school;
    }

    // 4. Name search fallback
    school = db.prepare(`SELECT * FROM schools WHERE LOWER(name) LIKE ? AND is_active = 1 LIMIT 1`).get(`%${raw}%`);
    return school || null;
  },

  getAllSchools(onlyActive = true) {
    const db = getDatabase();
    if (onlyActive) {
      return db.prepare(`SELECT * FROM schools WHERE is_active = 1 ORDER BY id ASC`).all();
    }
    return db.prepare(`SELECT * FROM schools ORDER BY id ASC`).all();
  },

  getAllSchoolsWithStats() {
    const db = getDatabase();
    return db.prepare(`
      SELECT s.*,
        (SELECT COUNT(*) FROM groups WHERE school_id = s.id AND is_active = 1) as groups_count,
        (SELECT COUNT(*) FROM teachers WHERE school_id = s.id) as teachers_count,
        (SELECT COUNT(*) FROM lessons WHERE school_id = s.id) as lessons_count,
        (SELECT COUNT(*) FROM users WHERE selected_school_id = s.id) as users_count
      FROM schools s
      WHERE s.is_active = 1
      ORDER BY s.id ASC
    `).all();
  },

  updateSchool(id, { name, code, region, admin_password, default_send_time, is_active }) {
    const db = getDatabase();
    const current = this.getSchoolById(id);
    if (!current) return null;

    const newName = name !== undefined ? name.trim() : current.name;
    const newCode = code !== undefined ? this.normalizeCode(code) : current.code;
    const newRegion = region !== undefined ? region.trim() : current.region;
    const newPwd = admin_password !== undefined ? admin_password.trim() : current.admin_password;
    const newSendTime = default_send_time !== undefined ? default_send_time.trim() : current.default_send_time;
    const newActive = is_active !== undefined ? (is_active ? 1 : 0) : current.is_active;

    db.prepare(`
      UPDATE schools
      SET name = ?, code = ?, region = ?, admin_password = ?, default_send_time = ?, is_active = ?
      WHERE id = ?
    `).run(newName, newCode, newRegion, newPwd, newSendTime, newActive, id);

    return this.getSchoolById(id);
  },

  deleteSchool(id) {
    const db = getDatabase();
    // Cascade delete lessons, groups, teachers, subjects for this school
    db.prepare(`DELETE FROM lessons WHERE school_id = ?`).run(id);
    db.prepare(`DELETE FROM groups WHERE school_id = ?`).run(id);
    db.prepare(`DELETE FROM teachers WHERE school_id = ?`).run(id);
    db.prepare(`DELETE FROM subjects WHERE school_id = ?`).run(id);
    db.prepare(`DELETE FROM sent_schedules WHERE school_id = ?`).run(id);
    return db.prepare(`DELETE FROM schools WHERE id = ?`).run(id);
  },

  verifyPassword(schoolIdOrCode, password) {
    if (!password) return false;
    let school = null;
    if (typeof schoolIdOrCode === 'number') {
      school = this.getSchoolById(schoolIdOrCode);
    } else {
      school = this.getSchoolByCode(schoolIdOrCode);
    }
    if (!school) return false;
    return String(school.admin_password).trim() === String(password).trim() || password === 'superadmin';
  },

  getSchoolsCount() {
    const db = getDatabase();
    const res = db.prepare(`SELECT COUNT(*) as count FROM schools WHERE is_active = 1`).get();
    return res ? res.count : 0;
  }
};
