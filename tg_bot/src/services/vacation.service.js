import { settingsRepo } from '../database/settings.repo.js';
import { getTodayInfo, getTomorrowInfo, isValidDateFormat } from '../utils/date.util.js';
import { escapeHtml } from '../utils/formatter.js';
import { logger } from '../utils/logger.js';
import { DateTime } from 'luxon';

export const vacationService = {
  /**
   * Maktab uchun ta'til sozlamalari va hozirgi holatini olish
   * @param {number|string} schoolId 
   */
  getVacationInfo(schoolId = 1) {
    const sId = schoolId || 1;
    const isManual = settingsRepo.get(`vacation_mode_${sId}`, null) ?? settingsRepo.get('vacation_mode', null);
    const startDate = settingsRepo.get(`vacation_start_${sId}`, null) ?? settingsRepo.get('vacation_start', null);
    const endDate = settingsRepo.get(`vacation_end_${sId}`, null) ?? settingsRepo.get('vacation_end', null);
    const title = settingsRepo.get(`vacation_title_${sId}`, null) ?? settingsRepo.get('vacation_title', "Ta'til");
    const message = settingsRepo.get(`vacation_message_${sId}`, null) ?? settingsRepo.get('vacation_message', null);

    const today = getTodayInfo();
    const todayDate = today.dateStr; // e.g. "2026-11-03"

    let isActive = false;
    let statusReason = 'normal'; // 'manual_on', 'manual_off', 'date_range', 'inactive'

    if (isManual === '1') {
      isActive = true;
      statusReason = 'manual_on';
    } else if (isManual === '0') {
      isActive = false;
      statusReason = 'manual_off';
    } else if (startDate && endDate) {
      if (todayDate >= startDate && todayDate <= endDate) {
        isActive = true;
        statusReason = 'date_range';
      } else {
        isActive = false;
        statusReason = 'outside_range';
      }
    } else {
      isActive = false;
      statusReason = 'inactive';
    }

    return {
      schoolId: Number(sId),
      isActive,
      statusReason,
      manualMode: isManual, // '1', '0' yoki null
      startDate: startDate || null,
      endDate: endDate || null,
      title: title || "Ta'til",
      message: message || null
    };
  },

  /**
   * Berilgan sana ta'til oralig'iga to'g'ri keladimi yoki yo'qligini tekshirish
   * @param {number|string} schoolId 
   * @param {string} dateStr "YYYY-MM-DD"
   */
  isVacationActive(schoolId = 1, dateStr = null) {
    const sId = schoolId || 1;
    const targetDate = dateStr || getTodayInfo().dateStr;
    const isManual = settingsRepo.get(`vacation_mode_${sId}`, null) ?? settingsRepo.get('vacation_mode', null);

    if (isManual === '1') return true;
    if (isManual === '0') return false;

    const startDate = settingsRepo.get(`vacation_start_${sId}`, null) ?? settingsRepo.get('vacation_start', null);
    const endDate = settingsRepo.get(`vacation_end_${sId}`, null) ?? settingsRepo.get('vacation_end', null);

    if (startDate && endDate) {
      return targetDate >= startDate && targetDate <= endDate;
    }

    return false;
  },

  /**
   * Ta'til holatini o'rnatish yoki yangilash
   */
  setVacation(schoolId = 1, { isActive, startDate, endDate, title, message } = {}) {
    const sId = schoolId || 1;

    if (typeof isActive !== 'undefined') {
      if (isActive === null || isActive === 'auto') {
        // Avtomatik sana oralig'iga qaytarish (manual bekor qilinadi)
        settingsRepo.set(`vacation_mode_${sId}`, '');
      } else {
        const val = (isActive === true || isActive === 1 || isActive === '1' || isActive === 'on') ? '1' : '0';
        settingsRepo.set(`vacation_mode_${sId}`, val);
      }
    }

    if (typeof startDate !== 'undefined') {
      settingsRepo.set(`vacation_start_${sId}`, startDate || '');
    }

    if (typeof endDate !== 'undefined') {
      settingsRepo.set(`vacation_end_${sId}`, endDate || '');
    }

    if (typeof title !== 'undefined') {
      settingsRepo.set(`vacation_title_${sId}`, title || "Ta'til");
    }

    if (typeof message !== 'undefined') {
      settingsRepo.set(`vacation_message_${sId}`, message || '');
    }

    logger.info(`[VACATION] Maktab #${sId} ta'til sozlamalari yangilandi: isActive=${isActive}, start=${startDate}, end=${endDate}, title=${title}`);
    return this.getVacationInfo(sId);
  },

  /**
   * Telegram buyrug'i matnidan sana oralig'i va nomni ajratib olish
   * Masalan: "04.11-10.11 Kuzgi ta'til" yoki "2026-11-04 2026-11-10 Qishki ta'til"
   */
  parseDateRange(text) {
    if (!text || typeof text !== 'string') return null;
    const clean = text.trim();
    const currentYear = getTodayInfo().dateTime.year;

    // 1. Format: YYYY-MM-DD - YYYY-MM-DD [Nomi]
    const isoMatch = clean.match(/^(\d{4}[-/.]\d{2}[-/.]\d{2})\s*(?:-|dan|to|gacha|\s)\s*(\d{4}[-/.]\d{2}[-/.]\d{2})(?:\s+(.+))?$/i);
    if (isoMatch) {
      const s = isoMatch[1].replace(/[/.]/g, '-');
      const e = isoMatch[2].replace(/[/.]/g, '-');
      const title = (isoMatch[3] || "Ta'til").trim();
      if (isValidDateFormat(s) && isValidDateFormat(e)) {
        return { startDate: s, endDate: e, title };
      }
    }

    // 2. Format: DD.MM.YYYY - DD.MM.YYYY [Nomi]
    const dmyFullMatch = clean.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})\s*(?:-|dan|to|gacha|\s)\s*(\d{1,2})[./](\d{1,2})[./](\d{4})(?:\s+(.+))?$/i);
    if (dmyFullMatch) {
      const s = `${dmyFullMatch[3]}-${dmyFullMatch[2].padStart(2, '0')}-${dmyFullMatch[1].padStart(2, '0')}`;
      const e = `${dmyFullMatch[6]}-${dmyFullMatch[5].padStart(2, '0')}-${dmyFullMatch[4].padStart(2, '0')}`;
      const title = (dmyFullMatch[7] || "Ta'til").trim();
      if (isValidDateFormat(s) && isValidDateFormat(e)) {
        return { startDate: s, endDate: e, title };
      }
    }

    // 3. Format: DD.MM - DD.MM [Nomi] (Joriy yil avtomatik olinadi)
    const dmyShortMatch = clean.match(/^(\d{1,2})[./](\d{1,2})\s*(?:-|dan|to|gacha|\s)\s*(\d{1,2})[./](\d{1,2})(?:\s+(.+))?$/i);
    if (dmyShortMatch) {
      const s = `${currentYear}-${dmyShortMatch[2].padStart(2, '0')}-${dmyShortMatch[1].padStart(2, '0')}`;
      const e = `${currentYear}-${dmyShortMatch[4].padStart(2, '0')}-${dmyShortMatch[3].padStart(2, '0')}`;
      const title = (dmyShortMatch[5] || "Ta'til").trim();
      if (isValidDateFormat(s) && isValidDateFormat(e)) {
        return { startDate: s, endDate: e, title };
      }
    }

    return null;
  },

  /**
   * Foydalanuvchilar (O'quvchi/Ustoz) uchun ta'til xabarini formatlash
   */
  formatVacationText(schoolId = 1, targetDate = null) {
    const info = this.getVacationInfo(schoolId);
    let text = `🏖️ <b>MAKTAB TA'TILDA! (${escapeHtml(info.title)})</b>\n\n`;
    text += `Hurmatli o‘quvchilar, ota-onalar va ustozlar!\n`;
    text += `Hozir maktabimizda ta'til davri davom etmoqda.\n\n`;

    if (info.startDate && info.endDate) {
      text += `📅 <b>Ta'til muddati:</b> <code>${info.startDate} — ${info.endDate}</code>\n`;
      text += `🔔 <b>Darslar qayta boshlanishi:</b> <code>${info.endDate}</code> sanasidan so‘ng\n\n`;
    }

    if (info.message) {
      text += `ℹ️ <i>${escapeHtml(info.message)}</i>\n\n`;
    }

    text += `🎉 <i>Dam olish kunlaringiz maroqli va mazmunli o‘tsin!</i>`;
    return text;
  }
};
