import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { getDatabase, closeDatabase } from '../src/database/db.js';
import { groupsRepo } from '../src/database/groups.repo.js';
import { lessonsRepo } from '../src/database/lessons.repo.js';
import { usersRepo } from '../src/database/users.repo.js';
import { settingsRepo } from '../src/database/settings.repo.js';

const TEST_DB_PATH = path.resolve('data/test-bot.sqlite');

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

test('Database: groupsRepo can add, find, update and delete groups', () => {
  const group = groupsRepo.addGroup({
    telegram_chat_id: '-100123456789',
    name: 'Beginner 1',
    send_time: '06:00'
  });

  assert.ok(group.id);
  assert.equal(group.name, 'Beginner 1');
  assert.equal(group.telegram_chat_id, '-100123456789');
  assert.equal(group.send_time, '06:00');

  // Find
  const found = groupsRepo.getGroupByChatId('-100123456789');
  assert.equal(found.id, group.id);

  // Update send_time
  groupsRepo.setGroupSendTime(group.id, '07:30');
  const updated = groupsRepo.getGroupById(group.id);
  assert.equal(updated.send_time, '07:30');

  // Count
  assert.equal(groupsRepo.getGroupsCount(), 1);
});

test('Database: lessonsRepo can add, query by day and week, and delete lessons', () => {
  const group = groupsRepo.getGroupByChatId('-100123456789');

  const lesson1 = lessonsRepo.addLesson({
    group_id: group.id,
    day_of_week: 1, // Dushanba
    start_time: '09:00',
    end_time: '10:00',
    subject: 'English',
    teacher: 'Ali',
    room: '101'
  });

  const lesson2 = lessonsRepo.addLesson({
    group_id: group.id,
    day_of_week: 1, // Dushanba
    start_time: '10:15',
    end_time: '11:15',
    subject: 'Russian',
    teacher: 'Valentina',
    room: '102'
  });

  assert.ok(lesson1.id);
  assert.ok(lesson2.id);

  // Query by day
  const mondayLessons = lessonsRepo.getLessonsByDay(1, group.id);
  assert.equal(mondayLessons.length, 2);
  assert.equal(mondayLessons[0].subject, 'English');
  assert.equal(mondayLessons[1].subject, 'Russian');

  // Query weekly
  const weekly = lessonsRepo.getWeeklyLessons(group.id);
  assert.equal(weekly.length, 2);

  // Update lesson
  lessonsRepo.updateLesson(lesson1.id, { room: '205' });
  const updated = lessonsRepo.getLessonById(lesson1.id);
  assert.equal(updated.room, '205');

  // Delete lesson
  lessonsRepo.deleteLesson(lesson2.id);
  const remaining = lessonsRepo.getLessonsByDay(1, group.id);
  assert.equal(remaining.length, 1);
});

test('Database: usersRepo upserts users and counts correctly', () => {
  usersRepo.upsertUser({
    telegram_id: '999888777',
    username: 'testuser',
    first_name: 'Test',
    is_admin: 0
  });

  const user = usersRepo.getUserByTelegramId('999888777');
  assert.ok(user);
  assert.equal(user.username, 'testuser');
  assert.equal(user.first_name, 'Test');
});

test('Database: settingsRepo handles duplicate prevention correctly', () => {
  const group = groupsRepo.getGroupByChatId('-100123456789');
  const dateStr = '2026-09-15';

  // Initially not sent
  assert.equal(settingsRepo.isScheduleAlreadySent(group.id, dateStr), false);

  // Record sent
  settingsRepo.recordSentSchedule(group.id, dateStr);

  // Now it is recorded
  assert.equal(settingsRepo.isScheduleAlreadySent(group.id, dateStr), true);
  assert.equal(settingsRepo.getSentCountToday(dateStr), 1);
});
