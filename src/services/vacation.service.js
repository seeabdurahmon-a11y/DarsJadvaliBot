import { settingsRepo } from '../database/settings.repo.js';
import { getTodayInfo, getTomorrowInfo, isValidDateFormat } from '../utils/date.util.js';
import { escapeHtml } from '../utils/formatter.js';
import { logger } from '../utils/logger.js';
import { DateTime } from 'luxon';

export const vacationService = {
  /**
   * O‘zbekiston Respublikasi Maktabgacha va maktab ta‘limi vazirligi
   * tasdiqlagan rasmiy maktab ta‘tillari taqvimi:
   * 1. Kuzgi ta'til: 4-noyabrdan 10-noyabrgacha (7 kun, darslar 11-noyabrdan boshlanadi)
   * 2. Qishki ta'til: 28-dekabrdan 10-yanvargacha (14 kun, darslar 11-yanvardan boshlanadi)
   * 3. Bahorgi ta'til: 21-martdan 27-martgacha (7 kun, darslar 28-martdan boshlanadi)
   * 4. Yozgi ta'til: 26-maydan 1-sentabrgacha
   */
  getDefaultVacationForDate(dateStr) {
    if (!dateStr) return null;
    const year = parseInt(dateStr.slice(0, 4), 10);
    const md = dateStr.slice(5); // e.g. "11-04"

    // 1. Kuzgi ta'til: 4-10 noyabr
    if (md >= '11-04' && md <= '11-10') {
      return {
        title: "Kuzgi ta'til",
        startDate: `${year}-11-04`,
        endDate: `${year}-11-10`,
        message: "Darslar 11-noyabr Dushanba kunidan boshlanadi. Maroqli hordiq tilaymiz!"
      };
    }

    // 2. Qishki ta'til: 28-dekabr - 10-yanvar
    if (md >= '12-28' || md <= '01-10') {
      const sYear = md <= '01-10' ? year - 1 : year;
      const eYear = md <= '01-10' ? year : year + 1;
      return {
        title: "Qishki ta'til",
        startDate: `${sYear}-12-28`,
        endDate: `${eYear}-01-10`,
        message: "Darslar 11-yanvar kunidan boshlanadi. Yangi yilingiz bilan!"
      };
    }

    // 3. Bahorgi ta'til: 21-mart - 27-mart
    if (md >= '03-21' && md <= '03-27') {
      return {
        title: "Bahorgi ta'til",
        startDate: `${year}-03-21`,
        endDate: `${year}-03-27`,
        message: "Darslar 28-mart kunidan boshlanadi. Navro'z bayramingiz qutlug' bo'lsin!"
      };
    }

    // 4. Yozgi ta'til: 26-may - 1-sentabr
    if (md >= '05-26' && md <= '09-01') {
      return {
        title: "Yozgi ta'til",
        startDate: `${year}-05-26`,
        endDate: `${year}-09-01`,
        message: "Yangi o‘quv yili 2-sentabrdan boshlanadi. Maroqli yozgi ta'til tilaymiz!"
      };
    }

    return null;
  },

  /**
   * Maktab uchun ta'til sozlamalari va hozirgi holatini olish
   * @param {number|string} schoolId 
   * @param {string} targetDate "YYYY-MM-DD"
   */
  getVacationInfo(schoolId = 1, targetDate = null) {
    const sId = schoolId || 1;
    const isManual = settingsRepo.get(`vacation_mode_${sId}`, null) ?? settingsRepo.get('vacation_mode', null);
    const startDate = settingsRepo.get(`vacation_start_${sId}`, null) ?? settingsRepo.get('vacation_start', null);
    const endDate = settingsRepo.get(`vacation_end_${sId}`, null) ?? settingsRepo.get('vacation_end', null);
    const title = settingsRepo.get(`vacation_title_${sId}`, null) ?? settingsRepo.get('vacation_title', null);
    const message = settingsRepo.get(`vacation_message_${sId}`, null) ?? settingsRepo.get('vacation_message', null);

    const checkDate = targetDate || getTodayInfo().dateStr; // e.g. "2026-11-03"
    const defaultVac = this.getDefaultVacationForDate(checkDate);

    let isActive = false;
    let statusReason = 'normal'; // 'manual_on', 'manual_off', 'date_range', 'default_statutory_vacation', 'inactive'

    if (isManual === '1') {
      isActive = true;
      statusReason = 'manual_on';
    } else if (isManual === '0') {
      isActive = false;
      statusReason = 'manual_off';
    } else if (startDate && endDate) {
      if (checkDate >= startDate && checkDate <= endDate) {
        isActive = true;
        statusReason = 'date_range';
      } else {
        isActive = false;
        statusReason = 'outside_range';
      }
    } else if (defaultVac) {
      isActive = true;
      statusReason = 'default_statutory_vacation';
    } else {
      isActive = false;
      statusReason = 'inactive';
    }

    const effectiveTitle = title || defaultVac?.title || "Ta'til";
    const effectiveStart = startDate || defaultVac?.startDate || null;
    const effectiveEnd = endDate || defaultVac?.endDate || null;
    const effectiveMessage = message || defaultVac?.message || null;

    return {
      schoolId: Number(sId),
      isActive,
      statusReason,
      manualMode: isManual, // '1', '0' yoki null
      startDate: effectiveStart,
      endDate: effectiveEnd,
      title: effectiveTitle,
      message: effectiveMessage
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

    // Standart rasmiy vazirlik taqvimi bo'yicha tekshirish
    const defVac = this.getDefaultVacationForDate(targetDate);
    return Boolean(defVac);
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
    const info = this.getVacationInfo(schoolId, targetDate);
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
