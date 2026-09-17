import { getDatabase } from './db.js';
import { config } from '../config/index.js';

export const groupsRepo = {
  addGroup({ telegram_chat_id = null, name, send_time = config.DEFAULT_SEND_TIME }) {
    const db = getDatabase();
    const cleanName = name.trim();
    const cleanSendTime = send_time ? send_time.trim() : config.DEFAULT_SEND_TIME;
    const finalChatId = telegram_chat_id
      ? String(telegram_chat_id).trim()
      : `class_${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;

    const stmt = db.prepare(`
      INSERT INTO groups (telegram_chat_id, name, send_time, is_active)
      VALUES (?, ?, ?, 1)
      ON CONFLICT(telegram_chat_id) DO UPDATE SET
        name = excluded.name,
        send_time = excluded.send_time,
        is_active = 1
    `);
    stmt.run(finalChatId, cleanName, cleanSendTime);
    return this.getGroupByChatId(finalChatId);
  },

  getGroupById(id) {
    const db = getDatabase();
    return db.prepare(`SELECT * FROM groups WHERE id = ?`).get(id);
  },

  getGroupByChatId(chatId) {
    const db = getDatabase();
    return db.prepare(`SELECT * FROM groups WHERE telegram_chat_id = ?`).get(String(chatId));
  },

  normalizeClassName(name) {
    if (!name) return '';
    return String(name)
      .toLowerCase()
      .replace(/\s*sinf\s*/gi, '')
      .replace(/[^a-z0-9а-яёўқғҳ]/gi, '')
      .trim();
  },

  getGroupByName(name) {
    if (!name) return null;
    const db = getDatabase();
    const clean = String(name).trim();
    const norm = this.normalizeClassName(clean);

    // 1. Direct case-insensitive match
    let group = db.prepare(`SELECT * FROM groups WHERE LOWER(name) = LOWER(?) AND is_active = 1`).get(clean);
    if (group) return group;

    // 2. Direct with 'sinf' appended
    group = db.prepare(`SELECT * FROM groups WHERE LOWER(name) = LOWER(?) AND is_active = 1`).get(`${clean} sinf`);
    if (group) return group;

    // 3. Normalized comparison against all active groups (e.g. '11d' -> '11-D sinf')
    const all = this.getAllGroups(true);
    for (const g of all) {
      if (this.normalizeClassName(g.name) === norm) {
        return g;
      }
    }

    // 4. Substring comparison
    if (norm.length >= 2) {
      for (const g of all) {
        const gNorm = this.normalizeClassName(g.name);
        if (gNorm.includes(norm) || norm.includes(gNorm)) {
          return g;
        }
      }
    }

    return null;
  },

  getAllGroups(onlyActive = true) {
    const db = getDatabase();
    if (onlyActive) {
      return db.prepare(`SELECT * FROM groups WHERE is_active = 1 ORDER BY id ASC`).all();
    }
    return db.prepare(`SELECT * FROM groups ORDER BY id ASC`).all();
  },

  getAllGroupsWithStats() {
    const db = getDatabase();
    return db.prepare(`
      SELECT g.*, 
        (SELECT COUNT(*) FROM lessons WHERE group_id = g.id) as lessons_count,
        (SELECT COUNT(*) FROM users WHERE selected_group_id = g.id) as students_count
      FROM groups g
      WHERE g.is_active = 1
      ORDER BY g.id ASC
    `).all();
  },

  bindChatToClass(classIdOrName, chatId) {
    const db = getDatabase();
    const strChatId = String(chatId).trim();

    let targetClass = null;
    if (typeof classIdOrName === 'number' || (!isNaN(Number(classIdOrName)) && String(classIdOrName).indexOf('-') === -1 && !/[a-zA-Zа-яА-Я]/.test(String(classIdOrName)))) {
      targetClass = this.getGroupById(Number(classIdOrName));
    }
    
    if (!targetClass && classIdOrName) {
      targetClass = this.getGroupByName(String(classIdOrName));
    }

    if (!targetClass) return null;

    // Disconnect any other group that had this chatId
    db.prepare(`
      UPDATE groups 
      SET telegram_chat_id = 'unlinked_' || id || '_' || ? 
      WHERE telegram_chat_id = ? AND id != ?
    `).run(Date.now(), strChatId, targetClass.id);

    // Bind this class to the chatId
    db.prepare(`
      UPDATE groups 
      SET telegram_chat_id = ?, is_active = 1
      WHERE id = ?
    `).run(strChatId, targetClass.id);

    return this.getGroupById(targetClass.id);
  },

  updateGroup(id, { name, send_time, is_active, telegram_chat_id }) {
    const db = getDatabase();
    const current = this.getGroupById(id);
    if (!current) return null;

    const newName = name !== undefined ? name.trim() : current.name;
    const newSendTime = send_time !== undefined ? send_time.trim() : current.send_time;
    const newActive = is_active !== undefined ? (is_active ? 1 : 0) : current.is_active;

    db.prepare(`
      UPDATE groups
      SET name = ?, send_time = ?, is_active = ?
      WHERE id = ?
    `).run(newName, newSendTime, newActive, id);

    return this.getGroupById(id);
  },

  setGroupSendTime(chatIdOrId, sendTime) {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE groups
      SET send_time = ?
      WHERE id = ? OR telegram_chat_id = ?
    `);
    stmt.run(sendTime.trim(), chatIdOrId, String(chatIdOrId));
  },

  deleteGroup(id) {
    const db = getDatabase();
    return db.prepare(`DELETE FROM groups WHERE id = ?`).run(id);
  },

  getGroupsCount() {
    const db = getDatabase();
    const res = db.prepare(`SELECT COUNT(*) as count FROM groups WHERE is_active = 1`).get();
    return res ? res.count : 0;
  }
};
