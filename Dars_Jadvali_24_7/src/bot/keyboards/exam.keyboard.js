import { InlineKeyboard } from 'grammy';
import { getNowInTashkent } from '../../utils/date.util.js';
import { DAYS_OF_WEEK } from '../../config/constants.js';

/**
 * Ustoz uchun Nazorat ishlari boshqaruv menyusi
 */
export function getTeacherExamMenuKeyboard() {
  const keyboard = new InlineKeyboard();
  keyboard
    .text('➕ Yangi nazorat ishi belgilash', 'teacher_exam_new')
    .row()
    .text('📋 Mening nazorat ishlarim', 'teacher_exam_list')
    .row()
    .text('🗑 Bekor qilish / O‘chirish', 'teacher_exam_del_menu');
  return keyboard;
}

/**
 * Sinf tanlash klaviaturasi
 */
export function getExamClassesKeyboard(groups, teacherGroupIds = [], actionPrefix = 'teacher_exam_sinf_') {
  const keyboard = new InlineKeyboard();

  if (!groups || groups.length === 0) {
    return keyboard.text("ℹ️ Sinf topilmadi", 'noop');
  }

  // Ustoz dars o'tadigan sinflarni ajratish
  const taughtGroups = groups.filter(g => teacherGroupIds.includes(g.id));
  const otherGroups = groups.filter(g => !teacherGroupIds.includes(g.id));

  // Agar ustozning sinflari bo'lsa, ularni avval chiqaramiz
  if (taughtGroups.length > 0 && otherGroups.length > 0) {
    taughtGroups.forEach((group, index) => {
      const displayName = group.name.replace(/\s*sinf\s*/gi, '').trim() || group.name;
      keyboard.text(`⭐ ${displayName}`, `${actionPrefix}${group.id}`);
      if ((index + 1) % 4 === 0) keyboard.row();
    });

    if (taughtGroups.length % 4 !== 0) keyboard.row();

    otherGroups.forEach((group, index) => {
      const displayName = group.name.replace(/\s*sinf\s*/gi, '').trim() || group.name;
      keyboard.text(displayName, `${actionPrefix}${group.id}`);
      if ((index + 1) % 4 === 0) keyboard.row();
    });
  } else {
    groups.forEach((group, index) => {
      const displayName = group.name.replace(/\s*sinf\s*/gi, '').trim() || group.name;
      keyboard.text(displayName, `${actionPrefix}${group.id}`);
      if ((index + 1) % 4 === 0) keyboard.row();
    });
  }

  keyboard.row().text('🔙 Orqaga', 'teacher_exam_menu');
  return keyboard;
}

/**
 * Sana tanlash klaviaturasi (Bugun, Ertaga va keyingi 6 kun)
 */
export function getExamDateSelectionKeyboard(actionPrefix = 'teacher_exam_date_') {
  const keyboard = new InlineKeyboard();
  const now = getNowInTashkent();

  const todayStr = now.toFormat('yyyy-MM-dd');
  const todayDayName = DAYS_OF_WEEK[now.weekday] || '';
  keyboard.text(`⚡️ Bugun (${todayDayName}, ${now.toFormat('dd.MM')})`, `${actionPrefix}${todayStr}`).row();

  const tomorrow = now.plus({ days: 1 });
  const tomorrowStr = tomorrow.toFormat('yyyy-MM-dd');
  const tomorrowDayName = DAYS_OF_WEEK[tomorrow.weekday] || '';
  keyboard.text(`⚡️ Ertaga (${tomorrowDayName}, ${tomorrow.toFormat('dd.MM')})`, `${actionPrefix}${tomorrowStr}`).row();

  // Keyingi 5 kunlik jadval
  for (let i = 2; i <= 6; i++) {
    const nextDay = now.plus({ days: i });
    const dayStr = nextDay.toFormat('yyyy-MM-dd');
    const dayName = DAYS_OF_WEEK[nextDay.weekday] || '';
    if (nextDay.weekday <= 6) { // Yakshanbani o'tkazib yuborish yoki ko'rsatish
      keyboard.text(`🗓 ${dayName} (${nextDay.toFormat('dd.MM')})`, `${actionPrefix}${dayStr}`);
      if (i % 2 === 1) keyboard.row();
    }
  }

  keyboard.row().text('✍️ Boshqa sana (Yozish)', 'teacher_exam_date_custom');
  keyboard.row().text('🔙 Orqaga', 'teacher_exam_new');
  return keyboard;
}

/**
 * Dars tartib raqami (1..7) klaviaturasi
 */
export function getExamLessonNumberKeyboard(actionPrefix = 'teacher_exam_les_') {
  const keyboard = new InlineKeyboard();
  
  keyboard
    .text('1-dars', `${actionPrefix}1`)
    .text('2-dars', `${actionPrefix}2`)
    .text('3-dars', `${actionPrefix}3`)
    .text('4-dars', `${actionPrefix}4`)
    .row()
    .text('5-dars', `${actionPrefix}5`)
    .text('6-dars', `${actionPrefix}6`)
    .text('7-dars', `${actionPrefix}7`)
    .text('Belgilanmagan', `${actionPrefix}0`)
    .row()
    .text('🔙 Orqaga', 'teacher_exam_step_date');

  return keyboard;
}

/**
 * Nazorat ishi turi klaviaturasi
 */
export function getExamTypeKeyboard(actionPrefix = 'teacher_exam_type_') {
  const keyboard = new InlineKeyboard();

  keyboard
    .text('📝 BSB (Bo‘lim nazorati)', `${actionPrefix}bsb`)
    .row()
    .text('📊 CHSB (Choraklik nazorat)', `${actionPrefix}chsb`)
    .row()
    .text('📝 Nazorat ishi', `${actionPrefix}nazorat`)
    .row()
    .text('🧪 Amaliy / Lab ishi', `${actionPrefix}amaliy`)
    .row()
    .text('📋 Test sinovi', `${actionPrefix}test`)
    .row()
    .text('✍️ Boshqa nom yozish', `${actionPrefix}custom`)
    .row()
    .text('🔙 Orqaga', 'teacher_exam_step_sinf');

  return keyboard;
}

/**
 * Nazorat ishlarini o'chirish klaviaturasi
 */
export function getExamDeleteKeyboard(exams, actionPrefix = 'teacher_exam_del_item_') {
  const keyboard = new InlineKeyboard();

  if (!exams || exams.length === 0) {
    keyboard.text("ℹ️ O‘chirish uchun nazorat ishlari yo‘q", 'noop').row();
    keyboard.text('🔙 Orqaga', 'teacher_exam_menu');
    return keyboard;
  }

  exams.forEach((exam) => {
    const title = `${exam.date} | ${exam.group_name} | ${exam.title || 'Nazorat ishi'}`;
    keyboard.text(`🗑 ${title}`, `${actionPrefix}${exam.id}`).row();
  });

  keyboard.text('🔙 Orqaga', 'teacher_exam_menu');
  return keyboard;
}
