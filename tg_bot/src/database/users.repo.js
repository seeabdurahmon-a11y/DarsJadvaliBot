import { getDatabase } from './db.js';

export const usersRepo = {
  upsertUser(arg1, arg2 = {}) {
    let telegram_id, username, first_name, is_admin, selected_school_id, selected_group_id;
    if (typeof arg1 === 'object' && arg1 !== null) {
      ({ telegram_id, username, first_name, is_admin = 0, selected_school_id = null, selected_group_id = null } = arg1);
    } else {
      telegram_id = arg1;
      ({ username, first_name, is_admin = 0, selected_school_id = null, selected_group_id = null } = arg2);
    }
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO users (telegram_id, username, first_name, is_admin, selected_school_id, selected_group_id)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(telegram_id) DO UPDATE SET
        username = COALESCE(excluded.username, users.username),
        first_name = COALESCE(excluded.first_name, users.first_name),
        is_admin = CASE WHEN excluded.is_admin = 1 THEN 1 ELSE users.is_admin END,
        selected_school_id = COALESCE(excluded.selected_school_id, users.selected_school_id),
        selected_group_id = COALESCE(excluded.selected_group_id, users.selected_group_id)
    `);
    stmt.run(
      String(telegram_id),
      username || null,
      first_name || null,
      is_admin ? 1 : 0,
      selected_school_id || null,
      selected_group_id || null
    );
    return this.getUserByTelegramId(telegram_id);
  },

  getUserByTelegramId(telegramId) {
    const db = getDatabase();
    return db.prepare(`
      SELECT u.*, 
        g.name as selected_group_name,
        s.name as selected_school_name,
        s.code as selected_school_code
      FROM users u
      LEFT JOIN groups g ON u.selected_group_id = g.id
      LEFT JOIN schools s ON (u.selected_school_id = s.id OR g.school_id = s.id)
      WHERE u.telegram_id = ?
    `).get(String(telegramId));
  },

  setSelectedSchool(telegramId, schoolId) {
    const db = getDatabase();
    const user = this.getUserByTelegramId(telegramId);
    if (!user) {
      this.upsertUser({ telegram_id: telegramId, selected_school_id: schoolId });
    } else {
      // If switching school, reset selected_group_id if it belonged to another school
      db.prepare(`
        UPDATE users
        SET selected_school_id = ?,
            selected_group_id = CASE WHEN (SELECT school_id FROM groups WHERE id = users.selected_group_id) = ? THEN selected_group_id ELSE NULL END
        WHERE telegram_id = ?
      `).run(schoolId ? Number(schoolId) : null, schoolId ? Number(schoolId) : null, String(telegramId));
    }
    return this.getUserByTelegramId(telegramId);
  },

  setSelectedGroup(telegramId, groupId, schoolId = null) {
    const db = getDatabase();
    let effectiveSchoolId = schoolId;

    if (groupId && !effectiveSchoolId) {
      const grp = db.prepare(`SELECT school_id FROM groups WHERE id = ?`).get(groupId);
      if (grp) effectiveSchoolId = grp.school_id;
    }

    const user = this.getUserByTelegramId(telegramId);
    if (!user) {
      this.upsertUser({ 
        telegram_id: telegramId, 
        selected_school_id: effectiveSchoolId, 
        selected_group_id: groupId 
      });
    } else {
      db.prepare(`
        UPDATE users
        SET selected_group_id = ?,
            selected_school_id = COALESCE(?, selected_school_id)
        WHERE telegram_id = ?
      `).run(groupId ? Number(groupId) : null, effectiveSchoolId ? Number(effectiveSchoolId) : null, String(telegramId));
    }
    return this.getUserByTelegramId(telegramId);
  },

  getAllUsers(schoolId = null) {
    const db = getDatabase();
    if (schoolId) {
      return db.prepare(`SELECT * FROM users WHERE selected_school_id = ? ORDER BY created_at DESC`).all(schoolId);
    }
    return db.prepare(`SELECT * FROM users ORDER BY created_at DESC`).all();
  },

  getUsersCount(schoolId = null) {
    const db = getDatabase();
    if (schoolId) {
      const res = db.prepare(`SELECT COUNT(*) as count FROM users WHERE selected_school_id = ?`).get(schoolId);
      return res ? res.count : 0;
    }
    const res = db.prepare(`SELECT COUNT(*) as count FROM users`).get();
    return res ? res.count : 0;
  }
};
