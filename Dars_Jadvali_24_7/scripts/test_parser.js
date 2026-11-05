import fs from 'node:fs';

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
  if (lower === 'tarix' || lower.includes('tarix')) return 'Tarix';
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
  if (lower.includes('kelajak')) return 'Kelajak soati';

  return s;
}

export function parseExcelSchedule() {
  const content = fs.readFileSync('data/excel_dump.json', 'utf8').replace(/^\uFEFF/, '');
  const data = JSON.parse(content);
  const sheet = Array.isArray(data) ? data[0] : data;

  const rows = sheet.Rows;
  console.log(`Processing ${rows.length} rows...`);

  // Row 3 (index 2) contains Class headers: 1A, 1B, 1D, 1G, 2A, 2B, ...
  const headerRow = rows[2];
  const classCols = []; // [{ colIndex, className }]

  for (let c = 2; c < headerRow.length; c++) {
    const rawClass = headerRow[c] ? headerRow[c].trim() : '';
    if (rawClass) {
      // Format e.g. "1A" -> "1-A sinf"
      const match = rawClass.match(/^(\d+)\s*([A-ZА-Яa-zа-я])$/i);
      const formattedName = match ? `${match[1]}-${match[2].toUpperCase()} sinf` : `${rawClass} sinf`;
      classCols.push({ colIndex: c, rawName: rawClass, className: formattedName });
    }
  }

  console.log(`Found ${classCols.length} classes:`, classCols.map(c => c.className).join(', '));

  const lessons = [];
  let currentDay = 1;

  for (let r = 3; r < rows.length; r++) {
    const row = rows[r];
    const dayStr = row[0] ? row[0].trim().toLowerCase() : '';
    const lessonNumStr = row[1] ? row[1].trim() : '';

    if (dayStr && DAY_CODES[dayStr]) {
      currentDay = DAY_CODES[dayStr];
    }

    const lessonNum = parseInt(lessonNumStr, 10);
    if (!isNaN(lessonNum) && lessonNum >= 1 && lessonNum <= 7) {
      // This row has subjects for lessonNum
      // Next row (r+1) might have teacher names
      const subjectRow = row;
      const teacherRow = (r + 1 < rows.length && !rows[r+1][1]?.trim()) ? rows[r+1] : null;

      classCols.forEach(cls => {
        const rawSubject = subjectRow[cls.colIndex] ? subjectRow[cls.colIndex].trim() : '';
        if (rawSubject && rawSubject !== '-' && rawSubject !== '') {
          const subject = normalizeSubject(rawSubject);
          const rawTeacher = teacherRow && teacherRow[cls.colIndex] ? teacherRow[cls.colIndex].trim() : null;
          const teacher = rawTeacher && rawTeacher !== '-' ? rawTeacher : null;
          const time = LESSON_TIMES[lessonNum] || { start: '08:30', end: '09:15' };

          lessons.push({
            className: cls.className,
            dayOfWeek: currentDay,
            lessonNumber: lessonNum,
            startTime: time.start,
            endTime: time.end,
            subject,
            teacher,
            room: null
          });
        }
      });
    }
  }

  console.log(`Extracted total of ${lessons.length} lessons across all classes!`);
  return { classes: classCols, lessons };
}

if (process.argv[1]?.endsWith('test_parser.js') || process.argv[1]?.endsWith('parse_excel_schedule.js')) {
  parseExcelSchedule();
}
