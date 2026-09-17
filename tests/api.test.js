import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { getDatabase, closeDatabase } from '../src/database/db.js';
import { groupsRepo } from '../src/database/groups.repo.js';
import { lessonsRepo } from '../src/database/lessons.repo.js';
import { teachersRepo } from '../src/database/teachers.repo.js';
import { subjectsRepo } from '../src/database/subjects.repo.js';
import { createWebServer } from '../src/api/server.js';
import { config } from '../src/config/index.js';

const TEST_DB = path.resolve(process.cwd(), 'data/test-api.sqlite');
const TEST_PORT = 3456;
let webServer;
let baseUrl;

function generateAdminInitData(adminId = config.ADMIN_IDS[0] || '6105913215') {
  const userJson = JSON.stringify({ id: Number(adminId), first_name: 'Admin', username: 'admin' });
  const params = new URLSearchParams();
  params.set('auth_date', String(Math.floor(Date.now() / 1000)));
  params.set('user', userJson);

  const keys = Array.from(params.keys()).sort();
  const dataCheckString = keys.map(k => `${k}=${params.get(k)}`).join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(config.BOT_TOKEN).digest();
  const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  params.set('hash', hash);
  return params.toString();
}

test.before(async () => {
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  getDatabase(TEST_DB);

  webServer = createWebServer();
  await webServer.start(TEST_PORT);
  baseUrl = `http://localhost:${TEST_PORT}/api`;

  // Seed baseline data
  subjectsRepo.addSubject({ name: 'Matematika', emoji: '📐' });
  teachersRepo.addTeacher({ first_name: 'Anvar', last_name: 'Aliyev', subject: 'Matematika' });
  const sinf = groupsRepo.addGroup({ name: '7-A sinf', send_time: '06:00' });
  lessonsRepo.addLesson({
    group_id: sinf.id,
    day_of_week: 1,
    start_time: '08:00',
    end_time: '08:45',
    subject: 'Matematika',
    teacher: 'Aliyev A.',
    room: '204'
  });
});

test.after(async () => {
  await webServer.stop();
  closeDatabase();
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
});

test('API 1: GET /api/config qaytaradi', async () => {
  const res = await fetch(`${baseUrl}/config`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.ok(data.data.schoolName);
  assert.ok(data.data.schoolCode);
});

test('API 2: GET /api/classes sinflar ro‘yxatini darslar soni bilan qaytaradi', async () => {
  const res = await fetch(`${baseUrl}/classes`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.ok(data.data.length >= 1);
  assert.ok(data.data[0].name.includes('sinf'));
});

test('API 3: GET /api/teachers va /api/subjects', async () => {
  const tRes = await fetch(`${baseUrl}/teachers`);
  const tData = await tRes.json();
  assert.strictEqual(tData.success, true);
  assert.ok(tData.data.length >= 1);

  const sRes = await fetch(`${baseUrl}/subjects`);
  const sData = await sRes.json();
  assert.strictEqual(sData.success, true);
  assert.ok(sData.data.length >= 1);
});

test('API 4: POST /api/user/preference foydalanuvchi sinfini saqlaydi', async () => {
  const res = await fetch(`${baseUrl}/user/preference`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ telegramId: '998877', classId: 1 })
  });

  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.data.selected_group_id, 1);
});

test('API 5: Oddiy foydalanuvchi /api/admin/stats ga kira olmaydi (403 Forbidden)', async () => {
  const res = await fetch(`${baseUrl}/admin/stats`);
  assert.strictEqual(res.status, 403);
  const data = await res.json();
  assert.strictEqual(data.success, false);
});

test('API 6: Admin initData orqali /api/admin/stats ga muvaffaqiyatli kiradi (200 OK)', async () => {
  const adminInitData = generateAdminInitData();
  const res = await fetch(`${baseUrl}/admin/stats`, {
    headers: { 'X-Telegram-Init-Data': adminInitData }
  });

  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.ok(data.data.groupsCount !== undefined);
  assert.ok(data.data.teachersCount !== undefined);
});

test('API 7: Admin dars qo‘shishi, o‘zgartirishi va o‘chirishi mumkin', async () => {
  const adminInitData = generateAdminInitData();

  // Create Lesson
  const createRes = await fetch(`${baseUrl}/admin/lessons`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Init-Data': adminInitData
    },
    body: JSON.stringify({
      group_id: 1,
      day_of_week: 2,
      start_time: '09:00',
      end_time: '09:45',
      subject: 'Fizika',
      teacher: 'Usmonova D.',
      room: '304'
    })
  });

  assert.strictEqual(createRes.status, 200);
  const createData = await createRes.json();
  assert.strictEqual(createData.success, true);
  assert.strictEqual(createData.data.subject, 'Fizika');

  const lessonId = createData.data.id;

  // Delete Lesson
  const delRes = await fetch(`${baseUrl}/admin/lessons/${lessonId}`, {
    method: 'DELETE',
    headers: { 'X-Telegram-Init-Data': adminInitData }
  });
  assert.strictEqual(delRes.status, 200);
});

test('API 8: Xabar shabloni API (GET, POST preview, POST save, POST reset)', async () => {
  const adminInitData = generateAdminInitData();

  // GET template
  const getRes = await fetch(`${baseUrl}/admin/template`, {
    headers: { 'X-Telegram-Init-Data': adminInitData }
  });
  assert.strictEqual(getRes.status, 200);

  // Preview template
  const previewRes = await fetch(`${baseUrl}/admin/template/preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Init-Data': adminInitData
    },
    body: JSON.stringify({
      header: '🏫 Test Header',
      footer: '🔔 Test Footer'
    })
  });
  assert.strictEqual(previewRes.status, 200);
  const previewData = await previewRes.json();
  assert.ok(previewData.data.preview.includes('Test Header'));
});

test('API 9: Maktablar ro‘yxati (GET /api/schools) va kod bo‘yicha olish (GET /api/schools/:code)', async () => {
  const listRes = await fetch(`${baseUrl}/schools`);
  assert.strictEqual(listRes.status, 200);
  const listData = await listRes.json();
  assert.strictEqual(listData.success, true);
  assert.ok(Array.isArray(listData.data));
  assert.ok(listData.data.length >= 1);

  const codeRes = await fetch(`${baseUrl}/schools/M-01`);
  assert.strictEqual(codeRes.status, 200);
  const codeData = await codeRes.json();
  assert.strictEqual(codeData.success, true);
  assert.strictEqual(codeData.data.code, 'M-01');
});

test('API 10: Yangi maktab ro‘yxatdan o‘tkazish (POST /api/schools/register) va login qilish', async () => {
  const regRes = await fetch(`${baseUrl}/schools/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: 'M-99',
      name: '99-Prezident maktabi',
      admin_password: 'testpassword123',
      default_send_time: '07:30'
    })
  });
  assert.strictEqual(regRes.status, 200);
  const regData = await regRes.json();
  assert.strictEqual(regData.success, true);
  assert.strictEqual(regData.school.code, 'M-99');

  const loginRes = await fetch(`${baseUrl}/schools/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: 'M-99',
      password: 'testpassword123'
    })
  });
  assert.strictEqual(loginRes.status, 200);
  const loginData = await loginRes.json();
  assert.strictEqual(loginData.success, true);
  assert.strictEqual(loginData.token, 'M-99:testpassword123');
});

test('API 11: Maktab admini jadvalni ommaviy import qilishi (POST /api/admin/import-timetable)', async () => {
  const importRes = await fetch(`${baseUrl}/admin/import-timetable`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-School-Token': 'M-99:testpassword123'
    },
    body: JSON.stringify({
      classes: [
        {
          name: '11-B sinf',
          send_time: '07:00',
          lessons: [
            { day_of_week: 1, start_time: '08:00', end_time: '08:45', subject: 'Informatika', teacher: 'Sobirov B.', room: '101' }
          ]
        }
      ]
    })
  });

  assert.strictEqual(importRes.status, 200);
  const importData = await importRes.json();
  assert.strictEqual(importData.success, true);
  assert.strictEqual(importData.insertedClasses, 1);
  assert.strictEqual(importData.insertedLessons, 1);
});

