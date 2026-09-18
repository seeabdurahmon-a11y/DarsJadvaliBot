import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

let dbInstance = null;

export function getDatabase(dbPath = null) {
  if (dbInstance) {
    return dbInstance;
  }

  let finalPath = dbPath || config.DB_PATH;

  // Serverless / Vercel muhiti uchun /tmp papkasidan foydalanamiz
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  if (isServerless && !dbPath) {
    const tmpDbPath = path.join('/tmp', 'bot.sqlite');
    const sourceDb = path.resolve(config.ROOT_DIR, 'data/bot.sqlite');
    if (!fs.existsSync(tmpDbPath) && fs.existsSync(sourceDb)) {
      try {
        fs.copyFileSync(sourceDb, tmpDbPath);
      } catch (e) {
        // nusxalash xatosi bo'lsa yangi yaratiladi
      }
    }
    finalPath = tmpDbPath;
  }

  const dir = path.dirname(finalPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  try {
    const db = new Database(finalPath);
    try {
      db.pragma('journal_mode = WAL');
    } catch (e) {
      db.pragma('journal_mode = DELETE');
    }
    db.pragma('foreign_keys = ON');

    initSchema(db);
    autoSeedIfEmpty(db);

    dbInstance = db;
    logger.info(`SQLite Database muvaffaqiyatli ishga tushdi: ${finalPath}`);
    return dbInstance;
  } catch (error) {
    logger.error('Database connection error:', error);
    throw error;
  }
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schools (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      admin_name TEXT DEFAULT 'Zavuch / Admin',
      admin_email TEXT DEFAULT '',
      region TEXT DEFAULT '',
      admin_password TEXT DEFAULT 'darsjadvoli0751',
      default_send_time TEXT DEFAULT '06:00',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id TEXT UNIQUE NOT NULL,
      username TEXT,
      first_name TEXT,
      is_admin INTEGER DEFAULT 0,
      role TEXT DEFAULT NULL,
      selected_teacher_id INTEGER DEFAULT NULL,
      is_role_locked INTEGER DEFAULT 0,
      selected_school_id INTEGER,
      selected_group_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER DEFAULT 1,
      telegram_chat_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      send_time TEXT DEFAULT '06:00',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS teachers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER DEFAULT 1,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      subject TEXT,
      phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER DEFAULT 1,
      name TEXT NOT NULL,
      emoji TEXT DEFAULT '📚',
      code TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS lessons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER DEFAULT 1,
      group_id INTEGER NOT NULL,
      day_of_week INTEGER NOT NULL,
      date TEXT,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      subject TEXT NOT NULL,
      teacher TEXT,
      room TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sent_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER DEFAULT 1,
      group_id INTEGER NOT NULL,
      schedule_date TEXT NOT NULL,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(group_id, schedule_date),
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_lessons_day_group ON lessons(day_of_week, group_id);
    CREATE INDEX IF NOT EXISTS idx_sent_schedules_lookup ON sent_schedules(group_id, schedule_date);
  `);

  // Multi-school & Teacher/Student Role migration for existing tables
  const columnMigrations = [
    `ALTER TABLE schools ADD COLUMN admin_name TEXT DEFAULT 'Zavuch / Admin';`,
    `ALTER TABLE schools ADD COLUMN admin_email TEXT DEFAULT '';`,
    `ALTER TABLE users ADD COLUMN selected_school_id INTEGER;`,
    `ALTER TABLE users ADD COLUMN selected_group_id INTEGER;`,
    `ALTER TABLE users ADD COLUMN role TEXT DEFAULT NULL;`,
    `ALTER TABLE users ADD COLUMN selected_teacher_id INTEGER DEFAULT NULL;`,
    `ALTER TABLE users ADD COLUMN is_role_locked INTEGER DEFAULT 0;`,
    `ALTER TABLE groups ADD COLUMN school_id INTEGER DEFAULT 1;`,
    `ALTER TABLE teachers ADD COLUMN school_id INTEGER DEFAULT 1;`,
    `ALTER TABLE subjects ADD COLUMN school_id INTEGER DEFAULT 1;`,
    `ALTER TABLE lessons ADD COLUMN school_id INTEGER DEFAULT 1;`,
    `ALTER TABLE sent_schedules ADD COLUMN school_id INTEGER DEFAULT 1;`
  ];

  for (const sql of columnMigrations) {
    try {
      db.exec(sql);
    } catch (e) {
      // Column already exists
    }
  }

  // Safe indexes creation after columns exist
  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_lessons_school ON lessons(school_id);`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_groups_school ON groups(school_id);`);
  } catch (e) {}

  // Ensure default school #1 exists with test email & password
  db.prepare(`
    INSERT OR IGNORE INTO schools (id, code, name, admin_name, admin_email, region, admin_password, default_send_time, is_active)
    VALUES (1, 'M-01', '1-umumiy o‘rta ta’lim maktabi', 'Bosh Zavuch / Admin', 'test@darsjadvali.uz', 'Toshkent shahar', 'darsjadvoli0751', '06:00', 1)
  `).run();

  // Update existing school #1 with email & password if already inserted
  try {
    db.prepare(`
      UPDATE schools 
      SET admin_email = CASE WHEN admin_email IS NULL OR admin_email = '' THEN 'test@darsjadvali.uz' ELSE admin_email END,
          admin_password = CASE WHEN admin_password = 'admin' OR admin_password = 'admin123' THEN 'darsjadvoli0751' ELSE admin_password END
      WHERE id = 1
    `).run();
  } catch (e) {}

  // Standart sozlamalarni kiritish
  const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)
  `);
  insertSetting.run('default_send_time', config.DEFAULT_SEND_TIME);
  insertSetting.run('timezone', config.TZ);
}

export function closeDatabase() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

function autoSeedIfEmpty(db) {
  try {
    const row = db.prepare('SELECT COUNT(*) as count FROM groups').get();
    if (row && row.count > 0) {
      return;
    }

    const jsonPath = path.resolve(config.ROOT_DIR, 'data/excel_dump.json');
    if (!fs.existsSync(jsonPath)) {
      return;
    }

    const content = fs.readFileSync(jsonPath, 'utf8').replace(/^\uFEFF/, '');
    const data = JSON.parse(content);
    const sheet = Array.isArray(data) ? data[0] : data;
    const rows = sheet.Rows;
    if (!rows || rows.length < 4) return;

    const LESSON_TIMES = {
      1: { start: '08:30', end: '09:15' },
      2: { start: '09:20', end: '10:05' },
      3: { start: '10:10', end: '10:55' },
      4: { start: '11:15', end: '12:00' },
      5: { start: '12:05', end: '12:50' },
      6: { start: '12:55', end: '13:40' },
      7: { start: '13:45', end: '14:30' }
    };

    const DAY_CODES = {
      'du': 1, 'dushanba': 1, 'se': 2, 'seshanba': 2, 'ch': 3, 'chorshanba': 3,
      'pa': 4, 'payshanba': 4, 'ju': 5, 'juma': 5, 'sh': 6, 'shanba': 6
    };

    const normalizeSubject = (raw) => {
      if (!raw) return '';
      const s = raw.trim();
      const lower = s.toLowerCase();
      if (lower === 'alifb' || lower.includes('alifbe')) return 'Alifbe';
      if (lower === 'yozuv') return 'Yozuv';
      if (lower === "o'qis" || lower === "o‘qis" || lower.includes("o'qish") || lower.includes("o‘qish")) return 'O‘qish';
      if (lower === 'matem' || lower.includes('matematik')) return 'Matematika';
      if (lower === 'algeb' || lower.includes('algebra')) return 'Algebra';
      if (lower === 'geome' || lower.includes('geometriy')) return 'Geometriya';
      if (lower === 'ona. t' || lower === 'ona t' || lower.includes('ona tili')) return 'Ona tili';
      if (lower === 'adab' || lower.includes('adabiyot')) return 'Adabiyot';
      if (lower === 'rus. t' || lower === 'rus t' || lower.includes('rus tili')) return 'Rus tili';
      if (lower === 'ing. t' || lower === 'ing t' || lower.includes('ingliz')) return 'Ingliz tili';
      if (lower === 'fizik' || lower.includes('fizika')) return 'Fizika';
      if (lower === 'kimyo') return 'Kimyo';
      if (lower === 'biolo' || lower.includes('biologiy')) return 'Biologiya';
      if (lower === 'tab. f' || lower.includes('tabiat') || lower.includes('tabiiy')) return 'Tabiiy fan';
      if (lower === "jah. t" || lower.includes('jahon')) return 'Jahon tarixi';
      if (lower === "o'z. t" || lower === "o‘z. t" || lower.includes('o‘zbekiston')) return 'O‘zbekiston tarixi';
      if (lower === 'tarix' || lower.includes('tarix')) return 'Tarix';
      if (lower === 'geogr / iqtis' || lower === 'iqtis / geogr') return 'Geografiya / Iqtisod';
      if (lower === 'geogr' || lower.includes('geograf')) return 'Geografiya';
      if (lower === 'iqtis' || lower.includes('iqtisod')) return 'Iqtisod';
      if (lower === 'infor' || lower.includes('informat')) return 'Informatika';
      if (lower === 'jis. t' || lower === 'jis t' || lower.includes('jismoniy')) return 'Jismoniy tarbiya';
      if (lower === 'texno' || lower.includes('texnolog')) return 'Texnologiya';
      if (lower === 'tas. s' || lower === 'tas s' || lower.includes('tasviriy')) return 'Tasviriy san\'at';
      if (lower === 'musiq' || lower.includes('musiqa')) return 'Musiqa';
      if (lower === 'tarbi' || lower.includes('tarbiya')) return 'Tarbiya';
      if (lower === 'chqbt') return 'ChQBT';
      if (lower === 'huquq') return 'Huquq';
      if (lower === 'astro' || lower.includes('astronom')) return 'Astronomiya';
      if (lower === 'tadbi' || lower.includes('tadbirkor')) return 'Tadbirkorlik';
      if (lower.includes('kelajak')) return 'Kelajak soati';
      return s;
    };

    const headerRow = rows[2];
    const classMap = new Map();

    const insertGroupStmt = db.prepare(`
      INSERT INTO groups (telegram_chat_id, name, send_time, is_active)
      VALUES (?, ?, '06:00', 1)
    `);

    for (let c = 2; c < headerRow.length; c++) {
      const rawClass = headerRow[c] ? headerRow[c].trim() : '';
      if (rawClass) {
        const match = rawClass.match(/^(\d+)\s*([A-ZА-Яa-zа-я])$/i);
        const formattedName = match ? `${match[1]}-${match[2].toUpperCase()} sinf` : `${rawClass} sinf`;
        const chatId = `class_${formattedName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${c}`;
        insertGroupStmt.run(chatId, formattedName);
        const insertedGroup = db.prepare(`SELECT * FROM groups WHERE telegram_chat_id = ?`).get(chatId);
        classMap.set(c, insertedGroup);
      }
    }

    let currentDay = 1;
    const teacherNames = new Set();
    const subjectNames = new Set();

    const insertLessonStmt = db.prepare(`
      INSERT INTO lessons (group_id, day_of_week, start_time, end_time, subject, teacher, room)
      VALUES (?, ?, ?, ?, ?, ?, NULL)
    `);

    for (let r = 3; r < rows.length; r++) {
      const row = rows[r];
      const dayStr = row[0] ? row[0].trim().toLowerCase() : '';
      const lessonNumStr = row[1] ? row[1].trim() : '';

      if (dayStr && DAY_CODES[dayStr]) {
        currentDay = DAY_CODES[dayStr];
      }

      const lessonNum = parseInt(lessonNumStr, 10);
      if (!isNaN(lessonNum) && lessonNum >= 1 && lessonNum <= 7) {
        const subjectRow = row;
        const teacherRow = (r + 1 < rows.length && !rows[r+1][1]?.trim()) ? rows[r+1] : null;

        classMap.forEach((group, colIndex) => {
          const rawSubject = subjectRow[colIndex] ? subjectRow[colIndex].trim() : '';
          if (rawSubject && rawSubject !== '-' && rawSubject !== '') {
            const subject = normalizeSubject(rawSubject);
            const rawTeacher = teacherRow && teacherRow[colIndex] ? teacherRow[colIndex].trim() : null;
            const teacher = rawTeacher && rawTeacher !== '-' ? rawTeacher : null;
            const time = LESSON_TIMES[lessonNum] || { start: '08:30', end: '09:15' };

            insertLessonStmt.run(group.id, currentDay, time.start, time.end, subject, teacher);

            if (subject) subjectNames.add(subject);
            if (teacher) {
              teacher.split('|').forEach(t => {
                const cleanT = t.trim();
                if (cleanT && cleanT !== '-' && cleanT.length > 2) {
                  teacherNames.add(cleanT);
                }
              });
            }
          }
        });
      }
    }

    const insertSubjectStmt = db.prepare(`INSERT OR IGNORE INTO subjects (name, emoji) VALUES (?, '📚')`);
    subjectNames.forEach(s => insertSubjectStmt.run(s));

    const insertTeacherStmt = db.prepare(`INSERT INTO teachers (first_name, last_name) VALUES (?, ?)`);
    teacherNames.forEach(tName => {
      const parts = tName.split(/\s+/);
      const lastName = parts[0] || 'O‘qituvchi';
      const firstName = parts.slice(1).join(' ') || '';
      insertTeacherStmt.run(firstName || lastName, lastName);
    });

    logger.info(`[AUTO-SEED] ${classMap.size} sinflar va darslar muvaffaqiyatli yuklandi.`);
  } catch (seedErr) {
    logger.error('Auto seed error:', seedErr);
  }
}
