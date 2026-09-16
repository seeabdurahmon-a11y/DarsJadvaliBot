import { Keyboard, InlineKeyboard } from 'grammy';
import { DAYS_LIST } from '../../config/constants.js';
import { config } from '../../config/index.js';

/**
 * Foydalanuvchi asosiy menyu tugmalari (Reply Keyboard)
 */
export function getUserMainMenuKeyboard() {
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
    .text('📆 Ertangi jadval').text('📚 Haftalik jadval')
    .row()
    .text('ℹ️ Bot haqida')
    .resized();

  return keyboard;
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
 * Guruhlarni tanlash uchun Inline klaviatura
 */
export function getGroupSelectionInlineKeyboard(groups, actionPrefix = 'user_group_') {
  const keyboard = new InlineKeyboard();

  if (!groups || groups.length === 0) {
    return keyboard.text("ℹ️ Hozircha sinflar yo'q", 'noop');
  }

  groups.forEach((group, index) => {
    keyboard.text(`👥 ${group.name}`, `${actionPrefix}${group.id}`);
    if ((index + 1) % 2 === 0) {
      keyboard.row();
    }
  });

  // Barcha sinflar jadvalini ko'rish varianti
  keyboard.row().text('🌐 Barcha sinflar', `${actionPrefix}all`);

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
