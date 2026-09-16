import test from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import { validateTelegramInitData } from '../src/api/middlewares/telegramAuth.js';

const TEST_BOT_TOKEN = '123456789:ABCdefGHIjklMNOpqrsTUVwxyz';

function createValidInitData(userObj, authDate = Math.floor(Date.now() / 1000), botToken = TEST_BOT_TOKEN) {
  const userJson = JSON.stringify(userObj);
  const params = new URLSearchParams();
  params.set('auth_date', String(authDate));
  params.set('query_id', 'AAHdF6IQAAAAAN0XohDhrOrc');
  params.set('user', userJson);

  // Sort and build data_check_string
  const keys = Array.from(params.keys()).sort();
  const dataCheckString = keys.map(k => `${k}=${params.get(k)}`).join('\n');

  // Calculate HMAC
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  params.set('hash', hash);
  return params.toString();
}

test('Telegram Auth 1: To‘g‘ri initData HMAC imzosini muvaffaqiyatli tasdiqlaydi', () => {
  const user = { id: 6105913215, first_name: 'Abdurahmon', username: 'Abdur_51' };
  const validInitData = createValidInitData(user, 1726000000, TEST_BOT_TOKEN);

  const result = validateTelegramInitData(validInitData, TEST_BOT_TOKEN);
  assert.strictEqual(result.isValid, true);
  assert.ok(result.user);
  assert.strictEqual(result.user.id, 6105913215);
  assert.strictEqual(result.user.username, 'Abdur_51');
  assert.strictEqual(result.authDate, 1726000000);
});

test('Telegram Auth 2: O‘zgartirilgan (soxtalashtirilgan) ma\'lumotni rad etadi', () => {
  const user = { id: 6105913215, first_name: 'Abdurahmon' };
  const validInitData = createValidInitData(user, 1726000000, TEST_BOT_TOKEN);

  // Tamper with user ID
  const tamperedInitData = validInitData.replace('6105913215', '9999999999');
  const result = validateTelegramInitData(tamperedInitData, TEST_BOT_TOKEN);

  assert.strictEqual(result.isValid, false);
  assert.strictEqual(result.user, null);
});

test('Telegram Auth 3: Hash parametri yo‘q bo‘lsa rad etadi', () => {
  const result = validateTelegramInitData('user={"id":123}&auth_date=1726000000', TEST_BOT_TOKEN);
  assert.strictEqual(result.isValid, false);
});

test('Telegram Auth 4: Noto‘g‘ri bot token bilan tekshirilganda rad etadi', () => {
  const user = { id: 6105913215, first_name: 'Abdurahmon' };
  const validInitData = createValidInitData(user, 1726000000, TEST_BOT_TOKEN);

  const result = validateTelegramInitData(validInitData, 'DIFFERENT_BOT_TOKEN');
  assert.strictEqual(result.isValid, false);
});
