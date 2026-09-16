/* =========================================================
   MADAD TA'LIM — Local Storage & State Management
   ========================================================= */

const STORAGE_KEYS = {
  LESSONS: 'madad_talim_lessons',
  GROUPS: 'madad_talim_groups',
  THEME: 'madad_talim_theme',
  SETTINGS: 'madad_talim_settings'
};

class DataStore {
  constructor() {
    this.init();
  }

  init() {
    // Load or initialize lessons
    if (!localStorage.getItem(STORAGE_KEYS.LESSONS)) {
      localStorage.setItem(STORAGE_KEYS.LESSONS, JSON.stringify(window.INITIAL_LESSONS || []));
    }
    // Load or initialize groups
    if (!localStorage.getItem(STORAGE_KEYS.GROUPS)) {
      localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(window.INITIAL_GROUPS || []));
    }
  }

  getLessons() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.LESSONS)) || [];
    } catch (e) {
      console.error('Failed to parse lessons from storage', e);
      return window.INITIAL_LESSONS || [];
    }
  }

  saveLesson(lesson) {
    const lessons = this.getLessons();
    const existingIndex = lessons.findIndex(l => l.id === lesson.id);
    if (existingIndex >= 0) {
      lessons[existingIndex] = lesson;
    } else {
      lessons.unshift(lesson);
    }
    localStorage.setItem(STORAGE_KEYS.LESSONS, JSON.stringify(lessons));
    return lesson;
  }

  deleteLesson(lessonId) {
    let lessons = this.getLessons();
    lessons = lessons.filter(l => l.id !== lessonId);
    localStorage.setItem(STORAGE_KEYS.LESSONS, JSON.stringify(lessons));
  }

  getGroups() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.GROUPS)) || [];
    } catch (e) {
      console.error('Failed to parse groups from storage', e);
      return window.INITIAL_GROUPS || [];
    }
  }

  saveGroup(group) {
    const groups = this.getGroups();
    const existingIndex = groups.findIndex(g => g.id === group.id);
    if (existingIndex >= 0) {
      groups[existingIndex] = group;
    } else {
      groups.unshift(group);
    }
    localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(groups));
    return group;
  }

  resetAllData() {
    localStorage.setItem(STORAGE_KEYS.LESSONS, JSON.stringify(window.INITIAL_LESSONS || []));
    localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(window.INITIAL_GROUPS || []));
  }
}

window.dataStore = new DataStore();
