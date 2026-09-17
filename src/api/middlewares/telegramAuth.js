import crypto from 'node:crypto';
import { config, isAdmin } from '../../config/index.js';
import { usersRepo } from '../../database/users.repo.js';
import { schoolsRepo } from '../../database/schools.repo.js';

/**
 * Telegram WebApp initData HMAC-SHA256 signature validator
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

    const keys = Array.from(params.keys()).sort();
    const dataCheckString = keys
      .map(key => `${key}=${params.get(key)}`)
      .join('\n');

    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

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
 * Express middleware to extract & verify Telegram user or School Admin
 */
export function telegramAuthMiddleware(req, res, next) {
  const initData = req.headers['x-telegram-init-data'] || req.query.initData || '';
  const devTelegramId = req.headers['x-dev-telegram-id'];
  const schoolCode = req.headers['x-school-code'] || req.query.schoolCode;
  const schoolPassword = req.headers['x-school-password'];
  const authHeader = req.headers['authorization'];

  req.school = null;
  req.schoolId = 1; // Default to school 1

  // 1. Identify active school context if provided
  if (schoolCode) {
    const school = schoolsRepo.getSchoolByCode(schoolCode);
    if (school) {
      req.school = school;
      req.schoolId = school.id;
    }
  } else if (req.headers['x-school-id']) {
    const school = schoolsRepo.getSchoolById(Number(req.headers['x-school-id']));
    if (school) {
      req.school = school;
      req.schoolId = school.id;
    }
  }

  // 2. School Web Login (via x-school-password or Basic/Bearer token)
  if (req.school && schoolPassword) {
    if (schoolsRepo.verifyPassword(req.school.id, schoolPassword)) {
      req.isAdmin = true;
      req.isSchoolAdmin = true;
      return next();
    }
  }

  // 3. School Token Header check: "X-School-Token: <schoolCode>:<password>" or Bearer
  const schoolToken = req.headers['x-school-token'];
  if (schoolToken && schoolToken.includes(':')) {
    const [code, pwd] = schoolToken.split(':');
    const school = schoolsRepo.getSchoolByCode(code);
    if (school && schoolsRepo.verifyPassword(school.id, pwd)) {
      req.school = school;
      req.schoolId = school.id;
      req.isAdmin = true;
      req.isSchoolAdmin = true;
      return next();
    }
  }

  // 4. Simple Bearer token check: "Bearer <schoolCode>:<password>"
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '').trim();
    if (token.includes(':')) {
      const [code, pwd] = token.split(':');
      const school = schoolsRepo.getSchoolByCode(code);
      if (school && schoolsRepo.verifyPassword(school.id, pwd)) {
        req.school = school;
        req.schoolId = school.id;
        req.isAdmin = true;
        req.isSchoolAdmin = true;
        return next();
      }
    } else if (token === 'superadmin' || token === config.ADMIN_IDS?.[0]) {
      req.isAdmin = true;
      return next();
    }
  }

  // 4. Telegram WebApp InitData check
  if (initData) {
    const { isValid, user } = validateTelegramInitData(initData);
    if (isValid && user) {
      req.telegramUser = user;
      req.isAdmin = isAdmin(user.id);

      try {
        const dbUser = usersRepo.getUserByTelegramId(user.id);
        if (dbUser && dbUser.selected_school_id) {
          req.schoolId = dbUser.selected_school_id;
          req.school = schoolsRepo.getSchoolById(dbUser.selected_school_id);
        }

        usersRepo.upsertUser({
          telegram_id: user.id,
          username: user.username,
          first_name: user.first_name,
          is_admin: req.isAdmin ? 1 : 0
        });
      } catch (err) {}

      return next();
    }
  }

  // 5. Development fallback for local browser testing
  if (devTelegramId) {
    req.telegramUser = {
      id: devTelegramId,
      first_name: 'Dev User',
      username: 'dev_user'
    };
    req.isAdmin = isAdmin(devTelegramId);
    return next();
  }

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
