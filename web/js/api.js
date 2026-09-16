import { TelegramApp } from './telegram.js';

/**
 * Backend API Client
 */
export const Api = {
  baseUrl: '/api',

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'X-Telegram-Init-Data': TelegramApp.getInitData(),
      ...options.headers
    };

    // Dev test fallback when outside Telegram
    const devId = localStorage.getItem('maktab_dev_telegram_id');
    if (devId && !TelegramApp.isInsideTelegram()) {
      headers['X-Dev-Telegram-Id'] = devId;
    }

    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Server xatosi yuz berdi');
      }

      return data.data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err);
      throw err;
    }
  },

  // Auth & Config
  getAuthMe() {
    return this.request('/auth/me');
  },
  getConfig() {
    return this.request('/config');
  },

  // Classes & Schedule
  getClasses() {
    return this.request('/classes');
  },
  getClassSchedule(id) {
    return this.request(`/classes/${id}/schedule`);
  },
  getTodaySchedule(classId = null) {
    const query = classId ? `?classId=${classId}` : '';
    return this.request(`/schedule/today${query}`);
  },
  getCurrentLesson(classId = null) {
    const query = classId ? `?classId=${classId}` : '';
    return this.request(`/schedule/current${query}`);
  },
  getTomorrowSchedule(classId = null) {
    const query = classId ? `?classId=${classId}` : '';
    return this.request(`/schedule/tomorrow${query}`);
  },
  getWeekSchedule(classId = null) {
    const query = classId ? `?classId=${classId}` : '';
    return this.request(`/schedule/week${query}`);
  },

  // Teachers & Subjects
  getTeachers() {
    return this.request('/teachers');
  },
  getTeacherSchedule(id) {
    return this.request(`/teachers/${id}/schedule`);
  },
  getSubjects() {
    return this.request('/subjects');
  },

  // User Preferences
  saveUserPreference(classId, telegramId = null) {
    return this.request('/user/preference', {
      method: 'POST',
      body: JSON.stringify({ classId, telegramId })
    });
  },
  getUserProfile(telegramId = null) {
    const query = telegramId ? `?telegramId=${telegramId}` : '';
    return this.request(`/user/profile${query}`);
  },

  // Admin Endpoints
  getAdminStats() {
    return this.request('/admin/stats');
  },
  createClass(payload) {
    return this.request('/admin/classes', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  updateClass(id, payload) {
    return this.request(`/admin/classes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },
  deleteClass(id) {
    return this.request(`/admin/classes/${id}`, {
      method: 'DELETE'
    });
  },

  createTeacher(payload) {
    return this.request('/admin/teachers', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  updateTeacher(id, payload) {
    return this.request(`/admin/teachers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },
  deleteTeacher(id) {
    return this.request(`/admin/teachers/${id}`, {
      method: 'DELETE'
    });
  },

  createSubject(payload) {
    return this.request('/admin/subjects', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  deleteSubject(id) {
    return this.request(`/admin/subjects/${id}`, {
      method: 'DELETE'
    });
  },

  getAdminLessons(classId = null) {
    const query = classId ? `?classId=${classId}` : '';
    return this.request(`/admin/lessons${query}`);
  },
  createLesson(payload) {
    return this.request('/admin/lessons', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  updateLesson(id, payload) {
    return this.request(`/admin/lessons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },
  deleteLesson(id) {
    return this.request(`/admin/lessons/${id}`, {
      method: 'DELETE'
    });
  },

  getTemplate() {
    return this.request('/admin/template');
  },
  saveTemplate(payload) {
    return this.request('/admin/template', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  resetTemplate() {
    return this.request('/admin/template/reset', {
      method: 'POST'
    });
  },
  previewTemplate(payload) {
    return this.request('/admin/template/preview', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  sendNow(classId = 'all') {
    return this.request('/admin/send-now', {
      method: 'POST',
      body: JSON.stringify({ classId })
    });
  },
  updateSendTime(send_time, classId = 'all') {
    return this.request('/admin/send-time', {
      method: 'POST',
      body: JSON.stringify({ send_time, classId })
    });
  }
};
