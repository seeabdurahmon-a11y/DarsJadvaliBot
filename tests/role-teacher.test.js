import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { getDatabase, closeDatabase } from '../src/database/db.js';
import { usersRepo } from '../src/database/users.repo.js';
import { teachersRepo } from '../src/database/teachers.repo.js';
import { schoolsRepo } from '../src/database/schools.repo.js';
import { groupsRepo } from '../src/database/groups.repo.js';
import { lessonsRepo } from '../src/database/lessons.repo.js';
import { scheduleService } from '../src/services/schedule.service.js';
import { adminAuthService } from '../src/services/admin-auth.service.js';

const TEST_DB = path.resolve(process.cwd(), 'data/test-roles.sqlite');

test.before(() => {
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  getDatabase(TEST_DB);
});

test.after(() => {
  closeDatabase();
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
});

test('Role & Teacher 1: O‘quvchi rolini tanlash va sinf biriktirish hamda qulflash', () => {
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
  assert.strictEqual(user.is_role_locked, 1);
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

test('Role & Teacher 5: Zavuch maxsus kodi orqali autentifikatsiya va to‘g‘ridan-to‘g‘ri adminlik', () => {
  const zavuchId = '400000004';
  
  // 1. Zavuch kodini tekshirish
  const resValid = adminAuthService.verifyZavuchCode('admin123');
  assert.strictEqual(resValid.isValid, true);
  assert.ok(resValid.school);

  const resInvalid = adminAuthService.verifyZavuchCode('not_a_valid_code');
  assert.strictEqual(resInvalid.isValid, false);

  // 2. Foydalanuvchini Zavuch sifatida saqlash
  usersRepo.upsertUser({
    telegram_id: zavuchId,
    first_name: 'Bosh Zavuch',
    is_admin: 1,
    role: 'zavuch',
    selected_school_id: resValid.school.id,
    is_role_locked: 1
  });

  const zavuchUser = usersRepo.getUserByTelegramId(zavuchId);
  assert.strictEqual(zavuchUser.is_admin, 1);
  assert.strictEqual(zavuchUser.role, 'zavuch');
  assert.strictEqual(zavuchUser.is_role_locked, 1);
  assert.strictEqual(adminAuthService.isUserAdmin(zavuchId), true);
});

test('Role & Teacher 7: Ko‘p maktabli tizimda maktabni almashtirish va profilni tozalash', () => {
  const telegramId = '600000006';
  const school1 = schoolsRepo.getSchoolById(1);
  const school2 = schoolsRepo.addSchool({ code: 'M-02', name: '2-umumiy o‘rta ta’lim maktabi' });

  const teacher1 = teachersRepo.addTeacher({ school_id: school1.id, first_name: 'Anvar', last_name: 'Qodirov', subject: 'Informatika' });
  const teacher2 = teachersRepo.addTeacher({ school_id: school2.id, first_name: 'Bobur', last_name: 'Salimov', subject: 'Fizika' });

  // 1. Dastlab 1-maktab ustozini tanladi
  usersRepo.setSelectedSchool(telegramId, school1.id);
  usersRepo.setSelectedTeacher(telegramId, teacher1.id, true);

  let user = usersRepo.getUserByTelegramId(telegramId);
  assert.strictEqual(user.selected_school_id, school1.id);
  assert.strictEqual(user.selected_teacher_id, teacher1.id);
  assert.strictEqual(user.teacher_last_name, 'Qodirov');

  // 2. Foydalanuvchi maktabni 2-maktabga almashtirdi (/kod M-02 yoki /reset orqali)
  usersRepo.releaseUserRole(telegramId);
  usersRepo.setSelectedSchool(telegramId, school2.id);

  user = usersRepo.getUserByTelegramId(telegramId);
  assert.strictEqual(user.selected_school_id, school2.id);
  assert.strictEqual(user.role, null);
  assert.strictEqual(user.selected_teacher_id, null);
  assert.strictEqual(user.is_role_locked, 0);

  // 3. 2-maktab ustozini tanladi
  usersRepo.setSelectedTeacher(telegramId, teacher2.id, true);
  user = usersRepo.getUserByTelegramId(telegramId);

  assert.strictEqual(user.selected_school_id, school2.id);
  assert.strictEqual(user.selected_teacher_id, teacher2.id);
  assert.strictEqual(user.teacher_last_name, 'Salimov');
  assert.strictEqual(user.is_role_locked, 1);
});


