import { DateTime } from 'luxon';
import { config } from '../config/index.js';
import { DAYS_OF_WEEK, MONTH_NAMES_UZ } from '../config/constants.js';

/**
 * Hozirgi O'zbekiston (Asia/Tashkent) vaqtini DateTime obyekti sifatida qaytaradi
 */
export function getNowInTashkent() {
  return DateTime.now().setZone(config.TZ);
}

/**
 * Sanani o'zbekcha chiroyli formatlaydi: "15-sentabr, Seshanba"
 */
export function formatDateUz(dt) {
  const day = dt.day;
  const month = MONTH_NAMES_UZ[dt.month - 1];
  const weekday = DAYS_OF_WEEK[dt.weekday];
  return `${day}-${month}, ${weekday}`;
}

/**
 * Bugungi kun ma'lumotlarini qaytaradi
 */
export function getTodayInfo() {
  const now = getNowInTashkent();
  return {
    dateTime: now,
    dayOfWeek: now.weekday, // 1 = Dushanba, ..., 7 = Yakshanba
    dayName: DAYS_OF_WEEK[now.weekday],
    dateStr: now.toFormat('yyyy-MM-dd'),
    timeStr: now.toFormat('HH:mm'),
    formattedDate: formatDateUz(now)
  };
}

/**
 * Ertangi kun ma'lumotlarini qaytaradi
 */
export function getTomorrowInfo() {
  const tomorrow = getNowInTashkent().plus({ days: 1 });
  return {
    dateTime: tomorrow,
    dayOfWeek: tomorrow.weekday,
    dayName: DAYS_OF_WEEK[tomorrow.weekday],
    dateStr: tomorrow.toFormat('yyyy-MM-dd'),
    timeStr: tomorrow.toFormat('HH:mm'),
    formattedDate: formatDateUz(tomorrow)
  };
}

/**
 * Berilgan hafta kuni (1..7) uchun nomni qaytaradi
 */
export function getDayName(dayOfWeek) {
  return DAYS_OF_WEEK[dayOfWeek] || 'Noma\'lum kun';
}

/**
 * Vaqt formati to'g'riligini tekshiradi (HH:mm masalan 06:00, 14:30)
 */
export function isValidTimeFormat(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return false;
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(timeStr.trim());
}
