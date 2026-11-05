import { SUBJECT_EMOJIS, DAYS_OF_WEEK } from '../config/constants.js';
import { renderScheduleMessage } from './template.util.js';

// Kalit uzunligi bo'yicha saralangan emojilar (aniqroq moslash uchun)
const sortedEmojiEntries = Object.entries(SUBJECT_EMOJIS).sort((a, b) => b[0].length - a[0].length);

/**
 * Fan nomi bo'yicha mos emojini aniqlash
 */
export function getSubjectEmoji(subject = '') {
  const clean = subject.toLowerCase().trim();
  for (const [key, emoji] of sortedEmojiEntries) {
    if (clean.includes(key)) return emoji;
  }
  return SUBJECT_EMOJIS.default;
}

/**
 * Dars boshlanish vaqti bo'yicha dars tartib raqamini (1..7) aniqlash
 */
export function getLessonNumber(lessonOrStartTime) {
  const startTime = typeof lessonOrStartTime === 'object' ? lessonOrStartTime?.start_time : lessonOrStartTime;
  if (!startTime || typeof startTime !== 'string') return 1;

  const timeMap = {
    '08:30': 1,
    '09:20': 2,
    '10:10': 3,
    '11:15': 4,
    '12:05': 5,
    '12:55': 6,
    '13:45': 7,
    '08:00': 1,
    '08:50': 2,
    '09:40': 3,
    '10:30': 4,
    '11:20': 5,
    '12:10': 6
  };

  const cleanTime = startTime.trim();
  if (timeMap[cleanTime] !== undefined) {
    return timeMap[cleanTime];
  }

  const [h, m] = cleanTime.split(':').map(Number);
  if (!isNaN(h) && !isNaN(m)) {
    const mins = h * 60 + m;
    if (mins < 9 * 60) return 1;
    if (mins < 10 * 60) return 2;
    if (mins < 11 * 60) return 3;
    if (mins < 12 * 60) return 4;
    if (mins < 12 * 60 + 50) return 5;
    if (mins < 13 * 60 + 40) return 6;
    return 7;
  }

  return 1;
}

/**
 * Bitta dars ma'lumotlarini maktab formatida chiroyli formatlash
 */
export function formatSingleLesson(lesson, showGroup = true) {
  const emoji = getSubjectEmoji(lesson.subject);
  const time = `🕐 ${lesson.start_time || '08:00'} — ${lesson.end_time || '08:45'}`;
  const subjectLine = `${emoji} <b>${escapeHtml(lesson.subject || 'Dars')}</b>`;
  const teacherLine = lesson.teacher ? `👨‍🏫 O‘qituvchi: ${escapeHtml(lesson.teacher)}` : '';
  const groupLine = showGroup && lesson.group_name ? `👥 Sinf: ${escapeHtml(lesson.group_name)}` : '';
  const roomLine = lesson.room ? `🏫 Xona: ${escapeHtml(lesson.room)}` : '';

  const lines = [time, subjectLine];
  if (teacherLine) lines.push(teacherLine);
  if (groupLine) lines.push(groupLine);
  if (roomLine) lines.push(roomLine);

  return lines.join('\n');
}

/**
 * Kunlik dars jadvalini xabar shaklida formatlash (Shablon asosida)
 */
export function formatDailySchedule({ title = null, dateHeader = null, lessons = [], groupName = null }) {
  return renderScheduleMessage({
    header: title ? `🏫 <b>${escapeHtml(title)}</b>` : null,
    date: dateHeader ? dateHeader.replace(/^Bugun:\s*|^Ertaga:\s*/i, '') : null,
    group: groupName,
    lessons
  });
}

/**
 * Haftalik dars jadvalini formatlash
 */
export function formatWeeklySchedule({ title = 'HAFTALIK DARS JADVALI', lessons = [], groupName = null }) {
  if (!lessons || lessons.length === 0) {
    return `🏫 <b>MAKTAB — ${escapeHtml(title)}</b>\n\n<i>📚 Darslar mavjud emas.</i>`;
  }

  // Darslarni hafta kunlari (1..7) bo'yicha guruhlash
  const byDay = {};
  for (let i = 1; i <= 7; i++) {
    byDay[i] = [];
  }

  for (const lesson of lessons) {
    const day = lesson.day_of_week || 1;
    if (byDay[day]) {
      byDay[day].push(lesson);
    }
  }

  let text = `🏫 <b>MAKTAB — ${escapeHtml(title)}</b>\n`;
  if (groupName) {
    text += `👥 <b>Sinf:</b> ${escapeHtml(groupName)}\n`;
  }
  text += `\n`;

  let hasAnyLessons = false;

  for (let day = 1; day <= 7; day++) {
    const dayLessons = byDay[day];
    if (dayLessons.length > 0) {
      hasAnyLessons = true;
      const dayName = DAYS_OF_WEEK[day] || `Kun ${day}`;
      text += `🗓 <b>${dayName}</b>\n`;
      
      // Vaqt bo'yicha saralash
      dayLessons.sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));

      for (const item of dayLessons) {
        const emoji = getSubjectEmoji(item.subject);
        const time = `${item.start_time || ''}`;
        const subj = item.subject || 'Dars';
        const grp = !groupName && item.group_name ? ` — ${item.group_name}` : '';
        const room = item.room ? ` (Xona: ${item.room})` : '';
        const teacher = item.teacher ? ` [${item.teacher}]` : '';
        text += `▫️ ${time} — ${emoji} ${escapeHtml(subj)}${escapeHtml(grp)}${escapeHtml(room)}${escapeHtml(teacher)}\n`;
      }
      text += `\n`;
    }
  }

  if (!hasAnyLessons) {
    return `🏫 <b>MAKTAB — ${escapeHtml(title)}</b>\n\n<i>📚 Hozircha dars jadvali kiritilmagan.</i>`;
  }

  return text.trim();
}

/**
 * Admin statistikasi xabarini formatlash
 */
export function formatStats({ usersCount, groupsCount, lessonsCount, sentCountToday, defaultSendTime }) {
  return `📊 <b>MAKTAB DARS JADVALI — BOT STATISTIKASI</b>\n\n` +
    `👥 <b>Foydalanuvchilar (O‘quvchilar/Ustozlar):</b> ${usersCount}\n` +
    `👥 <b>Sinflar soni:</b> ${groupsCount}\n` +
    `📚 <b>Jami darslar soni:</b> ${lessonsCount}\n` +
    `📤 <b>Bugun jadval yuborilgan sinflar:</b> ${sentCountToday} ta\n` +
    `⏰ <b>Standart yuborish vaqti:</b> ${defaultSendTime}\n` +
    `🕒 <b>Vaqt mintaqasi:</b> Asia/Tashkent`;
}

/**
 * Xavfsiz HTML belgilarini almashtirish
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
