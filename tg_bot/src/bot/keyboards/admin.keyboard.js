import { InlineKeyboard } from 'grammy';
import { DAYS_LIST } from '../../config/constants.js';

/**
 * Admin asosiy paneli menyusi (Inline Keyboard)
 */
export function getAdminMainMenuKeyboard() {
  return new InlineKeyboard()
    .text('📋 Jadvalni ko‘rish', 'admin_view_schedule')
    .text('➕ Dars qo‘shish', 'admin_add_lesson')
    .row()
    .text('✏️ Darsni o‘zgartirish', 'admin_edit_lesson')
    .text('🗑 Darsni o‘chirish', 'admin_delete_lesson')
    .row()
    .text('👥 Guruhlar', 'admin_list_groups')
    .text('📩 Xabar shabloni', 'admin_template_menu')
    .row()
    .text('⏰ Yuborish vaqtini sozlash', 'admin_set_time')
    .text('📤 Hozir yuborish', 'admin_broadcast_now')
    .row()
    .text('📊 Statistika', 'admin_stats')
    .text('🔑 Parolni o‘zgartirish', 'admin_change_password')
    .row()
    .text('🚪 Admin paneldan chiqish', 'admin_logout');
}

/**
 * Xabar shabloni menyusi (Inline Keyboard)
 */
export function getTemplateMenuKeyboard() {
  return new InlineKeyboard()
    .text('✏️ Sarlavhani o‘zgartirish', 'admin_tpl_edit_header')
    .row()
    .text('📝 Pastki matnni o‘zgartirish', 'admin_tpl_edit_footer')
    .row()
    .text('🛠 To‘liq shablonni o‘zgartirish', 'admin_tpl_edit_full')
    .row()
    .text('👁 Ko‘rib chiqish', 'admin_tpl_preview')
    .row()
    .text('🔄 Standart holatga qaytarish', 'admin_tpl_reset_ask')
    .row()
    .text('⬅️ Orqaga', 'admin_main');
}

/**
 * Ko'rib chiqish (Preview) menyusi tugmalari
 */
export function getTemplatePreviewKeyboard() {
  return new InlineKeyboard()
    .text('✏️ O‘zgartirish', 'admin_template_menu')
    .text('📤 Test xabar yuborish', 'admin_tpl_test_send')
    .row()
    .text('⬅️ Orqaga', 'admin_template_menu');
}

/**
 * Standart holatga qaytarishni tasdiqlash klaviaturasi
 */
export function getTemplateResetConfirmKeyboard() {
  return new InlineKeyboard()
    .text('✅ Ha, standartga qaytarilsin', 'admin_tpl_reset_confirm')
    .text('❌ Yo‘q, bekor qilish', 'admin_template_menu');
}

/**
 * Bekor qilish tugmasi
 */
export function getCancelKeyboard(cancelAction = 'admin_cancel') {
  return new InlineKeyboard().text('❌ Bekor qilish', cancelAction);
}

/**
 * Orqaga va Bekor qilish tugmalari
 */
export function getBackAndCancelKeyboard(backAction, cancelAction = 'admin_cancel') {
  return new InlineKeyboard()
    .text('⬅️ Orqaga', backAction)
    .text('❌ Bekor qilish', cancelAction);
}

/**
 * Dars qo'shish uchun guruh tanlash klaviaturasi
 */
export function getAdminGroupSelectionKeyboard(groups, actionPrefix = 'admin_sel_group_') {
  const keyboard = new InlineKeyboard();

  if (!groups || groups.length === 0) {
    keyboard.text('➕ Yangi guruh qo\'shish', 'admin_add_group').row();
  } else {
    groups.forEach((group, index) => {
      keyboard.text(`👥 ${group.name}`, `${actionPrefix}${group.id}`);
      if ((index + 1) % 2 === 0) {
        keyboard.row();
      }
    });
    keyboard.row();
  }

  keyboard.text('❌ Bekor qilish', 'admin_cancel');
  return keyboard;
}

/**
 * Dars qo'shish uchun hafta kunini tanlash klaviaturasi
 */
export function getAdminDaySelectionKeyboard(actionPrefix = 'admin_sel_day_') {
  const keyboard = new InlineKeyboard();

  DAYS_LIST.forEach((day, index) => {
    keyboard.text(`🗓 ${day.name}`, `${actionPrefix}${day.id}`);
    if ((index + 1) % 2 === 0) {
      keyboard.row();
    }
  });

  keyboard.row().text('❌ Bekor qilish', 'admin_cancel');
  return keyboard;
}

/**
 * Manual broadcast uchun guruh tanlash klaviaturasi
 */
export function getBroadcastGroupSelectionKeyboard(groups) {
  const keyboard = new InlineKeyboard();

  keyboard.text('🌐 Barcha faol guruhlarga yuborish', 'admin_send_all').row();

  if (groups && groups.length > 0) {
    groups.forEach((group, index) => {
      keyboard.text(`👥 ${group.name}`, `admin_send_grp_${group.id}`);
      if ((index + 1) % 2 === 0) {
        keyboard.row();
      }
    });
    keyboard.row();
  }

  keyboard.text('⬅️ Orqaga', 'admin_main');
  return keyboard;
}

/**
 * Darslarni o'chirish / o'zgartirish uchun ro'yxat klaviaturasi
 */
export function getLessonsListKeyboard(lessons, actionPrefix = 'admin_lesson_') {
  const keyboard = new InlineKeyboard();

  if (!lessons || lessons.length === 0) {
    keyboard.text('ℹ️ Darslar topilmadi', 'noop').row();
  } else {
    lessons.forEach(l => {
      const label = `🕐 ${l.start_time} - ${l.subject} (${l.group_name || ''})`;
      keyboard.text(label.slice(0, 35), `${actionPrefix}${l.id}`).row();
    });
  }

  keyboard.text('⬅️ Orqaga', 'admin_main');
  return keyboard;
}

/**
 * Guruhlar ro'yxati va boshqarish klaviaturasi
 */
export function getGroupsManageKeyboard(groups) {
  const keyboard = new InlineKeyboard();

  if (groups && groups.length > 0) {
    groups.forEach(g => {
      keyboard.text(`👥 ${g.name} (${g.send_time})`, `admin_grp_detail_${g.id}`).row();
    });
    keyboard.text('🗑 Guruhni o‘chirish', 'admin_delete_group_menu').row();
  }

  keyboard.text('➕ Yangi guruh qo‘shish', 'admin_add_group').row();
  keyboard.text('⬅️ Orqaga', 'admin_main');
  return keyboard;
}

/**
 * Guruhlarni o'chirish ro'yxati klaviaturasi
 */
export function getGroupsDeleteKeyboard(groups) {
  const keyboard = new InlineKeyboard();

  if (groups && groups.length > 0) {
    groups.forEach(g => {
      keyboard.text(`🗑 ${g.name}`, `admin_grp_del_ask_${g.id}`).row();
    });
  }

  keyboard.text('⬅️ Guruhlar ro‘yxatiga qaytish', 'admin_list_groups');
  return keyboard;
}

/**
 * Guruhni o'chirishni tasdiqlash klaviaturasi
 */
export function getGroupDeleteConfirmKeyboard(groupId) {
  return new InlineKeyboard()
    .text('✅ Ha, o‘chirilsin', `admin_grp_del_confirm_${groupId}`)
    .text('❌ Yo‘q, bekor qilish', 'admin_list_groups');
}
