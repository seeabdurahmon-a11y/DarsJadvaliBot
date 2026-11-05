import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Load environment variables from .env
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

export const config = {
  BOT_TOKEN: process.env.BOT_TOKEN || '',
  ADMIN_IDS: (process.env.ADMIN_IDS || '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean),
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123',
  ADMIN_SESSION_TTL: 30 * 60 * 1000, // 30 daqiqa
  MAX_FAILED_ATTEMPTS: 5,
  LOCKOUT_DURATION: 5 * 60 * 1000, // 5 daqiqa
  TZ: process.env.TZ || 'Asia/Tashkent',
  DEFAULT_SEND_TIME: process.env.DEFAULT_SEND_TIME || '06:00',
  DB_PATH: process.env.DB_PATH
    ? path.resolve(rootDir, process.env.DB_PATH)
    : path.resolve(rootDir, 'data/bot.sqlite'),
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  PORT: parseInt(process.env.PORT || '3000', 10),
  WEB_APP_URL: process.env.WEB_APP_URL || '',
  ROOT_DIR: rootDir,
  WEB_DIR: path.resolve(rootDir, 'web'),
  LOGS_DIR: path.resolve(rootDir, 'logs'),
  DATA_DIR: path.resolve(rootDir, 'data')
};

export function isAdmin(telegramId) {
  if (!telegramId) return false;
  const idStr = String(telegramId).trim();
  return config.ADMIN_IDS.includes(idStr);
}

export function validateConfig() {
  const errors = [];
  if (!config.BOT_TOKEN || config.BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE') {
    errors.push('BOT_TOKEN is missing or set to placeholder in .env');
  }
  return {
    isValid: errors.length === 0,
    errors
  };
}
