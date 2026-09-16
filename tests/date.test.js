import test from 'node:test';
import assert from 'node:assert/strict';
import { getNowInTashkent, getTodayInfo, getTomorrowInfo, isValidTimeFormat, formatDateUz } from '../src/utils/date.util.js';
import { DateTime } from 'luxon';

test('Date utils: getNowInTashkent returns DateTime in Asia/Tashkent', () => {
  const dt = getNowInTashkent();
  assert.ok(dt.isValid);
  assert.equal(dt.zoneName, 'Asia/Tashkent');
});

test('Date utils: getTodayInfo and getTomorrowInfo calculate correctly', () => {
  const today = getTodayInfo();
  const tomorrow = getTomorrowInfo();

  assert.ok(today.dayOfWeek >= 1 && today.dayOfWeek <= 7);
  assert.ok(today.dateStr.match(/^\d{4}-\d{2}-\d{2}$/));
  assert.ok(today.timeStr.match(/^\d{2}:\d{2}$/));
  assert.ok(today.formattedDate.length > 5);

  // Tomorrow should be (today + 1 day)
  const expectedTomorrowDay = (today.dayOfWeek % 7) + 1;
  assert.equal(tomorrow.dayOfWeek, expectedTomorrowDay);
});

test('Date utils: isValidTimeFormat validates HH:mm format correctly', () => {
  assert.equal(isValidTimeFormat('06:00'), true);
  assert.equal(isValidTimeFormat('23:59'), true);
  assert.equal(isValidTimeFormat('00:00'), true);
  assert.equal(isValidTimeFormat('14:30'), true);

  assert.equal(isValidTimeFormat('24:00'), false);
  assert.equal(isValidTimeFormat('6:00'), false);
  assert.equal(isValidTimeFormat('06:60'), false);
  assert.equal(isValidTimeFormat('invalid'), false);
  assert.equal(isValidTimeFormat(''), false);
});
