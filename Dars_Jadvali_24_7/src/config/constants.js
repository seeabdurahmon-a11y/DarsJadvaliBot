/**
 * MAKTAB — Konstantalar va Standart Ma'lumotlar
 */

export const DAYS_OF_WEEK = {
  1: 'Dushanba',
  2: 'Seshanba',
  3: 'Chorshanba',
  4: 'Payshanba',
  5: 'Juma',
  6: 'Shanba',
  7: 'Yakshanba'
};

export const DAYS_LIST = [
  { id: 1, name: 'Dushanba', short: 'Dush' },
  { id: 2, name: 'Seshanba', short: 'Sesh' },
  { id: 3, name: 'Chorshanba', short: 'Chor' },
  { id: 4, name: 'Payshanba', short: 'Pay' },
  { id: 5, name: 'Juma', short: 'Jum' },
  { id: 6, name: 'Shanba', short: 'Shan' },
  { id: 7, name: 'Yakshanba', short: 'Yak' }
];

export const MONTH_NAMES_UZ = [
  'yanvar',
  'fevral',
  'mart',
  'aprel',
  'may',
  'iyun',
  'iyul',
  'avgust',
  'sentabr',
  'oktabr',
  'noyabr',
  'dekabr'
];

export const SUBJECT_EMOJIS = {
  // Aniq va tabiiy fanlar
  matematika: '📐',
  algebra: '📐',
  geometriya: '📐',
  fizika: '⚡',
  kimyo: '🧪',
  biologiya: '🧬',
  botanika: '🌿',
  zoologiya: '🐾',
  geografiya: '🌍',
  informatika: '💻',
  it: '💻',
  astronomiya: '🔭',

  // Tillar va adabiyot
  'ona tili': '📚',
  adabiyot: '📖',
  ingliz: '🇬🇧',
  english: '🇬🇧',
  rus: '🇷🇺',
  russian: '🇷🇺',
  nemis: '🇩🇪',
  fransuz: '🇫🇷',
  arab: '🇸🇦',

  // Ijtimoiy-gumanitar
  tarix: '🏛',
  huquq: '⚖️',
  tarbiya: '🌟',
  iqtisod: '📈',

  // San'at, texnologiya va sport
  jismoniy: '⚽',
  sport: '⚽',
  musiqa: '🎵',
  chizmachilik: '🎨',
  sanat: '🎨',
  rasm: '🎨',
  texnologiya: '🛠',
  mehnat: '🛠',

  default: '📖'
};

export const BOT_TEXTS = {
  WELCOME: `Assalomu alaykum! <b>MAKTAB</b> dars jadvali botiga xush kelibsiz.\n\nUshbu bot orqali sinflar dars jadvalini tezkor ko'rishingiz, bugungi va haftalik darslar hamda o'zgarishlardan xabardor bo'lishingiz mumkin.`,
  ABOUT: `🏫 <b>Maktab Dars Jadvali Axborot Tizimi</b>\n\n🎯 <i>O'quvchilar, o'qituvchilar va ota-onalar uchun qulay dars jadvali xizmati!</i>\n\n📍 Maktab ma'muriyati va o'quv ishlari bo'limi\n🔔 <i>Har kuni ertalab darslar jadvali sinf guruhlariga avtomatik yuboriladi!</i>`,
  NO_LESSONS_TODAY: `📅 Bugun darslar mavjud emas.`,
  NO_LESSONS_TOMORROW: `📆 Ertaga darslar mavjud emas.`,
  NO_LESSONS_WEEK: `📚 Hozircha haftalik dars jadvali kiritilmagan.`,
  NOT_AUTHORIZED: `⛔ Kechirasiz, sizda ushbu amalni bajarish uchun admin huquqi mavjud emas.`
};
