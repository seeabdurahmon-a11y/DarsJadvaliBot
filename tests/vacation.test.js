import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { getDatabase, closeDatabase } from '../src/database/db.js';
import { settingsRepo } from '../src/database/settings.repo.js';
import { groupsRepo } from '../src/database/groups.repo.js';
import { lessonsRepo } from '../src/database/lessons.repo.js';
import { teachersRepo } from '../src/database/teachers.repo.js';
import { vacationService } from '../src/services/vacation.service.js';
import { scheduleService } from '../src/services/schedule.service.js';
import { teacherReminderService } from '../src/services/teacher-reminder.service.js';
import { getTodayInfo } from '../src/utils/date.util.js';

const TEST_DB_PATH = path.resolve('data/test-vacation.sqlite');

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

test('Vacation 1: Odatiy holatda ta‘til o‘chirilgan bo‘ladi (ta‘tildan tashqari sanada)', () => {
  const info = vacationService.getVacationInfo(1, '2026-10-15');
  assert.equal(info.isActive, false);
  assert.equal(vacationService.isVacationActive(1, '2026-10-15'), false);
});

test('Vacation 2: Qo‘lda yoqish (manual on) ta‘tilni faollashtiradi', () => {
  vacationService.setVacation(1, { isActive: true, title: "Kuzgi ta'til" });
  const info = vacationService.getVacationInfo(1);

  assert.equal(info.isActive, true);
  assert.equal(info.title, "Kuzgi ta'til");
  assert.equal(vacationService.isVacationActive(1), true);

  // Qo'lda o'chirish
  vacationService.setVacation(1, { isActive: false });
  assert.equal(vacationService.isVacationActive(1), false);
});

test('Vacation 3: Sana oralig‘i bo‘yicha ta‘tilni aniqlash', () => {
  const today = getTodayInfo();
  const todayStr = today.dateStr; // e.g. "2026-11-03"

  // Bugungi sana oralig'ida bo'lgan ta'til
  vacationService.setVacation(1, {
    startDate: '2026-11-01',
    endDate: '2026-11-10',
    title: "Kuzgi ta'til",
    isActive: null // auto mode
  });

  assert.equal(vacationService.isVacationActive(1, '2026-11-03'), true);
  assert.equal(vacationService.isVacationActive(1, '2026-11-01'), true);
  assert.equal(vacationService.isVacationActive(1, '2026-11-10'), true);

  // Oraliqdan tashqaridagi sana
  assert.equal(vacationService.isVacationActive(1, '2026-10-31'), false);
  assert.equal(vacationService.isVacationActive(1, '2026-11-11'), false);
});

test('Vacation 4: parseDateRange turli xil sana formatlarini to‘g‘ri taniydi', () => {
  // Format: DD.MM-DD.MM Nomi
  const res1 = vacationService.parseDateRange("04.11-10.11 Kuzgi ta'til");
  assert.ok(res1);
  assert.equal(res1.startDate, '2026-11-04');
  assert.equal(res1.endDate, '2026-11-10');
  assert.equal(res1.title, "Kuzgi ta'til");

  // Format: YYYY-MM-DD YYYY-MM-DD Nomi
  const res2 = vacationService.parseDateRange("2026-12-28 2027-01-10 Qishki ta'til");
  assert.ok(res2);
  assert.equal(res2.startDate, '2026-12-28');
  assert.equal(res2.endDate, '2027-01-10');
  assert.equal(res2.title, "Qishki ta'til");

  // Format: DD.MM.YYYY - DD.MM.YYYY
  const res3 = vacationService.parseDateRange("21.03.2027 - 27.03.2027 Bahorgi ta'til");
  assert.ok(res3);
  assert.equal(res3.startDate, '2027-03-21');
  assert.equal(res3.endDate, '2027-03-27');
  assert.equal(res3.title, "Bahorgi ta'til");

  // Noto'g'ri matn
  const invalid = vacationService.parseDateRange("salom bu ta'til emas");
  assert.equal(invalid, null);
});

test('Vacation 5: Ta‘til xabari formatlanishi', () => {
  vacationService.setVacation(1, {
    startDate: '2026-11-04',
    endDate: '2026-11-10',
    title: "Kuzgi ta'til",
    message: "Darslar 11-noyabrdan boshlanadi",
    isActive: true
  });

  const text = vacationService.formatVacationText(1);
  assert.ok(text.includes('MAKTAB TA\'TILDA'));
  assert.ok(text.includes("Kuzgi ta'til"));
  assert.ok(text.includes('2026-11-04 — 2026-11-10'));
  assert.ok(text.includes('11-noyabrdan'));
});

test('Vacation 6: Ta‘tilda scheduleService darslar o‘rniga ta‘til xabarini qaytaradi', () => {
  // Sinif va dars yaratish
  const grp = groupsRepo.addGroup({ name: '8-V', school_id: 1 });
  lessonsRepo.addLesson({
    school_id: 1,
    group_id: grp.id,
    day_of_week: getTodayInfo().dayOfWeek,
    start_time: '08:00',
    end_time: '08:45',
    subject: 'Matematika'
  });

  // 1. Ta'til faol bo'lganda
  vacationService.setVacation(1, { isActive: true, title: "Kuzgi ta'til" });
  const vacationSched = scheduleService.getTodaySchedule(grp.id, 1);
  assert.equal(vacationSched.isVacation, true);
  assert.ok(vacationSched.formattedText.includes('MAKTAB TA\'TILDA'));

  // 2. Ta'til o'chirilganda
  vacationService.setVacation(1, { isActive: false });
  const normalSched = scheduleService.getTodaySchedule(grp.id, 1);
  assert.equal(normalSched.isVacation, undefined);
  assert.ok(normalSched.formattedText.includes('Matematika'));
});

test('Vacation 7: Ta‘tilda ustozlarga eslatma jo‘natilmaydi (0 sent)', async () => {
  // Ustoz yaratish
  const teacher = teachersRepo.addTeacher({
    school_id: 1,
    first_name: 'Sabina',
    last_name: 'Karimova',
    subject: 'Fizika'
  });

  // Ta'tilni yoqamiz
  vacationService.setVacation(1, { isActive: true });

  const mockBot = {
    api: {
      sendMessage: async () => { throw new Error('Ta‘tilda eslatma yuborilmasligi kerak!'); }
    }
  };

  const sent = await teacherReminderService.checkAndSendTeacherReminders(mockBot, 5);
  assert.equal(sent, 0); // Ta'tilda bo'lgani sababli eslatma yuborilmadi!
});
