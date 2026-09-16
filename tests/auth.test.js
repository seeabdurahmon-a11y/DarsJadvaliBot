import test from 'node:test';
import assert from 'node:assert/strict';
import { isAdmin, config, validateConfig } from '../src/config/index.js';

test('Auth: isAdmin checks configured IDs correctly', () => {
  config.ADMIN_IDS = ['123456', '789012'];

  assert.equal(isAdmin('123456'), true);
  assert.equal(isAdmin(123456), true);
  assert.equal(isAdmin('789012'), true);
  assert.equal(isAdmin('999999'), false);
  assert.equal(isAdmin(null), false);
  assert.equal(isAdmin(undefined), false);
});

test('Config: validateConfig checks presence of BOT_TOKEN', () => {
  config.BOT_TOKEN = 'YOUR_BOT_TOKEN_HERE';
  assert.equal(validateConfig().isValid, false);

  config.BOT_TOKEN = '1234567890:ABC-DEF1234ghIkl-zyx57W2v1u123ew11';
  assert.equal(validateConfig().isValid, true);
});
