import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { getDatabase, closeDatabase } from '../src/database/db.js';
import { usersRepo } from '../src/database/users.repo.js';
import { teachersRepo } from '../src/database/teachers.repo.js';
import { groupsRepo } from '../src/database/groups.repo.js';
import { lessonsRepo } from '../src/database/lessons.repo.js';
import { settingsRepo } from '../src/database/settings.repo.js';
import { teacherReminderService } from '../src/services/teacher-reminder.service.js';
import { getNowInTashkent } from '../src/utils/date.util.js';

const TEST_DB = path.resolve(process.cwd(), 'data/test-reminders.sqlite');

test.before(() => {
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  getDatabase(TEST_DB);
});

test.after(() => {
  closeDatabase();
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
});

test('Teacher Reminder 1: Dars boshlanishidan 5 daqiqa oldin eslatma yuborish', async () => {
  const telegramId = '777000111';
  const teacher = teachersRepo.addTeacher({
    first_name: 'Fotimaxon',
    last_name: 'SaidovaReminderTest',
    subject: 'Biologiya'
  });

  usersRepo.setSelectedTeacher(telegramId, teacher.id, true);
  const group = groupsRepo.addGroup({ name: '8-B sinf' });

  const now = getNowInTashkent();
  const testNow = now.weekday > 6 ? now.set({ weekday: 1 }) : now;
  const dayOfWeek = testNow.weekday; // Dushanba - Shanba
  const targetStartTime = testNow.plus({ minutes: 5 }).toFormat('HH:mm');
  const targetEndTime = testNow.plus({ minutes: 50 }).toFormat('HH:mm');

  const lesson = lessonsRepo.addLesson({
    group_id: group.id,
    day_of_week: dayOfWeek,
    start_time: targetStartTime,
    end_time: targetEndTime,
    subject: 'Biologiya',
    teacher: 'SaidovaReminderTest F.',
    room: '108'
  });

  const sentMessages = [];
  const mockBot = {
    api: {
      sendMessage: async (chatId, text, options) => {
        sentMessages.push({ chatId, text, options });
      }
    }
  };

  const sentCount = await teacherReminderService.checkAndSendTeacherReminders(mockBot, 5, testNow);
  assert.strictEqual(sentCount, 1);
  assert.strictEqual(sentMessages.length, 1);
  assert.strictEqual(sentMessages[0].chatId, telegramId);
  assert.ok(sentMessages[0].text.includes('8-B sinf'));
  assert.ok(sentMessages[0].text.includes('Biologiya'));
  assert.ok(sentMessages[0].text.includes('108-xona'));
  assert.ok(sentMessages[0].text.includes('5 daqiqadan so‘ng'));

  // Qayta chaqirilganda duplicate (takroriy) yuborilmasligi kerak
  const secondCount = await teacherReminderService.checkAndSendTeacherReminders(mockBot, 5, testNow);
  assert.strictEqual(secondCount, 0);
  assert.strictEqual(sentMessages.length, 1);
});

test('Teacher Reminder 2: Ustoz bildirishnomalarni o‘chirganda eslatma yuborilmasligi', async () => {
  const telegramId = '888000222';
  const teacher = teachersRepo.addTeacher({
    first_name: 'Ravshan',
    last_name: 'SobirovReminderOffTest',
    subject: 'Geografiya'
  });

  usersRepo.setSelectedTeacher(telegramId, teacher.id, true);
  // O'chirib qo'yamiz
  usersRepo.setTeacherNotifications(telegramId, 0);

  const group = groupsRepo.addGroup({ name: '10-G sinf' });
  const now = getNowInTashkent();
  const testNow = now.weekday > 6 ? now.set({ weekday: 1 }) : now;
  const dayOfWeek = testNow.weekday;
  const targetStartTime = testNow.plus({ minutes: 5 }).toFormat('HH:mm');

  lessonsRepo.addLesson({
    group_id: group.id,
    day_of_week: dayOfWeek,
    start_time: targetStartTime,
    end_time: '12:00',
    subject: 'Geografiya',
    teacher: 'SobirovReminderOffTest R.',
    room: '202'
  });

  const sentMessages = [];
  const mockBot = {
    api: {
      sendMessage: async (chatId, text) => {
        sentMessages.push({ chatId, text });
      }
    }
  };

  const sentCount = await teacherReminderService.checkAndSendTeacherReminders(mockBot, 5, testNow);
  assert.strictEqual(sentCount, 0);
  assert.strictEqual(sentMessages.length, 0);
});
