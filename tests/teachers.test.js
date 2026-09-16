import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { getDatabase, closeDatabase } from '../src/database/db.js';
import { teachersRepo } from '../src/database/teachers.repo.js';
import { groupsRepo } from '../src/database/groups.repo.js';
import { lessonsRepo } from '../src/database/lessons.repo.js';

const TEST_DB = path.resolve(process.cwd(), 'data/test-teachers.sqlite');

test.before(() => {
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  getDatabase(TEST_DB);
});

test.after(() => {
  closeDatabase();
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
});

test('Teachers Repo 1: O‘qituvchi qo‘shish va ID orqali olish', () => {
  const teacher = teachersRepo.addTeacher({
    first_name: 'Anvar',
    last_name: 'Aliyev',
    subject: 'Matematika',
    phone: '+998901234567'
  });

  assert.ok(teacher);
  assert.strictEqual(teacher.first_name, 'Anvar');
  assert.strictEqual(teacher.last_name, 'Aliyev');
  assert.strictEqual(teacher.subject, 'Matematika');

  const found = teachersRepo.getTeacherById(teacher.id);
  assert.strictEqual(found.first_name, 'Anvar');
});

test('Teachers Repo 2: O‘qituvchini tahrirlash', () => {
  const teacher = teachersRepo.addTeacher({
    first_name: 'Munira',
    last_name: 'Karimova',
    subject: 'Ona tili'
  });

  const updated = teachersRepo.updateTeacher(teacher.id, {
    first_name: 'Muniraxon',
    last_name: 'Karimova',
    subject: 'Ona tili va Adabiyot',
    phone: '+998912345678'
  });

  assert.strictEqual(updated.first_name, 'Muniraxon');
  assert.strictEqual(updated.subject, 'Ona tili va Adabiyot');
  assert.strictEqual(updated.phone, '+998912345678');
});

test('Teachers Repo 3: O‘qituvchi dars jadvalini qidirish', () => {
  const group = groupsRepo.addGroup({ name: '7-A sinf' });
  lessonsRepo.addLesson({
    group_id: group.id,
    day_of_week: 1,
    start_time: '08:00',
    end_time: '08:45',
    subject: 'Matematika',
    teacher: 'Aliyev A.',
    room: '204'
  });

  const schedule = teachersRepo.getTeacherSchedule('Aliyev');
  assert.ok(schedule.length >= 1);
  assert.strictEqual(schedule[0].subject, 'Matematika');
  assert.strictEqual(schedule[0].group_name, '7-A sinf');
});

test('Teachers Repo 4: O‘qituvchini o‘chirish', () => {
  const teacher = teachersRepo.addTeacher({
    first_name: 'Botir',
    last_name: 'Rasulov'
  });

  const countBefore = teachersRepo.getTeachersCount();
  teachersRepo.deleteTeacher(teacher.id);
  const countAfter = teachersRepo.getTeachersCount();

  assert.strictEqual(countAfter, countBefore - 1);
  assert.strictEqual(teachersRepo.getTeacherById(teacher.id), undefined);
});
