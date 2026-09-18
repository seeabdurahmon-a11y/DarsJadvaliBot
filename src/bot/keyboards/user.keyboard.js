import { Keyboard, InlineKeyboard } from 'grammy';
import { DAYS_LIST } from '../../config/constants.js';
import { config } from '../../config/index.js';

/**
 * Kimligini tanlash uchun Inline klaviatura (Ustoz yoki O'quvchi)
 */
export function getRoleSelectionInlineKeyboard() {
  const keyboard = new InlineKeyboard();
  keyboard
    .text('👨‍🏫 Ustoz (O‘qituvchi)', 'user_role_teacher')
    .row()
    .text('👨‍🎓 O‘quvchi', 'user_role_student');
  return keyboard;
}

/**
 * O'quvchi asosiy menyu tugmalari (Reply Keyboard)
 */
export function getStudentMainMenuKeyboard() {
  const keyboard = new Keyboard();

  // Mini App WebApp tugmasi
  if (config.WEB_APP_URL && config.WEB_APP_URL.startsWith('https://')) {
    keyboard.webApp('🌐 Dars jadvalini ochish', config.WEB_APP_URL).row();
  } else {
    keyboard.text('🌐 Dars jadvalini ochish').row();
  }

  keyboard
    .text('🔔 Hozirgi dars').text('📅 Bugungi jadval')
    .row()
    .text('📆 Ertangi jadval').text('🔔 5 daqiqa oldin eslatma')
    .row()
    .text('🏫 Mening sinfim').text('ℹ️ Bot haqida')
    .resized();

  return keyboard;
}

/**
 * Ustoz asosiy menyu tugmalari (Reply Keyboard)
 */
export function getTeacherMainMenuKeyboard() {
  const keyboard = new Keyboard();

  if (config.WEB_APP_URL && config.WEB_APP_URL.startsWith('https://')) {
    keyboard.webApp('🌐 Dars jadvalini ochish', config.WEB_APP_URL).row();
  } else {
    keyboard.text('🌐 Dars jadvalini ochish').row();
  }

  keyboard
    .text('🔔 Hozirgi darsim').text('📅 Bugungi darslarim')
    .row()
    .text('📆 Ertangi darslarim').text('🔔 5 daqiqa oldin eslatma')
    .row()
    .text('👨‍🏫 Mening profilim').text('ℹ️ Bot haqida')
    .resized();

  return keyboard;
}

/**
 * Standart asosiy menyu (Backward compatibility)
 */
export function getUserMainMenuKeyboard() {
  return getStudentMainMenuKeyboard();
}

/**
 * Mini Appni ochish uchun maxsus Inline klaviatura
 */
export function getWebAppInlineKeyboard() {
  if (config.WEB_APP_URL && config.WEB_APP_URL.startsWith('https://')) {
    const keyboard = new InlineKeyboard();
    keyboard.webApp('🌐 Mini Appni ochish', config.WEB_APP_URL);
    return keyboard;
  }
  return null;
}

/**
 * Sinflarni tanlash/biriktirish uchun 4 ta ustunli qulay Inline klaviatura
 */
export function getClassesGridInlineKeyboard(groups, actionPrefix = 'user_bind_sinf_', showAllOption = false) {
  const keyboard = new InlineKeyboard();

  if (!groups || groups.length === 0) {
    return keyboard.text("ℹ️ Hozircha sinflar yo'q", 'noop');
  }

  groups.forEach((group, index) => {
    const displayName = group.name.replace(/\s*sinf\s*/gi, '').trim() || group.name;
    keyboard.text(displayName, `${actionPrefix}${group.id}`);
    if ((index + 1) % 4 === 0) {
      keyboard.row();
    }
  });

  if (showAllOption) {
    keyboard.row().text('🌐 Barcha sinflar', `${actionPrefix}all`);
  }

  return keyboard;
}

/**
 * O'qituvchilarni tanlash uchun qulay Inline klaviatura
 */
export function getTeachersGridInlineKeyboard(teachers, actionPrefix = 'user_bind_tch_') {
  const keyboard = new InlineKeyboard();

  if (!teachers || teachers.length === 0) {
    return keyboard.text("ℹ️ O‘qituvchilar ro‘yxati topilmadi", 'noop');
  }

  teachers.forEach((t, index) => {
    const displayName = `${t.last_name} ${t.first_name}${t.subject ? ` (${t.subject})` : ''}`;
    keyboard.text(displayName, `${actionPrefix}${t.id}`);
    keyboard.row();
  });

  return keyboard;
}

/**
 * Hafta kunlarini tanlash uchun Inline klaviatura
 */
export function getDaysInlineKeyboard(actionPrefix = 'day_') {
  const keyboard = new InlineKeyboard();

  DAYS_LIST.forEach((day, index) => {
    keyboard.text(`🗓 ${day.name}`, `${actionPrefix}${day.id}`);
    if ((index + 1) % 2 === 0) {
      keyboard.row();
    }
  });

  return keyboard;
}
