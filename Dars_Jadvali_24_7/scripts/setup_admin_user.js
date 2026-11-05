import Database from 'better-sqlite3';
import path from 'node:path';

function updateDb(dbPath) {
  const db = new Database(dbPath);
  db.prepare(`
    INSERT INTO users (telegram_id, is_admin, role, is_role_locked, selected_school_id)
    VALUES ('545481527', 1, 'admin', 0, 1)
    ON CONFLICT(telegram_id) DO UPDATE SET
      is_admin = 1,
      role = 'admin',
      selected_group_id = NULL,
      selected_teacher_id = NULL,
      is_role_locked = 0,
      selected_school_id = COALESCE(users.selected_school_id, 1)
  `).run();
  console.log(`Updated ${dbPath}:`, db.prepare("SELECT * FROM users WHERE telegram_id = '545481527'").get());
  db.close();
}

updateDb('./data/bot.sqlite');
try {
  updateDb('./tg_bot/data/bot.sqlite');
} catch (e) {
  console.log('tg_bot db skipped or error:', e.message);
}
