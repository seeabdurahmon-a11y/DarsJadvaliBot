import test from 'node:test';
import assert from 'node:assert/strict';
import { splitTelegramMessage } from '../src/utils/telegram-sender.util.js';

test('Telegram Sender: Matn 3900 belgidan qisqa bo‘lsa bo‘linmaydi', () => {
  const shortText = 'Salom, bu test xabari!';
  const chunks = splitTelegramMessage(shortText, 3900);
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0], shortText);
});

test('Telegram Sender: Uzun matn xavfsiz bo‘laklarga ajratiladi', () => {
  const paragraph1 = 'A'.repeat(2500);
  const paragraph2 = 'B'.repeat(2000);
  const fullText = `${paragraph1}\n\n${paragraph2}`;

  const chunks = splitTelegramMessage(fullText, 3000);
  assert.equal(chunks.length, 2);
  assert.equal(chunks[0], paragraph1);
  assert.equal(chunks[1], paragraph2);
});

test('Telegram Sender: Bo‘sh yoki noto‘g‘ri matn xato bermaydi', () => {
  assert.deepEqual(splitTelegramMessage(''), []);
  assert.deepEqual(splitTelegramMessage(null), []);
  assert.deepEqual(splitTelegramMessage(undefined), []);
});
