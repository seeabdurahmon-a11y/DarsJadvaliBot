import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { getDatabase, closeDatabase } from '../src/database/db.js';
import { config, isAdmin } from '../src/config/index.js';
import { adminAuthService } from '../src/services/admin-auth.service.js';

const TEST_DB_PATH = path.resolve('data/test-admin-auth.sqlite');

test.before(() => {
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
  closeDatabase();
  getDatabase(TEST_DB_PATH);
  config.ADMIN_IDS = ['123456', '789012'];
  config.ADMIN_PASSWORD = 'secret_admin_pass';
  adminAuthService.clearAllSessions();
  adminAuthService.resetPasswordToEnv();
});

test.after(() => {
  closeDatabase();
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
});

test('Auth 1: Admin ID + to‘g‘ri parol bilan kirish mumkin', () => {
  const adminId = '123456';
  assert.equal(isAdmin(adminId), true);

  const isValid = adminAuthService.verifyPassword('secret_admin_pass');
  assert.equal(isValid, true);

  adminAuthService.recordSuccessfulLogin(adminId);
  assert.equal(adminAuthService.isAuthenticated(adminId), true);
});

test('Auth 2: Admin ID + noto‘g‘ri parol bilan kirish mumkin emas', () => {
  const isValid = adminAuthService.verifyPassword('wrong_pass_123');
  assert.equal(isValid, false);
});

test('Auth 3: Oddiy user admin sifatida qabul qilinmaydi', () => {
  const regularUserId = '999888';
  assert.equal(isAdmin(regularUserId), false);
  assert.equal(adminAuthService.isAuthenticated(regularUserId), false);
});

test('Auth 4: Session muddati tugaganda isAuthenticated false qaytaradi', () => {
  const adminId = '789012';
  // 100 millisekundlik qisqa sessiya yaratish
  adminAuthService.recordSuccessfulLogin(adminId, -1000); // allaqachon muddati o'tgan
  assert.equal(adminAuthService.isAuthenticated(adminId), false);
});

test('Auth 5: Logout sessionni bekor qiladi', () => {
  const adminId = '123456';
  adminAuthService.recordSuccessfulLogin(adminId);
  assert.equal(adminAuthService.isAuthenticated(adminId), true);

  adminAuthService.logout(adminId);
  assert.equal(adminAuthService.isAuthenticated(adminId), false);
});

test('Auth 6, 7 & 8: Parolni o‘zgartirish, yangi parol bilan kirish va eski parolni rad etish', () => {
  // Eski parol bilan o'zgartirish
  const changeRes = adminAuthService.changePassword('secret_admin_pass', 'new_super_secret_password');
  assert.equal(changeRes.success, true);

  // Yangi parol bilan tekshirish
  assert.equal(adminAuthService.verifyPassword('new_super_secret_password'), true);

  // Eski parol endi ishlamasligi kerak
  assert.equal(adminAuthService.verifyPassword('secret_admin_pass'), false);
});

test('Auth 9: 5 marta noto‘g‘ri paroldan keyin vaqtinchalik bloklanadi (Brute-force lockout)', () => {
  const adminId = '123456';
  adminAuthService.clearAllSessions();

  // 4 ta xato urinish
  for (let i = 0; i < 4; i++) {
    adminAuthService.recordFailedAttempt(adminId);
  }
  assert.equal(adminAuthService.checkLockout(adminId).isLocked, false);

  // 5-chi xato urinish -> bloklanadi
  adminAuthService.recordFailedAttempt(adminId);
  const lockout = adminAuthService.checkLockout(adminId);
  assert.equal(lockout.isLocked, true);
  assert.ok(lockout.remainingSeconds > 0);
});
