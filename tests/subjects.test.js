import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { getDatabase, closeDatabase } from '../src/database/db.js';
import { subjectsRepo } from '../src/database/subjects.repo.js';

const TEST_DB = path.resolve(process.cwd(), 'data/test-subjects.sqlite');

test.before(() => {
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  getDatabase(TEST_DB);
});

test.after(() => {
  closeDatabase();
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
});

test('Subjects Repo 1: Fan qo‘shish va avtomatik emoji biriktirish', () => {
  const sub = subjectsRepo.addSubject({ name: 'Matematika' });
  assert.ok(sub);
  assert.strictEqual(sub.name, 'Matematika');
  assert.strictEqual(sub.emoji, '📐');

  const fizika = subjectsRepo.addSubject({ name: 'Fizika' });
  assert.strictEqual(fizika.emoji, '⚡');
});

test('Subjects Repo 2: Nom bo‘yicha fan qidirish (case-insensitive)', () => {
  subjectsRepo.addSubject({ name: 'Kimyo', emoji: '🧪' });
  const found = subjectsRepo.getSubjectByName('kimyo');
  assert.ok(found);
  assert.strictEqual(found.name, 'Kimyo');
  assert.strictEqual(found.emoji, '🧪');
});

test('Subjects Repo 3: Fanni o‘chirish', () => {
  const sub = subjectsRepo.addSubject({ name: 'Astronomiya' });
  const countBefore = subjectsRepo.getSubjectsCount();
  subjectsRepo.deleteSubject(sub.id);
  const countAfter = subjectsRepo.getSubjectsCount();

  assert.strictEqual(countAfter, countBefore - 1);
});
