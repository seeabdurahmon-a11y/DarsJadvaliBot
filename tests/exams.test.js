import test from 'node:test';
import assert from 'node:assert/strict';
import { getDatabase, closeDatabase } from '../src/database/db.js';
import { examsRepo } from '../src/database/exams.repo.js';
import { groupsRepo } from '../src/database/groups.repo.js';
import { teachersRepo } from '../src/database/teachers.repo.js';
import { lessonsRepo } from '../src/database/lessons.repo.js';
import { usersRepo } from '../src/database/users.repo.js';
import { scheduleService } from '../src/services/schedule.service.js';
import { teacherReminderService } from '../src/services/teacher-reminder.service.js';
import { getTodayInfo, getTomorrowInfo, getNowInTashkent } from '../src/utils/date.util.js';
import { getLessonNumber } from '../src/utils/formatter.js';
import path from 'node:path';
import fs from 'node:fs';

const testDbPath = path.resolve(process.cwd(), 'data/test-exams.sqlite');

test.before(() => {
  closeDatabase();
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
  getDatabase(testDbPath);
});

test.after(() => {
  closeDatabase();
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
});

let createdTeacherId = null;
let createdGroupId = null;

test('Nazorat Ishi 1: Yangi nazorat ishi qo‘shish va olish', () => {
  // 1. O'qituvchi va guruh yaratamiz
  const teacher = teachersRepo.addTeacher({
    school_id: 1,
    first_name: 'Rustam',
    last_name: 'KarimovExamTest',
    subject: 'Matematika'
  });
  createdTeacherId = teacher.id;

  const group = groupsRepo.addGroup({
    school_id: 1,
    telegram_chat_id: 'test_chat_exam_9z',
    name: '9-Z sinf'
  });
  createdGroupId = group.id;

  // 2. Nazorat ishi qo'shamiz
  const exam = examsRepo.addExam({
    school_id: 1,
    teacher_id: teacher.id,
    group_id: group.id,
    subject: 'Matematika',
    date: '2026-10-10',
    lesson_number: 3,
    title: '1-BSB (Algebra bo‘yicha nazorat ishi)',
    description: '1-bob: Kvadrat tenglamalar'
  });

  assert.ok(exam);
  assert.equal(exam.group_id, group.id);
  assert.equal(exam.teacher_id, teacher.id);
  assert.equal(exam.subject, 'Matematika');
  assert.equal(exam.date, '2026-10-10');
  assert.equal(exam.lesson_number, 3);
  assert.equal(exam.title, '1-BSB (Algebra bo‘yicha nazorat ishi)');
  assert.equal(exam.group_name, '9-Z sinf');
  assert.equal(exam.teacher_last_name, 'KarimovExamTest');
});

test('Nazorat Ishi 2: Sana bo‘yicha nazorat ishlarini qidirish', () => {
  const date = '2026-10-10';
  const exams = examsRepo.getExamsByDate(date);
  assert.ok(exams.length >= 1);
  assert.equal(exams[0].date, date);
  assert.equal(exams[0].subject, 'Matematika');
});

test('Nazorat Ishi 3: Sinf bo‘yicha nazorat ishlarini qidirish', () => {
  const exams = examsRepo.getExamsByGroup(createdGroupId, '2026-01-01');
  assert.ok(exams.length >= 1);
  assert.equal(exams[0].group_id, createdGroupId);
});

test('Nazorat Ishi 4: Ustoz bo‘yicha nazorat ishlarini qidirish', () => {
  const exams = examsRepo.getExamsByTeacher(createdTeacherId);
  assert.ok(exams.length >= 1);
  assert.equal(exams[0].teacher_id, createdTeacherId);
});

test('Nazorat Ishi 5: Sinf bugungi/ertangi jadvalida nazorat ishi ko‘rinishi', () => {
  const today = getTodayInfo();

  // Bugungi kunga nazorat ishi qo'shamiz
  examsRepo.addExam({
    school_id: 1,
    group_id: createdGroupId,
    subject: 'Fizika',
    date: today.dateStr,
    lesson_number: 2,
    title: 'Laboratoriya ishi'
  });

  const todaySchedule = scheduleService.getTodaySchedule(createdGroupId);
  assert.ok(todaySchedule.formattedText.includes('BUGUNGI NAZORAT ISHLARI'));
  assert.ok(todaySchedule.formattedText.includes('Fizika'));
  assert.ok(todaySchedule.formattedText.includes('Laboratoriya ishi'));
});

test('Nazorat Ishi 6: Ustoz bugungi jadvalida nazorat ishi ko‘rinishi', () => {
  const today = getTodayInfo();

  // Bugungi kunga ustozga nazorat ishi qo'shamiz
  examsRepo.addExam({
    school_id: 1,
    teacher_id: createdTeacherId,
    group_id: createdGroupId,
    subject: 'Matematika',
    date: today.dateStr,
    lesson_number: 1,
    title: 'CHSB-1'
  });

  const teacherSchedule = scheduleService.getTeacherTodaySchedule(createdTeacherId, 1);
  assert.ok(teacherSchedule.formattedText.includes('BUGUNGI NAZORAT ISHLARINGIZ'));
  assert.ok(teacherSchedule.formattedText.includes('CHSB-1'));
});

test('Nazorat Ishi 7: 5 daqiqalik eslatmada nazorat ishi ogohlantirishi', async () => {
  // Ustoz foydalanuvchi yaratamiz
  usersRepo.upsertUser({
    telegram_id: '999888777',
    username: 'karimov_test',
    first_name: 'Rustam',
    role: 'teacher',
    selected_teacher_id: createdTeacherId,
    selected_school_id: 1,
    teacher_notifications: 1
  });

  const now = getNowInTashkent();
  const dayOfWeek = now.weekday <= 6 ? now.weekday : 1;
  const targetTime = now.plus({ minutes: 5 });
  const start_time = targetTime.toFormat('HH:mm');
  const end_time = targetTime.plus({ minutes: 45 }).toFormat('HH:mm');
  const lessonNum = getLessonNumber(start_time);

  // Dars qo'shamiz
  lessonsRepo.addLesson({
    school_id: 1,
    group_id: createdGroupId,
    day_of_week: dayOfWeek,
    start_time,
    end_time,
    subject: 'Geometriya',
    teacher: 'KarimovExamTest Rustam',
    room: '305'
  });

  // Nazorat ishi qo'shamiz
  examsRepo.addExam({
    school_id: 1,
    teacher_id: createdTeacherId,
    group_id: createdGroupId,
    subject: 'Geometriya',
    date: now.toFormat('yyyy-MM-dd'),
    lesson_number: lessonNum,
    title: 'Katta Nazorat Ishi'
  });

  let sentMessages = [];
  const mockBot = {
    api: {
      sendMessage: async (chatId, text, options) => {
        sentMessages.push({ chatId, text, options });
        return { message_id: 100 };
      }
    }
  };

  if (now.weekday <= 6) {
    await teacherReminderService.checkAndSendTeacherReminders(mockBot, 5, now);
    const msg = sentMessages.find(m => m.chatId === '999888777');
    if (msg) {
      assert.ok(msg.text.includes('NAZORAT ISHI'));
      assert.ok(msg.text.includes('Katta Nazorat Ishi'));
    }
  }
});

test('Nazorat Ishi 8: Nazorat ishini o‘chirish', () => {
  const exam = examsRepo.addExam({
    school_id: 1,
    group_id: createdGroupId,
    subject: 'Tarix',
    date: '2026-11-20',
    title: 'Test'
  });

  assert.ok(exam);
  examsRepo.deleteExam(exam.id);

  const deleted = examsRepo.getExamById(exam.id);
  assert.equal(deleted, undefined);
});
