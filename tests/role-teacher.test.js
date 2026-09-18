import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { getDatabase, closeDatabase } from '../src/database/db.js';
import { usersRepo } from '../src/database/users.repo.js';
import { teachersRepo } from '../src/database/teachers.repo.js';
import { groupsRepo } from '../src/database/groups.repo.js';
import { lessonsRepo } from '../src/database/lessons.repo.js';
import { scheduleService } from '../src/services/schedule.service.js';

const TEST_DB = path.resolve(process.cwd(), 'data/test-roles.sqlite');

test.before(() => {
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  getDatabase(TEST_DB);
});

test.after(() => {
  closeDatabase();
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
});

test('Role & Teacher 1: O‘quvchi rolini tanlash va sinf biriktirish', () => {
  const telegramId = '100000001';
  usersRepo.upsertUser({ telegram_id: telegramId, first_name: 'Sardor' });
  
  usersRepo.setRole(telegramId, 'student');
  let user = usersRepo.getUserByTelegramId(telegramId);
  assert.strictEqual(user.role, 'student');

  const group = groupsRepo.addGroup({ name: '10-A sinf' });
  usersRepo.setSelectedGroup(telegramId, group.id);

  user = usersRepo.getUserByTelegramId(telegramId);
  assert.strictEqual(user.selected_group_id, group.id);
  assert.strictEqual(user.selected_group_name, '10-A sinf');
});

test('Role & Teacher 2: Ustoz rolini tanlash va bir marta tanlab qulflash (Locking)', () => {
  const telegramId = '200000002';
  const teacher = teachersRepo.addTeacher({
    first_name: 'Dilshod',
    last_name: 'Umarov',
    subject: 'Fizika'
  });

  usersRepo.setSelectedTeacher(telegramId, teacher.id, true);
  const user = usersRepo.getUserByTelegramId(telegramId);

  assert.strictEqual(user.role, 'teacher');
  assert.strictEqual(user.selected_teacher_id, teacher.id);
  assert.strictEqual(user.is_role_locked, 1);
  assert.strictEqual(user.teacher_last_name, 'Umarov');
  assert.strictEqual(user.teacher_subject, 'Fizika');
});

test('Role & Teacher 3: Ustoz dars jadvali (Bugun, Ertaga, Hafta, Qaysi sinflarda darsi borligi)', () => {
  const teacher = teachersRepo.addTeacher({
    first_name: 'Ziyodaxon',
    last_name: 'NazarovaUnique',
    subject: 'Kimyo'
  });

  const grp1 = groupsRepo.addGroup({ name: '9-B sinf' });
  const grp2 = groupsRepo.addGroup({ name: '11-A sinf' });

  // Add lessons on day 1 (Dushanba)
  lessonsRepo.addLesson({
    group_id: grp1.id,
    day_of_week: 1,
    start_time: '08:30',
    end_time: '09:15',
    subject: 'Kimyo',
    teacher: 'NazarovaUnique Z.',
    room: '302'
  });

  lessonsRepo.addLesson({
    group_id: grp2.id,
    day_of_week: 1,
    start_time: '09:20',
    end_time: '10:05',
    subject: 'Kimyo',
    teacher: 'NazarovaUnique',
    room: '302'
  });

  const dayLessons = teachersRepo.getTeacherLessonsByDay(teacher.id, 1);
  assert.strictEqual(dayLessons.length, 2);
  assert.strictEqual(dayLessons[0].group_name, '9-B sinf');
  assert.strictEqual(dayLessons[1].group_name, '11-A sinf');

  const weekly = scheduleService.getTeacherWeeklySchedule(teacher.id);
  assert.ok(weekly.formattedText.includes('9-B sinf'));
  assert.ok(weekly.formattedText.includes('11-A sinf'));
  assert.ok(weekly.formattedText.includes('Kimyo'));
});

test('Role & Teacher 4: /adminchiqarish orqali qulflangan ustoz/o‘quvchini bo‘shatish', () => {
  const telegramId = '300000003';
  const teacher = teachersRepo.addTeacher({
    first_name: 'Sanjar',
    last_name: 'Ahmedov',
    subject: 'Tarix'
  });

  usersRepo.setSelectedTeacher(telegramId, teacher.id, true);
  let user = usersRepo.getUserByTelegramId(telegramId);
  assert.strictEqual(user.is_role_locked, 1);
  assert.strictEqual(user.role, 'teacher');

  // Admin releases user role
  usersRepo.releaseUserRole(telegramId);
  user = usersRepo.getUserByTelegramId(telegramId);

  assert.strictEqual(user.role, null);
  assert.strictEqual(user.selected_teacher_id, null);
  assert.strictEqual(user.selected_group_id, null);
  assert.strictEqual(user.is_role_locked, 0);
});
