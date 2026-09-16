import { getDatabase } from './db.js';

export const usersRepo = {
  upsertUser({ telegram_id, username, first_name, is_admin = 0, selected_group_id = null }) {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO users (telegram_id, username, first_name, is_admin, selected_group_id)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(telegram_id) DO UPDATE SET
        username = excluded.username,
        first_name = excluded.first_name,
        is_admin = CASE WHEN excluded.is_admin = 1 THEN 1 ELSE users.is_admin END,
        selected_group_id = COALESCE(excluded.selected_group_id, users.selected_group_id)
    `);
    return stmt.run(
      String(telegram_id),
      username || null,
      first_name || null,
      is_admin ? 1 : 0,
      selected_group_id || null
    );
  },

  getUserByTelegramId(telegramId) {
    const db = getDatabase();
    return db.prepare(`
      SELECT u.*, g.name as selected_group_name
      FROM users u
      LEFT JOIN groups g ON u.selected_group_id = g.id
      WHERE u.telegram_id = ?
    `).get(String(telegramId));
  },

  setSelectedGroup(telegramId, groupId) {
    const db = getDatabase();
    // First ensure user exists
    const user = this.getUserByTelegramId(telegramId);
    if (!user) {
      this.upsertUser({ telegram_id: telegramId, selected_group_id: groupId });
    } else {
      db.prepare(`
        UPDATE users
        SET selected_group_id = ?
        WHERE telegram_id = ?
      `).run(groupId ? Number(groupId) : null, String(telegramId));
    }
    return this.getUserByTelegramId(telegramId);
  },

  getAllUsers() {
    const db = getDatabase();
    return db.prepare(`SELECT * FROM users ORDER BY created_at DESC`).all();
  },

  getUsersCount() {
    const db = getDatabase();
    const res = db.prepare(`SELECT COUNT(*) as count FROM users`).get();
    return res ? res.count : 0;
  }
};
