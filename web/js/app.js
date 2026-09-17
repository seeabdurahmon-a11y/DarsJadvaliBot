import { TelegramApp } from './telegram.js';
import { Api } from './api.js';
import { ScheduleView } from './schedule.js';
import { AdminView } from './admin.js';
import { Icons } from './icons.js';

export const App = {
  currentView: 'home', // 'home' | 'schedule' | 'week' | 'teacher' | 'profile' | 'admin'
  currentSchoolId: 1,
  currentSchoolCode: 'M-01',
  currentSchoolName: '1-maktab',
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
    window.Icons = Icons;

    // Mount SVG vector icons to static HTML slots
    this.mountIcons();

    // Check strict authentication gatekeeper
    const token = localStorage.getItem('maktab_school_token');
    if (!token) {
      this.showAuthGate();
      return;
    }

    await this.showMainApp();
  },

  mountIcons() {
    // Header icons
    const headerLogo = document.getElementById('header-logo-icon');
    if (headerLogo) headerLogo.innerHTML = Icons.logo;

    const classPillIcon = document.getElementById('header-class-pill-icon');
    if (classPillIcon) classPillIcon.innerHTML = Icons.chevronDown;

    const themeToggleBtn = document.getElementById('theme-toggle-btn-icon');
    if (themeToggleBtn) {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      themeToggleBtn.innerHTML = isDark ? Icons.sun : Icons.moon;
    }

    // Quick Action Card icons (Home view)
    const iconToday = document.getElementById('icon-quick-today');
    if (iconToday) iconToday.innerHTML = Icons.calendar;

    const iconTomorrow = document.getElementById('icon-quick-tomorrow');
    if (iconTomorrow) iconTomorrow.innerHTML = Icons.clock;

    const iconWeek = document.getElementById('icon-quick-week');
    if (iconWeek) iconWeek.innerHTML = Icons.book;

    const iconClass = document.getElementById('icon-quick-class');
    if (iconClass) iconClass.innerHTML = Icons.school;

    const iconTeacher = document.getElementById('icon-quick-teacher');
    if (iconTeacher) iconTeacher.innerHTML = Icons.teacher;

    const iconKey = document.getElementById('icon-quick-key');
    if (iconKey) iconKey.innerHTML = Icons.key;

    // Profile Avatar icon
    const profileAvatar = document.getElementById('profile-avatar-icon');
    if (profileAvatar) profileAvatar.innerHTML = Icons.user;

    // Bottom Navigation Bar icons
    const navHome = document.getElementById('nav-icon-home');
    if (navHome) navHome.innerHTML = Icons.home;

    const navSchedule = document.getElementById('nav-icon-schedule');
    if (navSchedule) navSchedule.innerHTML = Icons.calendar;

    const navWeek = document.getElementById('nav-icon-week');
    if (navWeek) navWeek.innerHTML = Icons.book;

    const navTeacher = document.getElementById('nav-icon-teacher');
    if (navTeacher) navTeacher.innerHTML = Icons.teacher;

    const navProfile = document.getElementById('nav-icon-profile');
    if (navProfile) navProfile.innerHTML = Icons.profile;

    const navAdmin = document.getElementById('nav-icon-admin');
    if (navAdmin) navAdmin.innerHTML = Icons.admin;

    // Modal Close icons
    const modalCloseIcon = document.getElementById('modal-close-icon');
    if (modalCloseIcon) modalCloseIcon.innerHTML = Icons.close;
  },

  showAuthGate() {
    const authGateScreen = document.getElementById('auth-gate-screen');
    const appMainLayout = document.getElementById('app-main-layout');
    const authGateMount = document.getElementById('auth-gate-mount');

    if (authGateScreen) authGateScreen.style.display = 'block';
    if (appMainLayout) appMainLayout.style.display = 'none';

    if (authGateMount) {
      AdminView.authMode = 'login';
      AdminView.render(authGateMount);
    }
  },

  async showMainApp() {
    const authGateScreen = document.getElementById('auth-gate-screen');
    const appMainLayout = document.getElementById('app-main-layout');

    if (authGateScreen) authGateScreen.style.display = 'none';
    if (appMainLayout) appMainLayout.style.display = 'block';

    await this.loadAppData();
    this.navigate('home');
  },

  async loadAppData() {
    // Load user auth and school info
    try {
      const authData = await Api.getAuthMe();
      this.currentUser = authData.user || TelegramApp.getUser();
      this.isAdmin = authData.isAdmin || !!localStorage.getItem('maktab_school_token');

      // School preference
      if (authData.selectedSchoolCode) {
        this.currentSchoolId = authData.selectedSchoolId;
        this.currentSchoolCode = authData.selectedSchoolCode;
        this.currentSchoolName = authData.selectedSchoolName;
      } else {
        const localCode = localStorage.getItem('maktab_selected_school_code');
        const localName = localStorage.getItem('maktab_selected_school_name');
        const localId = localStorage.getItem('maktab_selected_school_id');
        if (localCode) {
          this.currentSchoolCode = localCode;
          this.currentSchoolName = localName || 'Maktab';
          this.currentSchoolId = localId ? Number(localId) : 1;
        }
      }

      // Saved class preference
      if (authData.selectedGroupId) {
        this.currentClassId = authData.selectedGroupId;
        this.currentClassName = authData.selectedGroupName;
      } else {
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

    // Default class if none selected: pick first active class of this school
    if (!this.currentClassId) {
      try {
        const classes = await Api.getClasses(this.currentSchoolCode);
        if (classes.length > 0) {
          this.currentClassId = classes[0].id;
          this.currentClassName = classes[0].name;
          this.updateHeaderClassPill();
        }
      } catch (e) {}
    }
  },

  logout() {
    localStorage.removeItem('maktab_school_token');
    localStorage.removeItem('maktab_admin_name');
    localStorage.removeItem('maktab_admin_email');
    this.isAdmin = false;
    this.showAuthGate();
    this.showToast('Tizimdan chiqildi (Qulflangan)', 'info');
  },

  updateHeaderClassPill() {
    const pill = document.getElementById('header-class-pill');
    if (pill) {
      pill.innerHTML = `<span><b>${this.currentSchoolCode}</b> · ${this.currentClassName || 'Sinf'}</span> <span class="icon-svg-sm" style="display:inline-flex;align-items:center;">${Icons.chevronDown}</span>`;
    }

    const homeBadge = document.getElementById('home-current-class-badge');
    if (homeBadge) {
      homeBadge.innerHTML = `<b>${this.currentSchoolName}</b> (${this.currentSchoolCode}) — ${this.currentClassName || 'Sinf tanlanmagan'}`;
    }

    const schoolCodeCard = document.getElementById('home-school-code-pill');
    if (schoolCodeCard) {
      schoolCodeCard.innerHTML = `<span style="display:inline-flex;align-items:center;gap:6px;">${Icons.key} Maktab Kodi: <b>${this.currentSchoolCode}</b></span>`;
    }
  },

  updateAdminNavVisibility() {
    const adminNavBtn = document.getElementById('nav-admin-btn');
    if (adminNavBtn) {
      adminNavBtn.style.display = 'flex';
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
      const name = this.currentUser?.first_name || 'Foydalanuvchi';
      greetingEl.innerText = `Assalomu alaykum, ${name}!`;
    }
    this.updateHeaderClassPill();
  },

  async renderProfile() {
    const nameEl = document.getElementById('profile-name');
    const userEl = document.getElementById('profile-username');
    const classEl = document.getElementById('profile-class-text');
    const schoolEl = document.getElementById('profile-school-text');

    if (nameEl) nameEl.innerText = this.currentUser?.first_name || 'Foydalanuvchi';
    if (userEl) userEl.innerText = this.currentUser?.username ? `@${this.currentUser.username}` : (this.currentUser?.id ? `ID: ${this.currentUser.id}` : 'Foydalanuvchi');
    if (classEl) classEl.innerText = this.currentClassName || 'Tanlanmagan';
    if (schoolEl) schoolEl.innerText = `${this.currentSchoolName} (${this.currentSchoolCode})`;
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
      const classes = await Api.getClasses(this.currentSchoolCode);
      if (classes.length === 0) {
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:20px;color:var(--text-muted);">Ushbu maktabda sinflar mavjud emas</div>`;
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

    localStorage.setItem('maktab_selected_class_id', String(classId));
    localStorage.setItem('maktab_selected_class_name', className);

    try {
      await Api.saveUserPreference(classId, this.currentUser?.id);
    } catch (e) {}

    this.updateHeaderClassPill();
    this.closeModal();
    this.showToast(`Sinf tanlandi: ${className}`, 'success');
    this.renderCurrentView();
  },

  async openSchoolModal() {
    TelegramApp.haptic('light');
    const modal = document.getElementById('custom-app-modal');
    if (!modal) return;

    const bodyHtml = `
      <div style="margin-bottom:14px;">
        <label style="font-size:12px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:6px;">MAKTAB KODINI KIRITING:</label>
        <div style="display:flex;gap:8px;">
          <input type="text" id="school-code-input" class="form-input" placeholder="Masalan: M-01 yoki M-12" style="text-transform:uppercase;font-weight:800;font-size:16px;">
          <button class="btn btn-primary" onclick="window.App.submitSchoolCode()">Ulanish</button>
        </div>
      </div>

      <div style="font-size:12px;font-weight:700;color:var(--text-muted);margin:16px 0 8px 0;">YOKI RO‘YXATDAN TANLANG:</div>
      <div id="school-modal-list" style="max-height:220px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;">
        <div class="skeleton" style="height:50px;"></div>
      </div>
    `;

    this.showCustomModal('Maktabni tanlash / Kod kiritish', bodyHtml);

    try {
      const schools = await Api.getSchools();
      const listEl = document.getElementById('school-modal-list');
      if (listEl) {
        listEl.innerHTML = schools.map(s => `
          <div style="padding:10px 12px;border-radius:8px;background:var(--bg-card);border:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;cursor:pointer;" onclick="window.App.selectSchool(${s.id}, '${s.code}', '${s.name}')">
            <div>
              <div style="font-weight:700;font-size:14px;">${s.name}</div>
              <div style="font-size:11px;color:var(--text-muted);">${s.region || 'O‘zbekiston'} · ${s.groupsCount || 0} ta sinf</div>
            </div>
            <span class="badge" style="background:var(--primary);color:#fff;font-weight:800;font-size:12px;">${s.code}</span>
          </div>
        `).join('');
      }
    } catch (e) {}
  },

  async submitSchoolCode() {
    const input = document.getElementById('school-code-input');
    const code = input?.value?.trim();
    if (!code) {
      return this.showToast('Iltimos, maktab kodini kiriting', 'error');
    }

    try {
      const school = await Api.getSchoolByCode(code);
      if (school) {
        this.selectSchool(school.id, school.code, school.name);
      }
    } catch (err) {
      this.showToast(`"${code}" kodli maktab topilmadi`, 'error');
    }
  },

  selectSchool(schoolId, schoolCode, schoolName) {
    this.currentSchoolId = schoolId;
    this.currentSchoolCode = schoolCode;
    this.currentSchoolName = schoolName;
    this.currentClassId = null;
    this.currentClassName = null;

    localStorage.setItem('maktab_selected_school_id', String(schoolId));
    localStorage.setItem('maktab_selected_school_code', schoolCode);
    localStorage.setItem('maktab_selected_school_name', schoolName);
    localStorage.removeItem('maktab_selected_class_id');
    localStorage.removeItem('maktab_selected_class_name');

    this.closeModal();
    this.showToast(`Maktab ulandi: ${schoolName} (${schoolCode})`, 'success');
    this.updateHeaderClassPill();
    this.openClassModal(); // Prompt class selection for this new school
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

    const themeToggleBtn = document.getElementById('theme-toggle-btn-icon');
    if (themeToggleBtn) {
      themeToggleBtn.innerHTML = next === 'dark' ? Icons.sun : Icons.moon;
    }
  },

  showToast(message, type = 'info') {
    TelegramApp.haptic(type === 'error' ? 'error' : 'success');
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const iconSvg = type === 'success' ? Icons.check : (type === 'error' ? Icons.alert : Icons.info);
    toast.innerHTML = `<span style="display:inline-flex;align-items:center;">${iconSvg}</span> <span>${message}</span>`;

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
