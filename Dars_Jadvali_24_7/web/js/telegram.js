/**
 * Telegram WebApp Integration Module
 */
export const TelegramApp = {
  tg: window.Telegram?.WebApp,

  init() {
    if (this.tg) {
      try {
        this.tg.ready();
        this.tg.expand();
        this.syncTheme();

        this.tg.onEvent('themeChanged', () => {
          this.syncTheme();
        });
      } catch (e) {
        console.warn('Telegram WebApp init warning:', e);
      }
    }
  },

  getUser() {
    return this.tg?.initDataUnsafe?.user || null;
  },

  getInitData() {
    return this.tg?.initData || '';
  },

  isInsideTelegram() {
    return !!(this.tg && this.tg.initData);
  },

  syncTheme() {
    if (!this.tg) return;
    const colorScheme = this.tg.colorScheme || 'light';
    document.documentElement.setAttribute('data-theme', colorScheme);
  },

  haptic(type = 'light') {
    if (this.tg?.HapticFeedback) {
      try {
        if (type === 'light' || type === 'medium' || type === 'heavy') {
          this.tg.HapticFeedback.impactOccurred(type);
        } else if (type === 'success' || type === 'error' || type === 'warning') {
          this.tg.HapticFeedback.notificationOccurred(type);
        }
      } catch (e) {
        // silent fallback
      }
    }
  },

  close() {
    if (this.tg) {
      this.tg.close();
    }
  }
};
