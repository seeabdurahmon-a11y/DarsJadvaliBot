import { getDatabase } from './db.js';

export const usersRepo = {
  upsertUser(arg1, arg2 = {}) {
    let telegram_id, username, first_name, is_admin, selected_school_id, selected_group_id, role, selected_teacher_id, is_role_locked;
    if (typeof arg1 === 'object' && arg1 !== null) {
      ({ 
        telegram_id, 
        username, 
        first_name, 
        is_admin = 0, 
        selected_school_id = null, 
        selected_group_id = null,
        role = null,
        selected_teacher_id = null,
        is_role_locked = 0
      } = arg1);
    } else {
      telegram_id = arg1;
      ({ 
        username, 
        first_name, 
        is_admin = 0, 
        selected_school_id = null, 
        selected_group_id = null,
        role = null,
        selected_teacher_id = null,
        is_role_locked = 0
      } = arg2);
    }
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO users (telegram_id, username, first_name, is_admin, selected_school_id, selected_group_id, role, selected_teacher_id, is_role_locked)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(telegram_id) DO UPDATE SET
        username = COALESCE(excluded.username, users.username),
        first_name = COALESCE(excluded.first_name, users.first_name),
        is_admin = CASE WHEN excluded.is_admin = 1 THEN 1 ELSE users.is_admin END,
        selected_school_id = COALESCE(excluded.selected_school_id, users.selected_school_id),
        selected_group_id = COALESCE(excluded.selected_group_id, users.selected_group_id),
        role = COALESCE(excluded.role, users.role),
        selected_teacher_id = COALESCE(excluded.selected_teacher_id, users.selected_teacher_id),
        is_role_locked = CASE WHEN excluded.is_role_locked = 1 THEN 1 ELSE users.is_role_locked END
    `);
    stmt.run(
      String(telegram_id),
      username || null,
      first_name || null,
      is_admin ? 1 : 0,
      selected_school_id || null,
      selected_group_id || null,
      role || null,
      selected_teacher_id || null,
      is_role_locked ? 1 : 0
    );
    return this.getUserByTelegramId(telegram_id);
  },

  getUserByTelegramId(telegramId) {
    const db = getDatabase();
    return db.prepare(`
      SELECT u.*, 
        g.name as selected_group_name,
        s.name as selected_school_name,
        s.code as selected_school_code,
        t.first_name as teacher_first_name,
        t.last_name as teacher_last_name,
        t.subject as teacher_subject,
        t.phone as teacher_phone
      FROM users u
      LEFT JOIN groups g ON u.selected_group_id = g.id
      LEFT JOIN schools s ON (u.selected_school_id = s.id OR g.school_id = s.id)
      LEFT JOIN teachers t ON u.selected_teacher_id = t.id
      WHERE u.telegram_id = ?
    `).get(String(telegramId));
  },

  setRole(telegramId, role) {
    const db = getDatabase();
    const user = this.getUserByTelegramId(telegramId);
    if (!user) {
      this.upsertUser({ telegram_id: telegramId, role });
    } else {
      db.prepare(`
        UPDATE users
        SET role = ?
        WHERE telegram_id = ?
      `).run(role || null, String(telegramId));
    }
    return this.getUserByTelegramId(telegramId);
  },

  setSelectedTeacher(telegramId, teacherId, lock = true) {
    const db = getDatabase();
    let schoolId = null;
    if (teacherId) {
      const tch = db.prepare(`SELECT school_id FROM teachers WHERE id = ?`).get(teacherId);
      if (tch) schoolId = tch.school_id;
    }

    const user = this.getUserByTelegramId(telegramId);
    if (!user) {
      this.upsertUser({
        telegram_id: telegramId,
        role: 'teacher',
        selected_teacher_id: teacherId,
        is_role_locked: lock ? 1 : 0,
        selected_school_id: schoolId
      });
    } else {
      db.prepare(`
        UPDATE users
        SET role = 'teacher',
            selected_teacher_id = ?,
            is_role_locked = ?,
            selected_school_id = COALESCE(?, selected_school_id)
        WHERE telegram_id = ?
      `).run(teacherId ? Number(teacherId) : null, lock ? 1 : 0, schoolId ? Number(schoolId) : null, String(telegramId));
    }
    return this.getUserByTelegramId(telegramId);
  },

  setSelectedSchool(telegramId, schoolId) {
    const db = getDatabase();
    const user = this.getUserByTelegramId(telegramId);
    if (!user) {
      this.upsertUser({ telegram_id: telegramId, selected_school_id: schoolId });
    } else {
      // If switching school, reset selected_group_id or selected_teacher_id if from another school
      db.prepare(`
        UPDATE users
        SET selected_school_id = ?,
            selected_group_id = CASE WHEN (SELECT school_id FROM groups WHERE id = users.selected_group_id) = ? THEN selected_group_id ELSE NULL END,
            selected_teacher_id = CASE WHEN (SELECT school_id FROM teachers WHERE id = users.selected_teacher_id) = ? THEN selected_teacher_id ELSE NULL END
        WHERE telegram_id = ?
      `).run(schoolId ? Number(schoolId) : null, schoolId ? Number(schoolId) : null, schoolId ? Number(schoolId) : null, String(telegramId));
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
        role: 'student',
        selected_school_id: effectiveSchoolId, 
        selected_group_id: groupId 
      });
    } else {
      db.prepare(`
        UPDATE users
        SET role = 'student',
            selected_group_id = ?,
            selected_school_id = COALESCE(?, selected_school_id)
        WHERE telegram_id = ?
      `).run(groupId ? Number(groupId) : null, effectiveSchoolId ? Number(effectiveSchoolId) : null, String(telegramId));
    }
    return this.getUserByTelegramId(telegramId);
  },

  releaseUserRole(telegramId) {
    const db = getDatabase();
    db.prepare(`
      UPDATE users
      SET role = NULL,
          selected_teacher_id = NULL,
          selected_group_id = NULL,
          is_role_locked = 0
      WHERE telegram_id = ?
    `).run(String(telegramId));
    return this.getUserByTelegramId(telegramId);
  },

  getLockedUsers(schoolId = null) {
    const db = getDatabase();
    let query = `
      SELECT u.*, 
        g.name as selected_group_name,
        s.name as selected_school_name,
        s.code as selected_school_code,
        t.first_name as teacher_first_name,
        t.last_name as teacher_last_name,
        t.subject as teacher_subject
      FROM users u
      LEFT JOIN groups g ON u.selected_group_id = g.id
      LEFT JOIN schools s ON (u.selected_school_id = s.id OR g.school_id = s.id)
      LEFT JOIN teachers t ON u.selected_teacher_id = t.id
      WHERE (u.role IS NOT NULL OR u.is_role_locked = 1 OR u.selected_teacher_id IS NOT NULL OR u.selected_group_id IS NOT NULL)
    `;
    const params = [];
    if (schoolId) {
      query += ` AND (u.selected_school_id = ? OR g.school_id = ? OR t.school_id = ?)`;
      params.push(schoolId, schoolId, schoolId);
    }
    query += ` ORDER BY u.is_role_locked DESC, u.created_at DESC LIMIT 50`;
    return db.prepare(query).all(...params);
  },

  setTeacherNotifications(telegramId, enabled = 1) {
    const db = getDatabase();
    db.prepare(`
      UPDATE users
      SET teacher_notifications = ?
      WHERE telegram_id = ?
    `).run(enabled ? 1 : 0, String(telegramId));
    return this.getUserByTelegramId(telegramId);
  },

  getActiveTeacherUsers(schoolId = null) {
    const db = getDatabase();
    let query = `
      SELECT u.*, 
        t.first_name as teacher_first_name,
        t.last_name as teacher_last_name,
        t.subject as teacher_subject,
        s.name as selected_school_name
      FROM users u
      JOIN teachers t ON u.selected_teacher_id = t.id
      LEFT JOIN schools s ON (u.selected_school_id = s.id OR t.school_id = s.id)
      WHERE u.role = 'teacher' 
        AND u.selected_teacher_id IS NOT NULL
        AND (u.teacher_notifications IS NULL OR u.teacher_notifications = 1)
    `;
    const params = [];
    if (schoolId) {
      query += ` AND (u.selected_school_id = ? OR t.school_id = ?)`;
      params.push(schoolId, schoolId);
    }
    return db.prepare(query).all(...params);
  },

  getActiveStudentUsers(schoolId = null) {
    const db = getDatabase();
    let query = `
      SELECT u.*, 
        g.name as selected_group_name,
        s.name as selected_school_name
      FROM users u
      JOIN groups g ON u.selected_group_id = g.id
      LEFT JOIN schools s ON (u.selected_school_id = s.id OR g.school_id = s.id)
      WHERE (u.role = 'student' OR u.role IS NULL)
        AND u.selected_group_id IS NOT NULL
        AND g.is_active = 1
        AND (u.teacher_notifications IS NULL OR u.teacher_notifications = 1)
    `;
    const params = [];
    if (schoolId) {
      query += ` AND (u.selected_school_id = ? OR g.school_id = ?)`;
      params.push(schoolId, schoolId);
    }
    return db.prepare(query).all(...params);
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
