import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { getDatabase, closeDatabase } from '../src/database/db.js';
import { settingsRepo } from '../src/database/settings.repo.js';
import { isAdmin, config } from '../src/config/index.js';
import {
  validateTemplate,
  getTemplateSettings,
  renderScheduleMessage,
  getPreviewScheduleMessage,
  DEFAULT_TEMPLATE,
  DEFAULT_TEMPLATE_HEADER,
  DEFAULT_TEMPLATE_FOOTER
} from '../src/utils/template.util.js';

const TEST_DB_PATH = path.resolve('data/test-template-bot.sqlite');

test.before(() => {
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
  closeDatabase();
  getDatabase(TEST_DB_PATH);
});

test.after(() => {
  closeDatabase();
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
});

test('Template 1: Standart template to‘g‘ri olinadi', () => {
  const settings = getTemplateSettings();
  assert.equal(settings.template, DEFAULT_TEMPLATE);
  assert.equal(settings.header, DEFAULT_TEMPLATE_HEADER);
  assert.equal(settings.footer, DEFAULT_TEMPLATE_FOOTER);
  assert.equal(settings.isCustom, false);
});

test('Template 2: Template saqlash va o‘qish', () => {
  const customHeader = '🏫 <b>1-SONLI MAKTAB DARS JADVALI</b>';
  const customFooter = '📌 Darslarga kechikmang!';
  const customTemplate = `{{header}}\n📅 {{date}}\n👥 {{group}}\n{{lessons}}\n{{footer}}`;

  settingsRepo.set('template_header', customHeader);
  settingsRepo.set('template_footer', customFooter);
  settingsRepo.set('schedule_template', customTemplate);

  const settings = getTemplateSettings();
  assert.equal(settings.header, customHeader);
  assert.equal(settings.footer, customFooter);
  assert.equal(settings.template, customTemplate);
  assert.equal(settings.isCustom, true);
});

test('Template 3: Placeholderlarni almashtirish to‘g‘ri ishlaydi', () => {
  const template = `{{header}}\nSana: {{date}}\nSinf: {{group}}\n{{lessons}}\nEslatma: {{footer}}`;
  const sampleLessons = [
    {
      start_time: '08:00',
      end_time: '08:45',
      subject: 'Matematika',
      teacher: 'Aziza opa',
      room: '204'
    }
  ];

  const rendered = renderScheduleMessage({
    template,
    header: 'MAKTAB',
    footer: 'Omad',
    date: '15-sentabr, Seshanba',
    group: '9-A sinf',
    lessons: sampleLessons
  });

  assert.ok(rendered.includes('MAKTAB'));
  assert.ok(rendered.includes('Sana: 15-sentabr, Seshanba'));
  assert.ok(rendered.includes('Sinf: <b>9-A sinf</b>'));
  assert.ok(rendered.includes('08:00 — 08:45'));
  assert.ok(rendered.includes('Matematika'));
  assert.ok(rendered.includes('Aziza opa'));
  assert.ok(rendered.includes('Eslatma: Omad'));
});

test('Template 4: Noto‘g‘ri placeholderlar aniqlanadi', () => {
  // To'g'ri placeholderlar
  const validResult = validateTemplate(`{{header}} {{date}} {{group}} {{lessons}} {{footer}} {{day}} {{time}}`);
  assert.equal(validResult.isValid, true);
  assert.equal(validResult.invalidPlaceholders.length, 0);

  // Noto'g'ri placeholderlar
  const invalidResult = validateTemplate(`{{header}} {{abc}} {{date}} {{xyz_123}}`);
  assert.equal(invalidResult.isValid, false);
  assert.ok(invalidResult.invalidPlaceholders.includes('{{abc}}'));
  assert.ok(invalidResult.invalidPlaceholders.includes('{{xyz_123}}'));
});

test('Template 5: Template reset (standart holatga qaytarish)', () => {
  // Reset qilish
  settingsRepo.set('schedule_template', DEFAULT_TEMPLATE);
  settingsRepo.set('template_header', DEFAULT_TEMPLATE_HEADER);
  settingsRepo.set('template_footer', DEFAULT_TEMPLATE_FOOTER);

  const settings = getTemplateSettings();
  assert.equal(settings.template, DEFAULT_TEMPLATE);
  assert.equal(settings.header, DEFAULT_TEMPLATE_HEADER);
  assert.equal(settings.footer, DEFAULT_TEMPLATE_FOOTER);
});

test('Template 6: Test preview (ko‘rib chiqish) muvaffaqiyatli ishlaydi', () => {
  const preview = getPreviewScheduleMessage();
  assert.ok(preview);
  assert.ok(preview.length > 20);
  assert.ok(preview.includes('9-A sinf'));
  assert.ok(preview.includes('Matematika'));
  assert.ok(preview.includes('Ona tili'));
});

test('Template 7: Oddiy user admin funksiyasiga kira olmasligi tekshiruvi', () => {
  config.ADMIN_IDS = ['111222', '333444'];

  const normalUserId = '999888';
  const adminUserId = '111222';

  assert.equal(isAdmin(normalUserId), false);
  assert.equal(isAdmin(adminUserId), true);
});
