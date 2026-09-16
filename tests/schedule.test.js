import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { getDatabase, closeDatabase } from '../src/database/db.js';
import { groupsRepo } from '../src/database/groups.repo.js';
import { lessonsRepo } from '../src/database/lessons.repo.js';
import { formatDailySchedule, formatWeeklySchedule, getSubjectEmoji, formatStats } from '../src/utils/formatter.js';
import { scheduleService } from '../src/services/schedule.service.js';
import { adminService } from '../src/services/admin.service.js';

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

test('Schedule Service: adminService.sendTodayScheduleToGroup sends and allows resending with force:true', async () => {
  const group = groupsRepo.addGroup({
    telegram_chat_id: '-100123456789',
    name: '10-A sinf',
    send_time: '07:00'
  });

  const sentMessages = [];
  const mockBot = {
    api: {
      sendMessage: async (chatId, text, options) => {
        sentMessages.push({ chatId, text, options });
        return { message_id: 12345 };
      }
    }
  };

  // 1-marta yuborish
  const res1 = await adminService.sendTodayScheduleToGroup(mockBot, group, { force: false });
  assert.equal(res1.success, true);
  assert.equal(sentMessages.length, 1);

  // 2-marta oddiy yuborishda takroriy yuborish cheklovi (already_sent) bo'ladi
  const res2 = await adminService.sendTodayScheduleToGroup(mockBot, group, { force: false });
  assert.equal(res2.skipped, true);
  assert.equal(res2.reason, 'already_sent');
  assert.equal(sentMessages.length, 1);

  // 3-marta force: true (qaytadan tashlash) bilan yuborilganda muvaffaqiyatli qayta yuboriladi
  const res3 = await adminService.sendTodayScheduleToGroup(mockBot, group, { force: true });
  assert.equal(res3.success, true);
  assert.equal(sentMessages.length, 2);
});

test('Schedule Service: getCurrentLesson detects current lesson and states correctly', () => {
  const group = groupsRepo.addGroup({
    telegram_chat_id: '-100333444',
    name: '11-B sinf',
    send_time: '08:00'
  });

  const todayInfo = scheduleService.getTodaySchedule(group.id).today;
  const dayOfWeek = todayInfo.dayOfWeek;

  // Bo'sh bo'lganda no_lessons qaytaradi
  const emptyRes = scheduleService.getCurrentLesson(group.id);
  assert.equal(emptyRes.status, 'no_lessons');
  assert.ok(emptyRes.formattedText.includes('darslar mavjud emas'));

  // 1-dars: 08:00 - 08:45
  lessonsRepo.addLesson({
    group_id: group.id,
    day_of_week: dayOfWeek,
    start_time: '08:00',
    end_time: '08:45',
    subject: 'Matematika',
    teacher: 'Aziza opa',
    room: '204'
  });

  // 2-dars: 08:50 - 09:35
  lessonsRepo.addLesson({
    group_id: group.id,
    day_of_week: dayOfWeek,
    start_time: '08:50',
    end_time: '09:35',
    subject: 'Fizika',
    teacher: 'Botir aka',
    room: '301'
  });

  const res = scheduleService.getCurrentLesson(group.id);
  assert.ok(['ongoing', 'break', 'before_school', 'ended'].includes(res.status));
  assert.ok(res.formattedText);
});
