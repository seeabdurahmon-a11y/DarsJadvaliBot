import crypto from 'node:crypto';
import { settingsRepo } from '../database/settings.repo.js';
import { config, isAdmin } from '../config/index.js';

// In-memory sessiyalar va xavfsizlik holatlari
const sessions = new Map(); // userId -> { expiresAt: number }
const failedAttempts = new Map(); // userId -> { count: number, lockedUntil: number }

export const adminAuthService = {
  /**
   * Parolni xavfsiz PBKDF2 va tuz (salt) bilan heshlash
   */
  hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return { hash, salt };
  },

  /**
   * Kiritilgan parolni tekshirish (DB heshi yoki .env paroli bo'yicha)
   */
  verifyPassword(inputPassword) {
    if (!inputPassword || typeof inputPassword !== 'string') return false;

    const storedHash = settingsRepo.get('admin_password_hash', null);
    const storedSalt = settingsRepo.get('admin_password_salt', null);

    // Agar bazada o'zgartirilgan hesh mavjud bo'lsa
    if (storedHash && storedSalt) {
      const { hash } = this.hashPassword(inputPassword, storedSalt);
      try {
        return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
      } catch (err) {
        return false;
      }
    }

    // Aks holda .env dagi ADMIN_PASSWORD bilan tekshirish
    const envPassword = config.ADMIN_PASSWORD || 'admin123';
    return inputPassword.trim() === envPassword.trim();
  },

  /**
   * Admin parolini o'zgartirish
   */
  changePassword(oldPassword, newPassword) {
    if (!this.verifyPassword(oldPassword)) {
      return { success: false, error: 'Eski parol noto‘g‘ri' };
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 4) {
      return { success: false, error: 'Yangi parol kamida 4 ta belgidan iborat bo‘lishi kerak' };
    }

    const { hash, salt } = this.hashPassword(newPassword.trim());
    settingsRepo.set('admin_password_hash', hash);
    settingsRepo.set('admin_password_salt', salt);

    return { success: true };
  },

  /**
   * Parolni .env dagi standart holatga qaytarish (Reset)
   */
  resetPasswordToEnv() {
    // Database dagi heshni tozalash
    try {
      const db = settingsRepo.get('admin_password_hash');
      if (db) {
        settingsRepo.set('admin_password_hash', '');
        settingsRepo.set('admin_password_salt', '');
      }
    } catch (e) {
      // ignore
    }
  },

  /**
   * Brute-force lockout (bloklash) holatini tekshirish
   */
  checkLockout(userId) {
    const record = failedAttempts.get(String(userId));
    if (!record) return { isLocked: false, remainingSeconds: 0 };

    const now = Date.now();
    if (record.lockedUntil && now < record.lockedUntil) {
      const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
      return { isLocked: true, remainingSeconds };
    }

    if (record.lockedUntil && now >= record.lockedUntil) {
      failedAttempts.delete(String(userId));
    }

    return { isLocked: false, remainingSeconds: 0 };
  },

  /**
   * Noto'g'ri urinishni qayd qilish (5 tadan keyin 5 daqiqaga bloklash)
   */
  recordFailedAttempt(userId) {
    const id = String(userId);
    const record = failedAttempts.get(id) || { count: 0, lockedUntil: 0 };
    record.count += 1;

    if (record.count >= config.MAX_FAILED_ATTEMPTS) {
      record.lockedUntil = Date.now() + config.LOCKOUT_DURATION;
    }

    failedAttempts.set(id, record);
    return record;
  },

  /**
   * Muvaffaqiyatli kirishni qayd qilish (30 daqiqalik sessiya ochish)
   */
  recordSuccessfulLogin(userId, ttl = config.ADMIN_SESSION_TTL) {
    const id = String(userId);
    failedAttempts.delete(id);
    const expiresAt = Date.now() + ttl;
    sessions.set(id, { expiresAt });
    return { expiresAt };
  },

  /**
   * Foydalanuvchining admin sessiyasi faolligini tekshirish
   */
  isAuthenticated(userId) {
    if (!userId || !isAdmin(userId)) return false;

    const session = sessions.get(String(userId));
    if (!session) return false;

    const now = Date.now();
    if (now >= session.expiresAt) {
      sessions.delete(String(userId));
      return false;
    }

    return true;
  },

  /**
   * Admin sessiyasini uzaytirish
   */
  extendSession(userId, ttl = config.ADMIN_SESSION_TTL) {
    if (this.isAuthenticated(userId)) {
      sessions.set(String(userId), { expiresAt: Date.now() + ttl });
    }
  },

  /**
   * Admin paneldan chiqish (Logout)
   */
  logout(userId) {
    sessions.delete(String(userId));
  },

  /**
   * Testlar uchun barcha sessiya va bloklarni tozalash
   */
  clearAllSessions() {
    sessions.clear();
    failedAttempts.clear();
  }
};
