import crypto from 'node:crypto';
import { config, isAdmin } from '../../config/index.js';
import { usersRepo } from '../../database/users.repo.js';

/**
 * Telegram WebApp initData HMAC-SHA256 signature validator
 * @param {string} initDataRaw 
 * @param {string} botToken 
 * @returns {{ isValid: boolean, user: object | null, authDate: number | null }}
 */
export function validateTelegramInitData(initDataRaw, botToken = config.BOT_TOKEN) {
  if (!initDataRaw || typeof initDataRaw !== 'string') {
    return { isValid: false, user: null, authDate: null };
  }

  try {
    const params = new URLSearchParams(initDataRaw);
    const hash = params.get('hash');
    if (!hash) {
      return { isValid: false, user: null, authDate: null };
    }

    params.delete('hash');

    // Sort parameters alphabetically
    const keys = Array.from(params.keys()).sort();
    const dataCheckString = keys
      .map(key => `${key}=${params.get(key)}`)
      .join('\n');

    // Secret key = HMAC_SHA256("WebAppData", botToken)
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    // Calculated hash
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // Verify hash with timing safe comparison
    const hashBuffer = Buffer.from(hash, 'utf8');
    const calculatedBuffer = Buffer.from(calculatedHash, 'utf8');

    if (hashBuffer.length !== calculatedBuffer.length || !crypto.timingSafeEqual(hashBuffer, calculatedBuffer)) {
      return { isValid: false, user: null, authDate: null };
    }

    const userRaw = params.get('user');
    const user = userRaw ? JSON.parse(userRaw) : null;
    const authDate = params.get('auth_date') ? parseInt(params.get('auth_date'), 10) : null;

    return { isValid: true, user, authDate };
  } catch (error) {
    return { isValid: false, user: null, authDate: null };
  }
}

/**
 * Express middleware to extract & verify Telegram user
 */
export function telegramAuthMiddleware(req, res, next) {
  const initData = req.headers['x-telegram-init-data'] || req.query.initData || '';
  const devTelegramId = req.headers['x-dev-telegram-id'];

  if (initData) {
    const { isValid, user } = validateTelegramInitData(initData);
    if (isValid && user) {
      req.telegramUser = user;
      req.isAdmin = isAdmin(user.id);

      // Auto-upsert user in DB
      try {
        usersRepo.upsertUser({
          telegram_id: user.id,
          username: user.username,
          first_name: user.first_name,
          is_admin: req.isAdmin ? 1 : 0
        });
      } catch (err) {
        // silent fail for non-blocking upsert
      }

      return next();
    }
  }

  // Development fallback for local browser testing outside of Telegram WebApp
  if (devTelegramId) {
    req.telegramUser = {
      id: devTelegramId,
      first_name: 'Dev User',
      username: 'dev_user'
    };
    req.isAdmin = isAdmin(devTelegramId);
    return next();
  }

  // Standalone anonymous / guest browsing allowed for public schedule
  req.telegramUser = null;
  req.isAdmin = false;
  next();
}

/**
 * Middleware ensuring current user is an authenticated Admin
 */
export function requireAdminMiddleware(req, res, next) {
  if (!req.isAdmin) {
    return res.status(403).json({
      success: false,
      error: 'Ruxsat etilmagan: Ushbu amal faqat administratorlar uchun'
    });
  }
  next();
}
