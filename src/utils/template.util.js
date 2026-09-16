import { settingsRepo } from '../database/settings.repo.js';
import { formatSingleLesson, escapeHtml } from './formatter.js';
import { getTodayInfo } from './date.util.js';

export const DEFAULT_TEMPLATE_HEADER = '🏫 <b>MAKTAB DARS JADVALI</b>';
export const DEFAULT_TEMPLATE_FOOTER = 'Darslarga o‘z vaqtida keling, sinf xonasini toza tuting! 🔔';

export const DEFAULT_TEMPLATE = `{{header}}

📅 {{date}}

👥 {{group}}

━━━━━━━━━━━━━━━━

{{lessons}}

━━━━━━━━━━━━━━━━

📌 {{footer}}`;

export const ALLOWED_PLACEHOLDERS = [
  '{{header}}',
  '{{date}}',
  '{{group}}',
  '{{lessons}}',
  '{{footer}}',
  '{{day}}',
  '{{time}}'
];

/**
 * Shablon ichidagi barcha placeholderlarni tekshirish
 * Noto'g'ri placeholder bo'lsa ro'yxat qaytaradi
 */
export function validateTemplate(templateStr) {
  if (!templateStr || typeof templateStr !== 'string') {
    return { isValid: false, invalidPlaceholders: ['Bo‘sh shablon'] };
  }

  const foundPlaceholders = templateStr.match(/\{\{[^}]+\}\}/g) || [];
  const invalidPlaceholders = [];

  for (const ph of foundPlaceholders) {
    if (!ALLOWED_PLACEHOLDERS.includes(ph)) {
      invalidPlaceholders.push(ph);
    }
  }

  return {
    isValid: invalidPlaceholders.length === 0,
    invalidPlaceholders: [...new Set(invalidPlaceholders)]
  };
}

/**
 * Hozirgi saqlangan shablon sozlamalarini olish
 */
export function getTemplateSettings() {
  const customTemplate = settingsRepo.get('schedule_template', null);
  const header = settingsRepo.get('template_header', DEFAULT_TEMPLATE_HEADER);
  const footer = settingsRepo.get('template_footer', DEFAULT_TEMPLATE_FOOTER);

  return {
    template: customTemplate || DEFAULT_TEMPLATE,
    isCustom: Boolean(customTemplate),
    header,
    footer
  };
}

/**
 * Darslar ro'yxatini matnga aylantirish
 */
export function formatLessonsBlock(lessons, showGroup = false) {
  if (!lessons || lessons.length === 0) {
    return '📅 <i>Bugun darslar yo‘q.</i>';
  }
  return lessons.map(lesson => formatSingleLesson(lesson, showGroup)).join('\n\n');
}

/**
 * Shablon asosida tayyor xabar matnini generatsiya qilish
 */
export function renderScheduleMessage({
  template = null,
  header = null,
  footer = null,
  date = null,
  day = null,
  group = null,
  lessons = [],
  time = null
} = {}) {
  const settings = getTemplateSettings();

  const activeTemplate = template || settings.template;
  const activeHeader = header !== null && header !== undefined ? header : settings.header;
  const activeFooter = footer !== null && footer !== undefined ? footer : settings.footer;

  const today = getTodayInfo();
  const dateStr = date || today.formattedDate;
  const dayStr = day || today.dayName;
  const timeStr = time || today.timeStr;
  const groupStr = group ? `<b>${escapeHtml(group)}</b>` : 'Barcha sinflar';
  const lessonsStr = formatLessonsBlock(lessons, !group);

  let rendered = activeTemplate
    .replace(/\{\{header\}\}/g, activeHeader)
    .replace(/\{\{footer\}\}/g, activeFooter)
    .replace(/\{\{date\}\}/g, dateStr)
    .replace(/\{\{day\}\}/g, dayStr)
    .replace(/\{\{group\}\}/g, groupStr)
    .replace(/\{\{lessons\}\}/g, lessonsStr)
    .replace(/\{\{time\}\}/g, timeStr);

  return rendered.trim();
}

/**
 * Namuna test darslari bilan xabar shablonini ko'rib chiqish (Preview)
 */
export function getPreviewScheduleMessage(options = null) {
  let customTemplate = null;
  let customHeader = null;
  let customFooter = null;

  if (typeof options === 'string') {
    customTemplate = options;
  } else if (options && typeof options === 'object') {
    customTemplate = options.body || options.template || null;
    customHeader = options.header || null;
    customFooter = options.footer || null;
  }

  const sampleLessons = [
    {
      start_time: '08:00',
      end_time: '08:45',
      subject: 'Matematika',
      teacher: 'Aziza opa',
      group_name: '9-A sinf',
      room: '204'
    },
    {
      start_time: '08:50',
      end_time: '09:35',
      subject: 'Ona tili',
      teacher: 'Feruza opa',
      group_name: '9-A sinf',
      room: '204'
    },
    {
      start_time: '09:40',
      end_time: '10:25',
      subject: 'Fizika',
      teacher: 'Rustam aka',
      group_name: '9-A sinf',
      room: '301'
    }
  ];

  return renderScheduleMessage({
    template: customTemplate,
    header: customHeader,
    footer: customFooter,
    group: '9-A sinf',
    lessons: sampleLessons
  });
}

export const templateUtil = {
  getTemplate() {
    const s = getTemplateSettings();
    return {
      header: s.header,
      footer: s.footer,
      body: s.template
    };
  },
  saveTemplate(payload) {
    if (typeof payload === 'string') {
      settingsRepo.set('schedule_template', payload);
    } else {
      if (payload.body) settingsRepo.set('schedule_template', payload.body);
      if (payload.header) settingsRepo.set('template_header', payload.header);
      if (payload.footer) settingsRepo.set('template_footer', payload.footer);
    }
    return this.getTemplate();
  },
  resetTemplate() {
    settingsRepo.set('schedule_template', DEFAULT_TEMPLATE);
    settingsRepo.set('template_header', DEFAULT_TEMPLATE_HEADER);
    settingsRepo.set('template_footer', DEFAULT_TEMPLATE_FOOTER);
    return this.getTemplate();
  },
  validateTemplate(payload) {
    const templateStr = typeof payload === 'string' ? payload : (payload.body || DEFAULT_TEMPLATE);
    const res = validateTemplate(templateStr);
    return {
      isValid: res.isValid,
      errors: res.invalidPlaceholders || []
    };
  },
  generatePreview(payload) {
    return getPreviewScheduleMessage(payload);
  }
};

