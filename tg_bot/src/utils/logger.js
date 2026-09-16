import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config/index.js';

// Ensure logs directory exists
if (!fs.existsSync(config.LOGS_DIR)) {
  fs.mkdirSync(config.LOGS_DIR, { recursive: true });
}

const appLogPath = path.join(config.LOGS_DIR, 'app.log');
const errorLogPath = path.join(config.LOGS_DIR, 'error.log');

function getTimestamp() {
  return new Date().toLocaleString('uz-UZ', { timeZone: config.TZ });
}

function writeToFile(filePath, message) {
  try {
    fs.appendFileSync(filePath, message + '\n', 'utf8');
  } catch (err) {
    console.error('Logger write error:', err);
  }
}

export const logger = {
  info(message, ...args) {
    const formatted = `[${getTimestamp()}] [INFO] ${message} ${args.length ? JSON.stringify(args) : ''}`;
    console.log('\x1b[32m%s\x1b[0m', formatted); // Green
    writeToFile(appLogPath, formatted);
  },

  warn(message, ...args) {
    const formatted = `[${getTimestamp()}] [WARN] ${message} ${args.length ? JSON.stringify(args) : ''}`;
    console.warn('\x1b[33m%s\x1b[0m', formatted); // Yellow
    writeToFile(appLogPath, formatted);
  },

  error(message, error, ...args) {
    const errorDetails = error instanceof Error ? `\n${error.stack}` : (error ? JSON.stringify(error) : '');
    const formatted = `[${getTimestamp()}] [ERROR] ${message} ${errorDetails} ${args.length ? JSON.stringify(args) : ''}`;
    console.error('\x1b[31m%s\x1b[0m', formatted); // Red
    writeToFile(appLogPath, formatted);
    writeToFile(errorLogPath, formatted);
  },

  debug(message, ...args) {
    if (config.LOG_LEVEL === 'debug') {
      const formatted = `[${getTimestamp()}] [DEBUG] ${message} ${args.length ? JSON.stringify(args) : ''}`;
      console.log('\x1b[36m%s\x1b[0m', formatted); // Cyan
      writeToFile(appLogPath, formatted);
    }
  }
};
