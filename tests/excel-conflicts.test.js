import test from 'node:test';
import assert from 'node:assert/strict';
import { getDatabase, closeDatabase } from '../src/database/db.js';
import { lessonsRepo } from '../src/database/lessons.repo.js';
import { groupsRepo } from '../src/database/groups.repo.js';
import { schoolsRepo } from '../src/database/schools.repo.js';
import fs from 'node:fs';
import path from 'node:path';

const TEST_DB = path.resolve(process.cwd(), 'data/test-excel-conflicts.sqlite');

function setupTestDb() {
  if (fs.existsSync(TEST_DB)) {
    try { fs.unlinkSync(TEST_DB); } catch (e) {}
  }
  process.env.DB_PATH = TEST_DB;
  const db = getDatabase(TEST_DB);
  // Clear lessons for clean isolated testing
  db.prepare('DELETE FROM lessons').run();
  return db;
}

test('Excel & Conflicts 1: detectTeacherConflicts detects when a teacher is assigned to 2 classes at the same time', () => {
  setupTestDb();

  const school = schoolsRepo.getSchoolById(1) || schoolsRepo.addSchool({
    name: '32-maktab',
    code: '32-MAKTAB',
    admin_name: 'Zavuch Test'
  });

  const groupA = groupsRepo.addGroup({ school_id: school.id, name: '5-A sinf' });
  const groupB = groupsRepo.addGroup({ school_id: school.id, name: '6-B sinf' });

  // Add lesson in 5-A: Dushanba 1-soat, Matematika, Aliyev Rustam
  lessonsRepo.addLesson({
    school_id: school.id,
    group_id: groupA.id,
    day_of_week: 1,
    start_time: '08:00',
    end_time: '08:45',
    subject: 'Matematika',
    teacher: 'Aliyev Rustam'
  });

  // Add lesson in 6-B: Dushanba 1-soat, Fizika, Aliyev Rustam (CLASH!)
  lessonsRepo.addLesson({
    school_id: school.id,
    group_id: groupB.id,
    day_of_week: 1,
    start_time: '08:00',
    end_time: '08:45',
    subject: 'Fizika',
    teacher: 'Aliyev Rustam'
  });

  const conflicts = lessonsRepo.detectTeacherConflicts(school.id);
  assert.equal(conflicts.length, 1, 'Bitta to‘qnashuv aniqlanishi kerak');
  assert.equal(conflicts[0].teacher, 'Aliyev Rustam');
  assert.equal(conflicts[0].day_of_week, 1);
  assert.equal(conflicts[0].classes.length, 2);

  closeDatabase();
});

test('Excel & Conflicts 2: detectTeacherConflicts does not flag when lessons are at different times', () => {
  setupTestDb();

  const school = schoolsRepo.getSchoolById(1) || schoolsRepo.addSchool({ name: '32-maktab', code: '32-MAKTAB' });
  const groupA = groupsRepo.addGroup({ school_id: school.id, name: '5-A sinf' });
  const groupB = groupsRepo.addGroup({ school_id: school.id, name: '6-B sinf' });

  // 5-A: Dushanba 1-soat (08:00 - 08:45)
  lessonsRepo.addLesson({
    school_id: school.id,
    group_id: groupA.id,
    day_of_week: 1,
    start_time: '08:00',
    end_time: '08:45',
    subject: 'Matematika',
    teacher: 'Karimova Dilnoza'
  });

  // 6-B: Dushanba 2-soat (08:50 - 09:35) -> No clash
  lessonsRepo.addLesson({
    school_id: school.id,
    group_id: groupB.id,
    day_of_week: 1,
    start_time: '08:50',
    end_time: '09:35',
    subject: 'Matematika',
    teacher: 'Karimova Dilnoza'
  });

  const conflicts = lessonsRepo.detectTeacherConflicts(school.id);
  assert.equal(conflicts.length, 0, 'Turli vaqtlarda to‘qnashuv bo‘lmasligi kerak');

  closeDatabase();
});

test('Excel & Conflicts 3: deleteLessonsByGroupId cleans previous lessons before replacing', () => {
  setupTestDb();

  const school = schoolsRepo.getSchoolById(1) || schoolsRepo.addSchool({ name: '32-maktab', code: '32-MAKTAB' });
  const groupA = groupsRepo.addGroup({ school_id: school.id, name: '5-A sinf' });

  lessonsRepo.addLesson({
    school_id: school.id,
    group_id: groupA.id,
    day_of_week: 1,
    start_time: '08:00',
    end_time: '08:45',
    subject: 'Matematika',
    teacher: 'Aliyev'
  });

  assert.equal(lessonsRepo.getAllLessons(groupA.id, school.id).length, 1);
  lessonsRepo.deleteLessonsByGroupId(groupA.id);
  assert.equal(lessonsRepo.getAllLessons(groupA.id, school.id).length, 0);

  closeDatabase();
});

test('Excel & Conflicts 4: swapLessons correctly exchanges subject, teacher, and room between 2 lessons', () => {
  setupTestDb();

  const school = schoolsRepo.getSchoolById(1) || schoolsRepo.addSchool({ name: '32-maktab', code: '32-MAKTAB' });
  const groupA = groupsRepo.addGroup({ school_id: school.id, name: '5-A sinf' });

  const l1 = lessonsRepo.addLesson({
    school_id: school.id,
    group_id: groupA.id,
    day_of_week: 1,
    start_time: '08:00',
    end_time: '08:45',
    subject: 'Matematika',
    teacher: 'Aliyev',
    room: '101'
  });

  const l2 = lessonsRepo.addLesson({
    school_id: school.id,
    group_id: groupA.id,
    day_of_week: 1,
    start_time: '08:50',
    end_time: '09:35',
    subject: 'Fizika',
    teacher: 'Karimov',
    room: '202'
  });

  const swapped = lessonsRepo.swapLessons(l1.id, l2.id);
  assert.equal(swapped.lessonA.subject, 'Fizika');
  assert.equal(swapped.lessonA.teacher, 'Karimov');
  assert.equal(swapped.lessonA.room, '202');

  assert.equal(swapped.lessonB.subject, 'Matematika');
  assert.equal(swapped.lessonB.teacher, 'Aliyev');
  assert.equal(swapped.lessonB.room, '101');

  closeDatabase();
});
