import { TelegramApp } from './telegram.js';
import { Api } from './api.js';
import { ScheduleView } from './schedule.js';
import { AdminView } from './admin.js';

export const App = {
  currentView: 'home', // 'home' | 'schedule' | 'week' | 'teacher' | 'profile' | 'admin'
  currentClassId: null,
  currentClassName: null,
  currentUser: null,
  isAdmin: false,

  async init() {
    TelegramApp.init();

    // Attach modules globally for inline HTML onclick handlers
    window.App = this;
    window.ScheduleView = ScheduleView;
    window.AdminView = AdminView;

    // Load user auth info
    try {
      const authData = await Api.getAuthMe();
      this.currentUser = authData.user || TelegramApp.getUser();
      this.isAdmin = authData.isAdmin || false;

      // Saved class preference
      if (authData.selectedGroupId) {
        this.currentClassId = authData.selectedGroupId;
        this.currentClassName = authData.selectedGroupName;
      } else {
        // Local fallback
        const localClassId = localStorage.getItem('maktab_selected_class_id');
        const localClassName = localStorage.getItem('maktab_selected_class_name');
        if (localClassId) {
          this.currentClassId = parseInt(localClassId, 10);
          this.currentClassName = localClassName;
        }
      }

      this.updateHeaderClassPill();
      this.updateAdminNavVisibility();
    } catch (err) {
      console.warn('Auth init note:', err);
    }

    // Default class if none selected: pick first active class
    if (!this.currentClassId) {
      try {
        const classes = await Api.getClasses();
        if (classes.length > 0) {
          this.currentClassId = classes[0].id;
          this.currentClassName = classes[0].name;
          this.updateHeaderClassPill();
        }
      } catch (e) {}
    }

    // Render initial view
    this.navigate('home');
  },

  updateHeaderClassPill() {
    const pill = document.getElementById('header-class-pill');
    if (pill) {
      pill.innerHTML = `🏫 ${this.currentClassName || 'Sinf tanlang'} ▾`;
    }

    const homeBadge = document.getElementById('home-current-class-badge');
    if (homeBadge) {
      homeBadge.innerHTML = `🏫 ${this.currentClassName || 'Sinf tanlanmagan'}`;
    }
  },

  updateAdminNavVisibility() {
    const adminNavBtn = document.getElementById('nav-admin-btn');
    if (adminNavBtn) {
      adminNavBtn.style.display = this.isAdmin ? 'flex' : 'none';
    }
  },

  navigate(viewName) {
    TelegramApp.haptic('light');
    this.currentView = viewName;

    // Hide all view sections
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));

    // Show target section
    const targetSection = document.getElementById(`view-${viewName}`);
    if (targetSection) {
      targetSection.classList.add('active');
    }

    // Update bottom navigation bar active states
    document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
      const isCurrent = item.dataset.view === viewName;
      item.classList.toggle('active', isCurrent);
    });

    // Render contents for specific view
    this.renderCurrentView();
  },

  async renderCurrentView() {
    if (this.currentView === 'home') {
      this.renderHome();
    } else if (this.currentView === 'schedule') {
      const container = document.getElementById('daily-schedule-container');
      if (container) {
        ScheduleView.renderDaily(container, this.currentClassId, ScheduleView.activeDayTab);
      }
    } else if (this.currentView === 'week') {
      const container = document.getElementById('week-view-container');
      if (container) {
        ScheduleView.renderWeek(container, this.currentClassId);
      }
    } else if (this.currentView === 'teacher') {
      const container = document.getElementById('teacher-view-container');
      if (container) {
        ScheduleView.renderTeacherSchedule(container);
      }
    } else if (this.currentView === 'profile') {
      this.renderProfile();
    } else if (this.currentView === 'admin') {
      const container = document.getElementById('admin-view-container');
      if (container) {
        AdminView.render(container);
      }
    }
  },

  refreshCurrentView() {
    this.renderCurrentView();
  },

  async renderHome() {
    const greetingEl = document.getElementById('home-greeting');
    if (greetingEl) {
      const name = this.currentUser?.first_name || 'O‘quvchi';
      greetingEl.innerText = `Assalomu alaykum, ${name}!`;
    }
    this.updateHeaderClassPill();
  },

  async renderProfile() {
    const nameEl = document.getElementById('profile-name');
    const userEl = document.getElementById('profile-username');
    const classEl = document.getElementById('profile-class-text');

    if (nameEl) nameEl.innerText = this.currentUser?.first_name || 'Foydalanuvchi';
    if (userEl) userEl.innerText = this.currentUser?.username ? `@${this.currentUser.username}` : (this.currentUser?.id ? `ID: ${this.currentUser.id}` : 'Telegram Mini App');
    if (classEl) classEl.innerText = this.currentClassName || 'Tanlanmagan';
  },

  // Modal Dialogs
  async openClassModal() {
    TelegramApp.haptic('light');
    const modal = document.getElementById('class-select-modal');
    const grid = document.getElementById('modal-class-grid');

    if (!modal || !grid) return;

    modal.classList.add('active');
    grid.innerHTML = `<div class="skeleton" style="height:80px;grid-column:1/-1;"></div>`;

    try {
      const classes = await Api.getClasses();
      if (classes.length === 0) {
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:20px;color:var(--text-muted);">Sinflar mavjud emas</div>`;
        return;
      }

      let html = '';
      classes.forEach(c => {
        const isSelected = c.id === this.currentClassId;
        html += `
          <div class="class-grid-item ${isSelected ? 'active' : ''}" onclick="window.App.selectClass(${c.id}, '${c.name}')">
            ${c.name}
          </div>
        `;
      });
      grid.innerHTML = html;
    } catch (err) {
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:var(--danger);">${err.message}</div>`;
    }
  },

  async selectClass(classId, className) {
    TelegramApp.haptic('medium');
    this.currentClassId = classId;
    this.currentClassName = className;

    // Save to localStorage
    localStorage.setItem('maktab_selected_class_id', String(classId));
    localStorage.setItem('maktab_selected_class_name', className);

    // Save to API if user is authenticated
    try {
      await Api.saveUserPreference(classId, this.currentUser?.id);
    } catch (e) {
      // offline fallback
    }

    this.updateHeaderClassPill();
    this.closeModal();
    this.showToast(`Sinf tanlandi: ${className}`, 'success');
    this.renderCurrentView();
  },

  showCustomModal(title, bodyHtml) {
    TelegramApp.haptic('light');
    const modal = document.getElementById('custom-app-modal');
    const titleEl = document.getElementById('custom-modal-title');
    const bodyEl = document.getElementById('custom-modal-body');

    if (!modal) return;

    if (titleEl) titleEl.innerText = title;
    if (bodyEl) bodyEl.innerHTML = bodyHtml;

    modal.classList.add('active');
  },

  closeModal() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
  },

  toggleTheme() {
    TelegramApp.haptic('light');
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('maktab_theme', next);
  },

  showToast(message, type = 'info') {
    TelegramApp.haptic(type === 'error' ? 'error' : 'success');
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${type === 'success' ? '✅' : (type === 'error' ? '⚠️' : 'ℹ️')}</span> <span>${message}</span>`;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      setTimeout(() => toast.remove(), 200);
    }, 2500);
  }
};

// Initialize application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
