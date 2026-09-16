import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { getDatabase, closeDatabase } from '../src/database/db.js';
import { groupsRepo } from '../src/database/groups.repo.js';
import { lessonsRepo } from '../src/database/lessons.repo.js';
import { formatDailySchedule, formatWeeklySchedule, getSubjectEmoji, formatStats } from '../src/utils/formatter.js';
import { scheduleService } from '../src/services/schedule.service.js';

const TEST_DB_PATH = path.resolve('data/test-schedule-bot.sqlite');

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

test('Formatter: getSubjectEmoji maps subject correctly', () => {
  assert.equal(getSubjectEmoji('English'), '🇬🇧');
  assert.equal(getSubjectEmoji('Rus tili'), '🇷🇺');
  assert.equal(getSubjectEmoji('Arab tili'), '🇸🇦');
  assert.equal(getSubjectEmoji('Matematika'), '📐');
  assert.equal(getSubjectEmoji('Informatika'), '💻');
  assert.equal(getSubjectEmoji('Fizika'), '⚡');
  assert.equal(getSubjectEmoji('Kimyo'), '🧪');
  assert.equal(getSubjectEmoji('Biologiya'), '🧬');
  assert.equal(getSubjectEmoji('Ona tili'), '📚');
  assert.equal(getSubjectEmoji('Tarix'), '🏛');
  assert.equal(getSubjectEmoji('Jismoniy tarbiya'), '⚽');
});

test('Formatter: formatDailySchedule handles empty and populated schedules', () => {
  // Empty
  const emptyOutput = formatDailySchedule({
    title: 'MAKTAB',
    dateHeader: 'Bugun: 15-sentabr, Seshanba',
    lessons: []
  });
  assert.ok(emptyOutput.includes('darslar yo‘q') || emptyOutput.includes('Darslar mavjud emas'));

  // Populated
  const lessons = [
    {
      start_time: '08:00',
      end_time: '08:45',
      subject: 'Matematika',
      teacher: 'Aziza opa',
      group_name: '9-A sinf',
      room: '204'
    }
  ];

  const populatedOutput = formatDailySchedule({
    title: 'MAKTAB',
    dateHeader: 'Bugun: 15-sentabr, Seshanba',
    lessons
  });

  assert.ok(populatedOutput.includes('08:00 — 08:45'));
  assert.ok(populatedOutput.includes('Matematika'));
  assert.ok(populatedOutput.includes('Aziza opa'));
  assert.ok(populatedOutput.includes('Xona: 204'));
});

test('Formatter: formatWeeklySchedule formats correctly grouped by day', () => {
  const lessons = [
    {
      day_of_week: 1,
      start_time: '08:00',
      subject: 'Matematika',
      group_name: '9-A sinf',
      room: '204'
    },
    {
      day_of_week: 2,
      start_time: '08:50',
      subject: 'Fizika',
      group_name: '9-A sinf',
      room: '301'
    }
  ];

  const weeklyOutput = formatWeeklySchedule({
    title: 'HAFTALIK DARS JADVALI',
    lessons
  });

  assert.ok(weeklyOutput.includes('Dushanba'));
  assert.ok(weeklyOutput.includes('Seshanba'));
  assert.ok(weeklyOutput.includes('Matematika'));
  assert.ok(weeklyOutput.includes('Fizika'));
});

test('Schedule Service: retrieves and formats schedule without crashing', () => {
  const group = groupsRepo.addGroup({
    telegram_chat_id: '-100999888',
    name: '9-A sinf',
    send_time: '06:00'
  });

  lessonsRepo.addLesson({
    group_id: group.id,
    day_of_week: 1,
    start_time: '08:00',
    end_time: '08:45',
    subject: 'Matematika',
    teacher: 'Aziza opa',
    room: '204'
  });

  const todayResult = scheduleService.getTodaySchedule(group.id);
  assert.ok(todayResult.formattedText);

  const tomorrowResult = scheduleService.getTomorrowSchedule(group.id);
  assert.ok(tomorrowResult.formattedText);

  const weeklyResult = scheduleService.getWeeklySchedule(group.id);
  assert.ok(weeklyResult.formattedText.includes('Matematika'));
});
