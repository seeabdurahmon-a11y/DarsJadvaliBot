import fs from 'node:fs';
import { getDatabase, closeDatabase } from '../src/database/db.js';
import { groupsRepo } from '../src/database/groups.repo.js';
import { lessonsRepo } from '../src/database/lessons.repo.js';
import { teachersRepo } from '../src/database/teachers.repo.js';
import { subjectsRepo } from '../src/database/subjects.repo.js';
import { settingsRepo } from '../src/database/settings.repo.js';
import { DEFAULT_TEMPLATE, DEFAULT_TEMPLATE_HEADER, DEFAULT_TEMPLATE_FOOTER } from '../src/utils/template.util.js';

// Aniq dars vaqtlari (Rasm bo'yicha)
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
  'du': 1,
  'dushanba': 1,
  'se': 2,
  'seshanba': 2,
  'ch': 3,
  'chorshanba': 3,
  'pa': 4,
  'payshanba': 4,
  'ju': 5,
  'juma': 5,
  'sh': 6,
  'shanba': 6
};

function normalizeSubject(raw) {
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
}

export function importOfficialSchedule(dbPath = null, schoolId = 1) {
  console.log(`🔄 Maktab (ID: ${schoolId}) bazasi yangilanmoqda va yangi dars jadvali yuklanmoqda... [DB: ${dbPath || 'data/bot.sqlite'}]`);
  const db = getDatabase(dbPath);

  // Standart shablon sozlamalari
  settingsRepo.set('schedule_template', DEFAULT_TEMPLATE);
  settingsRepo.set('template_header', DEFAULT_TEMPLATE_HEADER);
  settingsRepo.set('template_footer', DEFAULT_TEMPLATE_FOOTER);

  // 1. JSON dump faylini o'qish
  const jsonPath = 'data/excel_dump.json';
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Dump fayli topilmadi: ${jsonPath}`);
  }

  const content = fs.readFileSync(jsonPath, 'utf8').replace(/^\uFEFF/, '');
  const data = JSON.parse(content);
  const sheet = Array.isArray(data) ? data[0] : data;
  const rows = sheet.Rows;

  // 2. Mavjud o'qituvchilar xaritasi (group_name + subject -> teacher)
  const teacherMap = new Map();
  try {
    const existingLessons = db.prepare(`
      SELECT g.name as group_name, l.subject, l.teacher 
      FROM lessons l 
      JOIN groups g ON g.id = l.group_id 
      WHERE l.teacher IS NOT NULL AND l.teacher != '' AND (l.school_id = ? OR g.school_id = ?)
    `).all(schoolId, schoolId);
    existingLessons.forEach(r => teacherMap.set(`${r.group_name}|||${r.subject}`, r.teacher));
  } catch (e) {
    console.warn('Mavjud darslar o‘qituvchi xaritasini olishda ogohlantirish:', e.message);
  }

  // 3. Mavjud sinflarni aniqlash yoki yangilarini qo'shish (ID larni saqlab qolgan holda)
  const existingGroups = db.prepare('SELECT * FROM groups WHERE school_id = ?').all(schoolId);
  const existingGroupByName = new Map();
  existingGroups.forEach(g => existingGroupByName.set(g.name.toLowerCase().trim(), g));

  const headerRow = rows[2];
  const classMap = new Map(); // colIndex -> group object

  for (let c = 2; c < headerRow.length; c++) {
    const rawClass = headerRow[c] ? headerRow[c].trim() : '';
    if (rawClass) {
      const match = rawClass.match(/^(\d+)\s*([A-ZА-Яa-zа-я])$/i);
      const formattedName = match ? `${match[1]}-${match[2].toUpperCase()} sinf` : `${rawClass} sinf`;

      let group = existingGroupByName.get(formattedName.toLowerCase().trim());
      if (!group) {
        group = groupsRepo.addGroup({
          school_id: schoolId,
          name: formattedName,
          send_time: '06:00'
        });
        existingGroupByName.set(formattedName.toLowerCase().trim(), group);
      }
      classMap.set(c, group);
    }
  }

  console.log(`✅ ${classMap.size} ta sinf aniqlandi.`);

  // 4. Eski darslarni tozalash (faqat ko'rsatilgan maktab darslari)
  db.prepare('DELETE FROM lessons WHERE school_id = ?').run(schoolId);

  // 5. Yangi darslarni parsing qilish va kiritish
  let currentDay = 1;
  let insertedLessons = 0;
  const teacherNames = new Set();
  const subjectNames = new Set();

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
          let teacher = null;
          if (teacherRow && teacherRow[colIndex]) {
            const rawTeacher = teacherRow[colIndex].trim();
            if (rawTeacher && rawTeacher !== '-') teacher = rawTeacher;
          }
          if (!teacher) {
            teacher = teacherMap.get(`${group.name}|||${subject}`) || null;
          }

          const time = LESSON_TIMES[lessonNum] || { start: '08:30', end: '09:15' };

          lessonsRepo.addLesson({
            school_id: schoolId,
            group_id: group.id,
            day_of_week: currentDay,
            start_time: time.start,
            end_time: time.end,
            subject,
            teacher,
            room: null
          });
          insertedLessons++;

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

  // 6. Fanlarni kiritish (takrorlanmasdan)
  const existingSubjects = db.prepare('SELECT name FROM subjects WHERE school_id = ?').all(schoolId);
  const existingSubjectNames = new Set(existingSubjects.map(s => s.name.toLowerCase().trim()));
  subjectNames.forEach(subName => {
    if (!existingSubjectNames.has(subName.toLowerCase().trim())) {
      subjectsRepo.addSubject({ school_id: schoolId, name: subName });
      existingSubjectNames.add(subName.toLowerCase().trim());
    }
  });

  // 7. O'qituvchilarni kiritish (takrorlanmasdan)
  const existingTeachers = db.prepare('SELECT first_name, last_name FROM teachers WHERE school_id = ?').all(schoolId);
  const existingTeacherKeys = new Set(existingTeachers.map(t => `${t.last_name} ${t.first_name}`.toLowerCase().trim()));
  teacherNames.forEach(tName => {
    const parts = tName.split(/\s+/);
    const lastName = parts[0] || 'O‘qituvchi';
    const firstName = parts.slice(1).join(' ') || '';
    const key = `${lastName} ${firstName}`.toLowerCase().trim();
    if (!existingTeacherKeys.has(key)) {
      teachersRepo.addTeacher({
        school_id: schoolId,
        first_name: firstName || lastName,
        last_name: lastName,
        subject: null
      });
      existingTeacherKeys.add(key);
    }
  });

  console.log(`✅ ${insertedLessons} ta dars jadvali kiritildi!`);
  return { classesCount: classMap.size, lessonsCount: insertedLessons, subjectsCount: subjectNames.size, teachersCount: teacherNames.size };
}

if (process.argv[1]?.endsWith('import_excel_schedule.js')) {
  importOfficialSchedule();
  closeDatabase();

  if (fs.existsSync('tg_bot/data/bot.sqlite')) {
    console.log('🔄 tg_bot/data/bot.sqlite ham yangilanmoqda...');
    importOfficialSchedule('tg_bot/data/bot.sqlite');
    closeDatabase();
  }

  if (fs.existsSync('tg_bot/data')) {
    fs.copyFileSync('data/excel_dump.json', 'tg_bot/data/excel_dump.json');
    console.log('✅ tg_bot/data/excel_dump.json nusxalandi.');
  }
}
