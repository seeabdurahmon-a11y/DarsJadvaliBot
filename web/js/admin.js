import { Api } from './api.js';
import { TelegramApp } from './telegram.js';
import { Icons } from './icons.js';

const DEFAULT_PERIODS = [
  { period: 1, start_time: '08:00', end_time: '08:45', label: '1-soat' },
  { period: 2, start_time: '08:50', end_time: '09:35', label: '2-soat' },
  { period: 3, start_time: '09:40', end_time: '10:25', label: '3-soat' },
  { period: 4, start_time: '10:30', end_time: '11:15', label: '4-soat' },
  { period: 5, start_time: '11:20', end_time: '12:05', label: '5-soat' },
  { period: 6, start_time: '12:10', end_time: '12:55', label: '6-soat' },
  { period: 7, start_time: '13:00', end_time: '13:45', label: '7-soat' }
];

const DAY_NAMES = {
  1: 'Dushanba',
  2: 'Seshanba',
  3: 'Chorshanba',
  4: 'Payshanba',
  5: 'Juma',
  6: 'Shanba'
};

const COMMON_SUBJECTS = [
  'Ona tili', 'Adabiyot', 'Matematika', 'Algebra', 'Geometriya',
  'Ingliz tili', 'Rus tili', 'Tarix', 'Fizika', 'Kimyo',
  'Biologiya', 'Geografiya', 'Informatika', 'Jismoniy tarbiya',
  'Musiqa', 'Tasviriy san\'at', 'Texnologiya', 'Tarbiya', 'Huquq'
];

export const AdminView = {
  currentTab: 'excel', // 'excel' | 'stats' | 'classes' | 'teachers' | 'subjects' | 'lessons' | 'conflicts' | 'import' | 'broadcast'
  authMode: 'login', // 'login' | 'register'
  excelSelectedClassId: null,
  excelActiveDay: 1,
  excelLessonsMap: {},
  otherSchoolLessons: [],
  cachedClasses: [],
  cachedSubjects: [],
  cachedTeachers: [],
  excelConflicts: [],
  excelScheduleLoaded: false,
  lastLoadedClassId: null,

  async render(container) {
    const token = localStorage.getItem('maktab_school_token');
    if (!window.App.isAdmin && !token) {
      if (this.authMode === 'register') {
        return this.renderRegisterView(container);
      }
      return this.renderLoginView(container);
    }

    const adminName = localStorage.getItem('maktab_admin_name') || 'Zavuch / Admin';
    const adminEmail = localStorage.getItem('maktab_admin_email') || '';

    container.innerHTML = `
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:14px;margin-bottom:14px;box-shadow:0 4px 12px rgba(0,0,0,0.03);">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div>
            <div style="font-size:11px;color:var(--text-muted);font-weight:800;letter-spacing:0.5px;">MAKTAB BOSHQARUV PANELI</div>
            <div style="font-size:16px;font-weight:800;color:var(--text-primary);margin-top:2px;">
              ${window.App.currentSchoolName || 'Maktab'}
              <span style="background:var(--primary);color:#fff;font-size:11px;padding:2px 8px;border-radius:6px;margin-left:6px;font-weight:800;">${window.App.currentSchoolCode}</span>
            </div>
            <div style="font-size:12px;color:var(--primary);font-weight:600;margin-top:2px;">
              ${adminName} ${adminEmail ? `<span style="color:var(--text-muted);font-weight:400;">(${adminEmail})</span>` : ''}
            </div>
          </div>
          <button class="btn-sm" style="background:#fee2e2;color:#ef4444;border:1px solid #fecaca;border-radius:8px;padding:6px 12px;cursor:pointer;font-weight:700;display:inline-flex;align-items:center;gap:4px;" onclick="window.App.logout()">
            ${Icons.logout} Chiqish
          </button>
        </div>

        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
          <button class="btn-sm" style="background:var(--bg-body);border:1px solid var(--border);padding:6px 12px;border-radius:6px;font-size:11px;cursor:pointer;font-weight:700;display:inline-flex;align-items:center;gap:5px;" onclick="navigator.clipboard?.writeText('${window.App.currentSchoolCode}'); window.App.showToast('Maktab kodi nusxalandi: ${window.App.currentSchoolCode}', 'success');">
            ${Icons.copy} Kod: <b>${window.App.currentSchoolCode}</b>
          </button>
          <a href="https://t.me/JadvaliBot?start=code_${window.App.currentSchoolCode?.replace('-', '')}" target="_blank" class="btn-sm" style="background:#e0e7ff;color:#4338ca;border:1px solid #c7d2fe;padding:6px 12px;border-radius:6px;font-size:11px;text-decoration:none;font-weight:700;display:inline-flex;align-items:center;gap:5px;">
            ${Icons.send} Telegram Botga havola
          </a>
          <a href="schedule-test.html" target="_blank" class="btn-sm" style="background:linear-gradient(135deg,#0284c7 0%,#0f766e 100%);color:#fff;border:none;padding:6px 14px;border-radius:6px;font-size:11.5px;text-decoration:none;font-weight:800;display:inline-flex;align-items:center;gap:5px;box-shadow:0 2px 6px rgba(2,132,199,0.3);">
            🔀 Barcha Sinflar Jadvali & Darslarni Almashtirish (Test)
          </a>
        </div>
      </div>

      <div class="tab-pills" id="admin-pills" style="overflow-x:auto;white-space:nowrap;margin-bottom:14px;display:flex;gap:6px;">
        <button class="tab-pill active" onclick="window.AdminView.switchTab('excel')" style="background:#0284c7;color:#fff;font-weight:800;">📊 Dars jadvalini yangilash (Excel)</button>
        <a href="schedule-test.html" target="_blank" class="tab-pill" style="background:#0f766e;color:#fff;font-weight:800;text-decoration:none;display:inline-flex;align-items:center;gap:4px;">🔀 Barcha Sinflar (Almashtirish)</a>
        <button class="tab-pill" onclick="window.AdminView.switchTab('stats')">Statistika</button>
        <button class="tab-pill" onclick="window.AdminView.switchTab('classes')">Sinflar</button>
        <button class="tab-pill" onclick="window.AdminView.switchTab('teachers')">Ustozlar</button>
        <button class="tab-pill" onclick="window.AdminView.switchTab('subjects')">Fanlar</button>
        <button class="tab-pill" onclick="window.AdminView.switchTab('lessons')">Darslar</button>
        <button class="tab-pill" onclick="window.AdminView.switchTab('conflicts')">⚠️ To‘qnashuvlar</button>
        <button class="tab-pill" onclick="window.AdminView.switchTab('import')">Jadval yuklash</button>
        <button class="tab-pill" onclick="window.AdminView.switchTab('broadcast')">Hozir yuborish</button>
      </div>

      <div id="admin-tab-body">
        <div class="state-box"><div class="skeleton" style="height:140px;"></div></div>
      </div>
    `;

    this.loadTabContent();
  },

  renderLoginView(container) {
    container.innerHTML = `
      <div class="auth-page-wrapper">
        <div class="auth-header-center">
          <div class="auth-brand-logo-icon">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
              <path d="M6 12v5c3 3 9 3 12 0v-5"/>
            </svg>
          </div>
          <div class="auth-brand-title">Maktab Jadvali</div>
          <div class="auth-brand-subtitle">Tizimga kirish</div>
        </div>

        <div class="auth-white-card">
          <div class="form-group" style="margin-bottom:14px;">
            <label class="auth-field-label">Foydalanuvchi nomi</label>
            <div class="auth-input-container">
              <span class="auth-input-left-icon">${Icons.user}</span>
              <input type="text" id="admin-login-id" class="auth-input-control" value="test@darsjadvali.uz" placeholder="Email yoki maktab kodi" autocomplete="username">
            </div>
          </div>

          <div class="form-group" style="margin-bottom:18px;">
            <label class="auth-field-label">Parol</label>
            <div class="auth-input-container">
              <span class="auth-input-left-icon">${Icons.lock}</span>
              <input type="password" id="admin-login-pwd" class="auth-input-control" value="darsjadvoli0751" placeholder="Parolni kiriting" autocomplete="current-password">
              <button type="button" class="auth-password-toggle-btn" onclick="window.AdminView.togglePasswordVisibility('admin-login-pwd', this)" title="Parolni ko‘rsatish">
                ${Icons.eye}
              </button>
            </div>
          </div>

          <button class="auth-submit-btn-emerald" onclick="window.AdminView.submitLogin()">Kirish</button>

          <div class="auth-test-box">
            <div style="font-size:11px;color:#047857;font-weight:700;">TEST AKKAUNTI:</div>
            <div style="font-size:12px;color:#065f46;font-weight:600;margin-top:2px;">Email: <b>test@darsjadvali.uz</b> | Parol: <b>darsjadvoli0751</b></div>
            <button class="auth-test-fill-btn" onclick="window.AdminView.fillTestCredentials()">1-bosishda test bilan kirish</button>
          </div>

          <hr style="margin:20px 0;border:none;border-top:1px solid #f1f5f9;">

          <div style="text-align:center;">
            <div style="font-size:12.5px;color:#64748b;margin-bottom:8px;">Yangi maktab yoki zavuch akkaunti ochmoqchimisiz?</div>
            <button class="auth-toggle-auth-btn" onclick="window.AdminView.setAuthMode('register')">Yangi Akkaunt Ochish</button>
          </div>
        </div>
      </div>
    `;
  },

  renderRegisterView(container) {
    container.innerHTML = `
      <div class="auth-page-wrapper">
        <div class="auth-header-center">
          <div class="auth-brand-logo-icon">
            <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" x2="12" y1="5" y2="19"/>
              <line x1="5" x2="19" y1="12" y2="12"/>
            </svg>
          </div>
          <div class="auth-brand-title">Maktab Jadvali</div>
          <div class="auth-brand-subtitle">Yangi Zavuch / Maktab Ro‘yxatdan O‘tkazish</div>
        </div>

        <div class="auth-white-card">
          <div class="form-group" style="margin-bottom:12px;">
            <label class="auth-field-label">Zavuch / Mas'ul Ismi</label>
            <div class="auth-input-container">
              <span class="auth-input-left-icon">${Icons.user}</span>
              <input type="text" id="reg-admin-name" class="auth-input-control" placeholder="Masalan: Aliyev Botir">
            </div>
          </div>

          <div class="form-group" style="margin-bottom:12px;">
            <label class="auth-field-label">Email Manzili (Login uchun)</label>
            <div class="auth-input-container">
              <span class="auth-input-left-icon">${Icons.mail}</span>
              <input type="email" id="reg-admin-email" class="auth-input-control" placeholder="Masalan: zavuch@maktab.uz">
            </div>
          </div>

          <div class="form-group" style="margin-bottom:12px;">
            <label class="auth-field-label">Parol</label>
            <div class="auth-input-container">
              <span class="auth-input-left-icon">${Icons.lock}</span>
              <input type="password" id="reg-admin-pwd" class="auth-input-control" value="darsjadvoli0751" placeholder="Parol kiriting">
              <button type="button" class="auth-password-toggle-btn" onclick="window.AdminView.togglePasswordVisibility('reg-admin-pwd', this)">
                ${Icons.eye}
              </button>
            </div>
          </div>

          <div class="form-group" style="margin-bottom:12px;">
            <label class="auth-field-label">Maktab Nomi</label>
            <div class="auth-input-container">
              <span class="auth-input-left-icon">${Icons.school}</span>
              <input type="text" id="reg-school-name" class="auth-input-control" placeholder="Masalan: 12-IDUM yoki 45-maktab">
            </div>
          </div>

          <div class="form-group" style="margin-bottom:12px;">
            <label class="auth-field-label">Maktab Kodi (Ixtiyoriy)</label>
            <div class="auth-input-container">
              <span class="auth-input-left-icon">${Icons.key}</span>
              <input type="text" id="reg-school-code" class="auth-input-control" placeholder="Bo‘sh qoldirilsa M-02 kabi beriladi" style="text-transform:uppercase;">
            </div>
          </div>

          <div class="form-group" style="margin-bottom:12px;">
            <label class="auth-field-label">Viloyat / Tuman</label>
            <div class="auth-input-container">
              <span class="auth-input-left-icon">${Icons.room}</span>
              <input type="text" id="reg-school-region" class="auth-input-control" placeholder="Masalan: Toshkent shahar">
            </div>
          </div>

          <div class="form-group" style="margin-bottom:16px;">
            <label class="auth-field-label">Ertalabki dars jadvalini yuborish vaqti</label>
            <div class="auth-input-container">
              <span class="auth-input-left-icon">${Icons.clock}</span>
              <input type="time" id="reg-school-time" class="auth-input-control" value="06:00">
            </div>
          </div>

          <button class="auth-submit-btn-emerald" onclick="window.AdminView.submitRegisterSchool()">Akkaunt Ochish va Kirish</button>

          <hr style="margin:20px 0;border:none;border-top:1px solid #f1f5f9;">

          <div style="text-align:center;">
            <div style="font-size:12.5px;color:#64748b;margin-bottom:8px;">Akkauntingiz bormi?</div>
            <button class="auth-toggle-auth-btn" onclick="window.AdminView.setAuthMode('login')">Tizimga Kirish</button>
          </div>
        </div>
      </div>
    `;
  },

  togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (input.type === 'password') {
      input.type = 'text';
      btn.innerHTML = Icons.eyeOff;
    } else {
      input.type = 'password';
      btn.innerHTML = Icons.eye;
    }
  },

  setAuthMode(mode) {
    this.authMode = mode;
    const mount = document.getElementById('auth-gate-mount') || document.getElementById('admin-view-container');
    if (mount) this.render(mount);
  },

  fillTestCredentials() {
    const idInput = document.getElementById('admin-login-id');
    const pwdInput = document.getElementById('admin-login-pwd');
    if (idInput) idInput.value = 'test@darsjadvali.uz';
    if (pwdInput) pwdInput.value = 'darsjadvoli0751';
    this.submitLogin();
  },

  async submitLogin() {
    const identifier = document.getElementById('admin-login-id')?.value?.trim();
    const password = document.getElementById('admin-login-pwd')?.value?.trim();

    if (!identifier || !password) {
      return window.App.showToast('Email (yoki maktab kodi) va parolni kiriting', 'error');
    }

    try {
      window.App.showToast('Tekshirilmoqda...', 'info');
      const res = await Api.loginSchool(identifier, password);
      localStorage.setItem('maktab_school_token', res.token);
      localStorage.setItem('maktab_selected_school_code', res.school.code);
      localStorage.setItem('maktab_selected_school_name', res.school.name);
      localStorage.setItem('maktab_selected_school_id', String(res.school.id));
      localStorage.setItem('maktab_admin_name', res.school.admin_name || 'Zavuch');
      localStorage.setItem('maktab_admin_email', res.school.admin_email || '');

      window.App.isAdmin = true;
      window.App.currentSchoolCode = res.school.code;
      window.App.currentSchoolName = res.school.name;
      window.App.currentSchoolId = res.school.id;

      window.App.showToast(`Xush kelibsiz, ${res.school.admin_name || res.school.name}!`, 'success');
      window.App.showMainApp();
    } catch (err) {
      window.App.showToast(err.message, 'error');
    }
  },

  async submitRegisterSchool() {
    const admin_name = document.getElementById('reg-admin-name')?.value?.trim();
    const admin_email = document.getElementById('reg-admin-email')?.value?.trim();
    const admin_password = document.getElementById('reg-admin-pwd')?.value?.trim();
    const name = document.getElementById('reg-school-name')?.value?.trim();
    const code = document.getElementById('reg-school-code')?.value?.trim();
    const region = document.getElementById('reg-school-region')?.value?.trim();
    const default_send_time = document.getElementById('reg-school-time')?.value?.trim();

    if (!name) {
      return window.App.showToast('Maktab nomini kiriting', 'error');
    }

    try {
      window.App.showToast('Akkaunt yaratilmoqda...', 'info');
      const res = await Api.registerSchool({
        admin_name,
        admin_email,
        admin_password,
        name,
        code,
        region,
        default_send_time
      });

      window.App.showToast(res.message, 'success');
      localStorage.setItem('maktab_school_token', res.token);
      localStorage.setItem('maktab_selected_school_code', res.school.code);
      localStorage.setItem('maktab_selected_school_name', res.school.name);
      localStorage.setItem('maktab_selected_school_id', String(res.school.id));
      localStorage.setItem('maktab_admin_name', res.school.admin_name || 'Zavuch');
      localStorage.setItem('maktab_admin_email', res.school.admin_email || '');

      window.App.isAdmin = true;
      window.App.currentSchoolCode = res.school.code;
      window.App.currentSchoolName = res.school.name;
      window.App.currentSchoolId = res.school.id;

      window.App.showMainApp();
    } catch (err) {
      window.App.showToast(err.message, 'error');
    }
  },

  switchTab(tab) {
    TelegramApp.haptic('light');
    this.currentTab = tab;

    const pills = document.querySelectorAll('#admin-pills .tab-pill');
    pills.forEach(p => {
      const isCurrent = p.getAttribute('onclick')?.includes(tab);
      p.classList.toggle('active', isCurrent);
    });

    this.loadTabContent();
  },

  async loadTabContent() {
    const body = document.getElementById('admin-tab-body');
    if (!body) return;

    try {
      if (this.currentTab === 'excel') {
        await this.renderExcelTimetable(body);
      } else if (this.currentTab === 'stats') {
        await this.renderStats(body);
      } else if (this.currentTab === 'classes') {
        await this.renderClasses(body);
      } else if (this.currentTab === 'teachers') {
        await this.renderTeachers(body);
      } else if (this.currentTab === 'subjects') {
        await this.renderSubjects(body);
      } else if (this.currentTab === 'lessons') {
        await this.renderLessons(body);
      } else if (this.currentTab === 'conflicts') {
        await this.renderConflictsTab(body);
      } else if (this.currentTab === 'import') {
        await this.renderImport(body);
      } else if (this.currentTab === 'broadcast') {
        await this.renderBroadcast(body);
      }
    } catch (err) {
      body.innerHTML = `
        <div class="state-box">
          <div class="state-title">Yuklashda xatolik</div>
          <div class="state-desc">${err.message}</div>
        </div>
      `;
    }
  },

  // =========================================================
  // 0. EXCEL TIMETABLE EDITOR & CLASH DETECTION
  // =========================================================

  getDayFilledCount(day) {
    let count = 0;
    for (let p = 1; p <= 7; p++) {
      const key = `${day}_${p}`;
      const item = this.excelLessonsMap[key];
      if (item && item.subject && item.subject.trim()) {
        count++;
      }
    }
    return count;
  },

  async changeExcelClass(classId) {
    this.excelSelectedClassId = Number(classId);
    this.excelScheduleLoaded = false;
    await this.loadTabContent();
  },

  setExcelDay(day) {
    TelegramApp.haptic('light');
    this.excelActiveDay = day;
    const body = document.getElementById('admin-tab-body');
    if (body) {
      this.renderExcelTimetable(body);
    }
  },

  calculateExcelConflicts() {
    const conflicts = [];
    const normalize = (str) => (str ? str.toLowerCase().replace(/[^a-zа-яё0-9]/gi, '').trim() : '');
    const timesOverlap = (s1, e1, s2, e2) => {
      if (!s1 || !e1 || !s2 || !e2) return false;
      return s1 < e2 && e1 > s2;
    };

    for (let day = 1; day <= 6; day++) {
      for (let p = 1; p <= 7; p++) {
        const key = `${day}_${p}`;
        const lesson = this.excelLessonsMap[key];
        if (!lesson || !lesson.subject || !lesson.teacher || !lesson.teacher.trim()) continue;

        const teacherNorm = normalize(lesson.teacher);
        if (!teacherNorm) continue;

        // 1. Check against other classes in school
        for (const other of this.otherSchoolLessons) {
          if (Number(other.day_of_week) !== day) continue;
          if (!other.teacher) continue;
          const otherNorm = normalize(other.teacher);
          if (otherNorm === teacherNorm) {
            if (timesOverlap(lesson.start_time, lesson.end_time, other.start_time, other.end_time)) {
              conflicts.push({
                key,
                day,
                period: p,
                teacher: lesson.teacher.trim(),
                subject: lesson.subject.trim(),
                otherClass: other.group_name || 'Boshqa sinf',
                otherTime: `${other.start_time} - ${other.end_time}`,
                message: `⚠️ OGOHLANTIRISH: Ustoz ${lesson.teacher.trim()} ayni vaqtda (${other.start_time}-${other.end_time}) "${other.group_name || 'Boshqa sinf'}"da darsda!`
              });
            }
          }
        }

        // 2. Check within current class if duplicate teacher at same period
        for (let p2 = p + 1; p2 <= 7; p2++) {
          const key2 = `${day}_${p2}`;
          const lesson2 = this.excelLessonsMap[key2];
          if (lesson2 && lesson2.teacher && normalize(lesson2.teacher) === teacherNorm) {
            if (timesOverlap(lesson.start_time, lesson.end_time, lesson2.start_time, lesson2.end_time)) {
              conflicts.push({
                key,
                day,
                period: p,
                teacher: lesson.teacher.trim(),
                subject: lesson.subject.trim(),
                otherClass: 'Ayni sinfda (boshqa darsda)',
                otherTime: `${lesson2.start_time} - ${lesson2.end_time}`,
                message: `⚠️ OGOHLANTIRISH: Ustoz ${lesson.teacher.trim()} ushbu kunda ayni vaqtda 2 marta kiritilgan!`
              });
            }
          }
        }
      }
    }

    return conflicts;
  },

  async renderExcelTimetable(container) {
    // 1. Fetch classes, teachers, subjects, and all lessons
    const [classes, subjects, teachers, allLessons] = await Promise.all([
      Api.getClasses(window.App.currentSchoolCode),
      Api.getSubjects(window.App.currentSchoolCode).catch(() => []),
      Api.getTeachers(window.App.currentSchoolCode).catch(() => []),
      Api.getAdminLessons().catch(() => [])
    ]);

    this.cachedClasses = classes || [];
    this.cachedSubjects = subjects || [];
    this.cachedTeachers = teachers || [];

    if (this.cachedClasses.length === 0) {
      container.innerHTML = `
        <div class="state-box">
          <div class="state-title">Maktabda hozircha sinflar yo‘q</div>
          <div class="state-desc">Dars jadvalini kiritishdan oldin "Sinflar" bo‘limida kamida 1 ta sinf qo‘shing.</div>
          <button class="admin-action-btn" onclick="window.AdminView.switchTab('classes')" style="margin-top:12px;">Sinf Qo‘shish</button>
        </div>
      `;
      return;
    }

    if (!this.excelSelectedClassId || !this.cachedClasses.find(c => c.id === this.excelSelectedClassId)) {
      this.excelSelectedClassId = this.cachedClasses[0].id;
      this.excelScheduleLoaded = false;
    }

    const currentClass = this.cachedClasses.find(c => c.id === this.excelSelectedClassId) || this.cachedClasses[0];

    // Load schedule for selected class if needed
    if (!this.excelScheduleLoaded || this.lastLoadedClassId !== this.excelSelectedClassId) {
      const scheduleData = await Api.getClassSchedule(this.excelSelectedClassId);
      const weekly = scheduleData.weekly || {};
      
      this.excelLessonsMap = {};
      for (let day = 1; day <= 6; day++) {
        const dayLessons = weekly[day]?.lessons || [];
        for (let pIdx = 0; pIdx < DEFAULT_PERIODS.length; pIdx++) {
          const pDef = DEFAULT_PERIODS[pIdx];
          const found = dayLessons[pIdx] || dayLessons.find(l => l.start_time === pDef.start_time);
          const key = `${day}_${pDef.period}`;
          this.excelLessonsMap[key] = {
            day_of_week: day,
            period: pDef.period,
            start_time: found?.start_time || pDef.start_time,
            end_time: found?.end_time || pDef.end_time,
            subject: found?.subject || '',
            teacher: found?.teacher || '',
            room: found?.room || ''
          };
        }
      }
      this.excelScheduleLoaded = true;
      this.lastLoadedClassId = this.excelSelectedClassId;
    }

    // Filter other lessons in school (excluding this class)
    this.otherSchoolLessons = (allLessons || []).filter(l => Number(l.group_id) !== Number(this.excelSelectedClassId));

    // Calculate real-time conflicts
    const conflicts = this.calculateExcelConflicts();
    this.excelConflicts = conflicts;
    const conflictsCount = conflicts.length;
    const isMatrix = this.excelActiveDay === 'matrix';

    let html = `
      <div class="excel-editor-container">
        <!-- Top Toolbar Card -->
        <div class="excel-top-bar">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
            <div>
              <div style="font-size:11px;font-weight:800;color:var(--text-muted);letter-spacing:0.5px;text-transform:uppercase;">
                📊 Excel Dars Jadvali Muharriri
              </div>
              <div style="font-size:18px;font-weight:800;color:var(--text-main);margin-top:2px;">
                ${currentClass.name} jadvalini yangilash
              </div>
            </div>

            <div style="display:flex;gap:8px;align-items:center;">
              <select class="custom-select" id="excel-class-select" onchange="window.AdminView.changeExcelClass(Number(this.value))" style="font-weight:800;font-size:14px;padding:8px 12px;border:2px solid #0284c7;border-radius:10px;">
                ${this.cachedClasses.map(c => `<option value="${c.id}" ${c.id === this.excelSelectedClassId ? 'selected' : ''}>🏫 ${c.name}</option>`).join('')}
              </select>
            </div>
          </div>

          <!-- Status / Conflict Banner -->
          <div class="excel-status-banner ${conflictsCount > 0 ? 'danger' : 'success'}" id="excel-status-banner">
            <span style="font-size:20px;">${conflictsCount > 0 ? '🚨' : '✅'}</span>
            <div style="flex:1;">
              ${conflictsCount > 0 
                ? `<b>DIQQAT: ${conflictsCount} ta ustozda dars to‘qnashuvi aniqlandi!</b><br><span style="font-size:11.5px;font-weight:500;">Bitta ustoz bir vaqtda 2 ta sinfda dars o‘ta olmaydi. Qizil rangdagi katakchalarni tekshiring.</span>` 
                : `<b>Ustozlar dars to‘qnashuvi yo‘q!</b> Barcha fanlar va ustozlar taqsimoti to‘g‘ri.`
              }
            </div>
            ${conflictsCount > 0 ? `<button class="btn-sm" style="background:#dc2626;color:#fff;border:none;border-radius:6px;padding:4px 10px;font-size:11px;font-weight:700;cursor:pointer;" onclick="window.AdminView.showConflictDetailsModal()">Tafsilotlar</button>` : ''}
          </div>

          <!-- Quick Action Buttons -->
          <div class="excel-action-bar" style="margin-top:12px;">
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              <button class="excel-tool-btn" onclick="window.AdminView.fillStandardExcelTemplate()">
                📋 Standart vaqtlarni to‘ldirish
              </button>
              <button class="excel-tool-btn" onclick="window.AdminView.openCopyFromClassModal()">
                📑 Boshqa sinfdan nusxalash
              </button>
              <button class="excel-tool-btn" style="color:#ef4444;" onclick="window.AdminView.clearCurrentExcelDay()">
                🗑 Tozalash
              </button>
            </div>

            <button class="excel-save-btn" id="excel-save-main-btn" onclick="window.AdminView.saveExcelTimetable()">
              💾 Saqlash va Botda yangilash
            </button>
          </div>
        </div>

        <!-- Datalists for Autocomplete -->
        <datalist id="excel-subjects-datalist">
          ${this.cachedSubjects.map(s => `<option value="${s.name}">`).join('')}
          ${COMMON_SUBJECTS.map(s => `<option value="${s}">`).join('')}
        </datalist>
        <datalist id="excel-teachers-datalist">
          ${this.cachedTeachers.map(t => `<option value="${t.last_name} ${t.first_name}">`).join('')}
        </datalist>

        <!-- Day Selector Tabs / Matrix Toggle -->
        <div class="excel-day-tabs">
          ${[1, 2, 3, 4, 5, 6].map(d => {
            const count = this.getDayFilledCount(d);
            const hasClash = conflicts.some(c => Number(c.day) === d);
            return `
              <button class="excel-day-btn ${this.excelActiveDay === d ? 'active' : ''}" onclick="window.AdminView.setExcelDay(${d})">
                ${hasClash ? '🚨' : '🗓'} ${DAY_NAMES[d]}
                <span style="font-size:11px;opacity:0.85;background:rgba(0,0,0,0.1);padding:1px 6px;border-radius:10px;">${count} ta</span>
              </button>
            `;
          }).join('')}
          <button class="excel-day-btn ${this.excelActiveDay === 'matrix' ? 'active' : ''}" onclick="window.AdminView.setExcelDay('matrix')" style="background:${this.excelActiveDay === 'matrix' ? '#0f766e' : 'var(--bg-card)'};color:${this.excelActiveDay === 'matrix' ? '#fff' : 'var(--text-main)'};border-color:#0f766e;">
            📊 21.09 JADVAL (To‘liq Hafta)
          </button>
        </div>
    `;

    if (isMatrix) {
      html += this.renderExcelMatrixHtml(conflicts);
    } else {
      html += this.renderExcelDayRowsHtml(this.excelActiveDay, conflicts);
    }

    html += `</div>`;
    container.innerHTML = html;
  },

  renderExcelDayRowsHtml(day, conflicts) {
    let html = `
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:12px;box-shadow:var(--shadow-sm);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--border);">
          <div style="font-weight:800;font-size:15px;color:var(--primary);display:flex;align-items:center;gap:6px;">
            <span>🗓</span> ${DAY_NAMES[day]} dars jadvali
          </div>
          <div style="font-size:12px;color:var(--text-muted);font-weight:600;">
            1-soatdan 7-soatgacha darslarni kiriting
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:12px;">
    `;

    for (let pIdx = 0; pIdx < DEFAULT_PERIODS.length; pIdx++) {
      const pDef = DEFAULT_PERIODS[pIdx];
      const period = pDef.period;
      const key = `${day}_${period}`;
      const item = this.excelLessonsMap[key] || {
        day_of_week: day,
        period,
        start_time: pDef.start_time,
        end_time: pDef.end_time,
        subject: '',
        teacher: '',
        room: ''
      };

      const conflict = conflicts.find(c => c.key === key);
      const isConflict = Boolean(conflict);

      html += `
        <div id="row-${key}" class="excel-row-card" style="background:${isConflict ? '#fff5f5' : 'var(--bg-body)'};border:1.5px solid ${isConflict ? '#ef4444' : 'var(--border)'};border-radius:10px;padding:10px 12px;transition:all 0.2s ease;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-weight:800;font-size:13px;background:var(--primary);color:#fff;padding:2px 8px;border-radius:6px;">
                ${period}-soat
              </span>
              <div style="display:flex;gap:4px;align-items:center;">
                <input type="time" class="excel-cell-input" style="width:85px;padding:4px 6px;font-size:12px;" value="${item.start_time || pDef.start_time}" onchange="window.AdminView.onExcelCellInput(${day}, ${period}, 'start_time', this.value)">
                <span style="color:var(--text-muted);font-size:12px;">—</span>
                <input type="time" class="excel-cell-input" style="width:85px;padding:4px 6px;font-size:12px;" value="${item.end_time || pDef.end_time}" onchange="window.AdminView.onExcelCellInput(${day}, ${period}, 'end_time', this.value)">
              </div>
            </div>

            <button type="button" class="btn-icon-action" style="padding:2px 6px;font-size:11px;color:var(--text-muted);" onclick="window.AdminView.clearExcelPeriodRow(${day}, ${period})" title="Ushbu soatni tozalash">
              ✕
            </button>
          </div>

          <div style="display:grid;grid-template-columns: 1.4fr 1.2fr 0.6fr;gap:8px;align-items:flex-start;">
            <!-- Subject (Fan) -->
            <div>
              <label style="font-size:11px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:2px;">Fan:</label>
              <input type="text" id="subj-${key}" list="excel-subjects-datalist" class="excel-cell-input" placeholder="Masalan: Matematika" value="${item.subject || ''}" oninput="window.AdminView.onExcelCellInput(${day}, ${period}, 'subject', this.value)">
              
              <!-- Quick Subject Chips -->
              <div class="excel-quick-chips">
                <button type="button" class="excel-chip" onclick="window.AdminView.applyQuickSubject(${day}, ${period}, 'Matematika')">Matem</button>
                <button type="button" class="excel-chip" onclick="window.AdminView.applyQuickSubject(${day}, ${period}, 'Ona tili')">Ona tili</button>
                <button type="button" class="excel-chip" onclick="window.AdminView.applyQuickSubject(${day}, ${period}, 'Ingliz tili')">Ingliz</button>
                <button type="button" class="excel-chip" onclick="window.AdminView.applyQuickSubject(${day}, ${period}, 'Tarix')">Tarix</button>
                <button type="button" class="excel-chip" onclick="window.AdminView.applyQuickSubject(${day}, ${period}, 'Fizika')">Fizika</button>
                <button type="button" class="excel-chip" onclick="window.AdminView.applyQuickSubject(${day}, ${period}, 'Kimyo')">Kimyo</button>
                <button type="button" class="excel-chip" onclick="window.AdminView.applyQuickSubject(${day}, ${period}, 'Informatika')">Inform</button>
                <button type="button" class="excel-chip" onclick="window.AdminView.applyQuickSubject(${day}, ${period}, 'Jismoniy tarbiya')">Jismoniy</button>
              </div>
            </div>

            <!-- Teacher (Ustoz) -->
            <div>
              <label style="font-size:11px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:2px;">Ustoz (O‘qituvchi):</label>
              <input type="text" id="teacher-${key}" list="excel-teachers-datalist" class="excel-cell-input ${isConflict ? 'conflict-highlight' : ''}" placeholder="Ustoz ismi" value="${item.teacher || ''}" oninput="window.AdminView.onExcelCellInput(${day}, ${period}, 'teacher', this.value)">
              
              <div id="badge-${key}">
                ${isConflict ? `<div class="excel-conflict-badge">🚨 ${conflict.teacher} ayni paytda "${conflict.otherClass}"da darsda!</div>` : ''}
              </div>
            </div>

            <!-- Room (Xona) -->
            <div>
              <label style="font-size:11px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:2px;">Xona:</label>
              <input type="text" id="room-${key}" class="excel-cell-input" placeholder="Xona" value="${item.room || ''}" oninput="window.AdminView.onExcelCellInput(${day}, ${period}, 'room', this.value)">
            </div>
          </div>
        </div>
      `;
    }

    html += `</div></div>`;
    return html;
  },

  renderExcelMatrixHtml(conflicts) {
    let html = `
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:12px;overflow-x:auto;box-shadow:var(--shadow-sm);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <div>
            <div style="font-weight:800;font-size:16px;color:#0f766e;">
              📋 21.09 JADVAL — Haftalik To‘liq Excel Jadvali
            </div>
            <div style="font-size:12px;color:var(--text-muted);">
              Barcha 6 kunlik darslarni bir varaqda ko‘rish va to‘g‘ridan-to‘g‘ri tahrirlash
            </div>
          </div>
          <button class="btn-sm" style="background:#0f766e;color:#fff;border:none;border-radius:6px;padding:6px 12px;font-weight:700;cursor:pointer;" onclick="window.print()">
            🖨 Chop etish (Print)
          </button>
        </div>

        <table class="excel-grid-table">
          <thead>
            <tr>
              <th style="width:75px;">Soat</th>
              ${[1, 2, 3, 4, 5, 6].map(d => `<th>🗓 ${DAY_NAMES[d]}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
    `;

    for (let pIdx = 0; pIdx < DEFAULT_PERIODS.length; pIdx++) {
      const pDef = DEFAULT_PERIODS[pIdx];
      const period = pDef.period;

      html += `
        <tr>
          <td style="font-weight:800;font-size:12px;background:var(--bg-subtle);text-align:center;">
            <b>${period}-soat</b><br>
            <span style="font-size:10px;color:var(--text-muted);font-weight:500;">${pDef.start_time}</span>
          </td>
      `;

      for (let day = 1; day <= 6; day++) {
        const key = `${day}_${period}`;
        const item = this.excelLessonsMap[key] || { subject: '', teacher: '', room: '' };
        const conflict = conflicts.find(c => c.key === key);
        const isConflict = Boolean(conflict);

        html += `
          <td class="${isConflict ? 'excel-row-conflict' : ''}" style="min-width:140px;padding:6px;">
            <input type="text" list="excel-subjects-datalist" class="excel-cell-input" style="font-weight:700;font-size:12px;margin-bottom:3px;" placeholder="Fan" value="${item.subject || ''}" oninput="window.AdminView.onExcelCellInput(${day}, ${period}, 'subject', this.value)">
            <input type="text" list="excel-teachers-datalist" class="excel-cell-input ${isConflict ? 'conflict-highlight' : ''}" style="font-size:11.5px;" placeholder="Ustoz" value="${item.teacher || ''}" oninput="window.AdminView.onExcelCellInput(${day}, ${period}, 'teacher', this.value)">
            ${isConflict ? `<div class="excel-conflict-badge" style="font-size:10px;padding:2px 4px;">🚨 ${conflict.otherClass}da band!</div>` : ''}
          </td>
        `;
      }

      html += `</tr>`;
    }

    html += `
          </tbody>
        </table>
      </div>
    `;

    return html;
  },

  onExcelCellInput(day, period, field, value) {
    const key = `${day}_${period}`;
    if (!this.excelLessonsMap[key]) {
      const pDef = DEFAULT_PERIODS.find(p => p.period === period) || DEFAULT_PERIODS[0];
      this.excelLessonsMap[key] = {
        day_of_week: day,
        period,
        start_time: pDef.start_time,
        end_time: pDef.end_time,
        subject: '',
        teacher: '',
        room: ''
      };
    }

    this.excelLessonsMap[key][field] = value;

    // Recalculate conflicts in real-time
    const conflicts = this.calculateExcelConflicts();
    this.excelConflicts = conflicts;

    // Update banner
    const banner = document.getElementById('excel-status-banner');
    if (banner) {
      if (conflicts.length > 0) {
        banner.className = 'excel-status-banner danger';
        banner.innerHTML = `
          <span style="font-size:20px;">🚨</span>
          <div style="flex:1;">
            <b>DIQQAT: ${conflicts.length} ta ustozda dars to‘qnashuvi aniqlandi!</b><br>
            <span style="font-size:11.5px;font-weight:500;">Bitta ustoz bir vaqtda 2 ta sinfda dars o‘ta olmaydi. Qizil rangdagi katakchalarni tekshiring.</span>
          </div>
          <button class="btn-sm" style="background:#dc2626;color:#fff;border:none;border-radius:6px;padding:4px 10px;font-size:11px;font-weight:700;cursor:pointer;" onclick="window.AdminView.showConflictDetailsModal()">Tafsilotlar</button>
        `;
      } else {
        banner.className = 'excel-status-banner success';
        banner.innerHTML = `
          <span style="font-size:20px;">✅</span>
          <div style="flex:1;">
            <b>Ustozlar dars to‘qnashuvi yo‘q!</b> Barcha fanlar va ustozlar taqsimoti to‘g‘ri.
          </div>
        `;
      }
    }

    // Update this specific row DOM if in day view
    const teacherInput = document.getElementById(`teacher-${key}`);
    const badgeDiv = document.getElementById(`badge-${key}`);
    const rowCard = document.getElementById(`row-${key}`);
    const conflict = conflicts.find(c => c.key === key);

    if (teacherInput) {
      if (conflict) {
        teacherInput.classList.add('conflict-highlight');
        if (badgeDiv) {
          badgeDiv.innerHTML = `<div class="excel-conflict-badge">🚨 ${conflict.teacher} ayni paytda "${conflict.otherClass}"da darsda!</div>`;
        }
        if (rowCard) {
          rowCard.style.borderColor = '#ef4444';
          rowCard.style.background = '#fff5f5';
        }
      } else {
        teacherInput.classList.remove('conflict-highlight');
        if (badgeDiv) badgeDiv.innerHTML = '';
        if (rowCard) {
          rowCard.style.borderColor = 'var(--border)';
          rowCard.style.background = 'var(--bg-body)';
        }
      }
    }
  },

  applyQuickSubject(day, period, subjectName) {
    const key = `${day}_${period}`;
    const subjInput = document.getElementById(`subj-${key}`);
    if (subjInput) subjInput.value = subjectName;

    this.onExcelCellInput(day, period, 'subject', subjectName);

    // If a teacher exists for this subject in cachedTeachers, auto-suggest
    const matchedTeacher = this.cachedTeachers.find(t => t.subject && t.subject.toLowerCase() === subjectName.toLowerCase());
    if (matchedTeacher) {
      const tName = `${matchedTeacher.last_name} ${matchedTeacher.first_name}`;
      const teacherInput = document.getElementById(`teacher-${key}`);
      if (teacherInput && !teacherInput.value) {
        teacherInput.value = tName;
        this.onExcelCellInput(day, period, 'teacher', tName);
      }
    }
  },

  clearExcelPeriodRow(day, period) {
    const key = `${day}_${period}`;
    const pDef = DEFAULT_PERIODS.find(p => p.period === period) || DEFAULT_PERIODS[0];
    this.excelLessonsMap[key] = {
      day_of_week: day,
      period,
      start_time: pDef.start_time,
      end_time: pDef.end_time,
      subject: '',
      teacher: '',
      room: ''
    };
    const body = document.getElementById('admin-tab-body');
    if (body) this.renderExcelTimetable(body);
  },

  fillStandardExcelTemplate() {
    for (let day = 1; day <= 6; day++) {
      for (let pIdx = 0; pIdx < DEFAULT_PERIODS.length; pIdx++) {
        const pDef = DEFAULT_PERIODS[pIdx];
        const key = `${day}_${pDef.period}`;
        if (!this.excelLessonsMap[key]) {
          this.excelLessonsMap[key] = {
            day_of_week: day,
            period: pDef.period,
            start_time: pDef.start_time,
            end_time: pDef.end_time,
            subject: '',
            teacher: '',
            room: ''
          };
        } else {
          this.excelLessonsMap[key].start_time = pDef.start_time;
          this.excelLessonsMap[key].end_time = pDef.end_time;
        }
      }
    }
    window.App.showToast('Standart dars vaqtlari (1-7 soatlar) to‘ldirildi', 'info');
    const body = document.getElementById('admin-tab-body');
    if (body) this.renderExcelTimetable(body);
  },

  clearCurrentExcelDay() {
    if (this.excelActiveDay === 'matrix') {
      if (confirm('Barcha hafta kunlaridagi darslarni tozalamoqchimisiz?')) {
        this.excelLessonsMap = {};
        this.fillStandardExcelTemplate();
      }
      return;
    }

    if (confirm(`${DAY_NAMES[this.excelActiveDay]} kunidagi darslarni tozalamoqchimisiz?`)) {
      for (let p = 1; p <= 7; p++) {
        const key = `${this.excelActiveDay}_${p}`;
        const pDef = DEFAULT_PERIODS.find(pd => pd.period === p) || DEFAULT_PERIODS[0];
        this.excelLessonsMap[key] = {
          day_of_week: this.excelActiveDay,
          period: p,
          start_time: pDef.start_time,
          end_time: pDef.end_time,
          subject: '',
          teacher: '',
          room: ''
        };
      }
      const body = document.getElementById('admin-tab-body');
      if (body) this.renderExcelTimetable(body);
    }
  },

  openCopyFromClassModal() {
    const otherClasses = this.cachedClasses.filter(c => c.id !== this.excelSelectedClassId);
    if (otherClasses.length === 0) {
      return window.App.showToast('Boshqa sinflar mavjud emas', 'error');
    }

    const bodyHtml = `
      <div class="form-group">
        <label class="form-label">Qaysi sinf dars jadvalini nusxalamoqchisiz?</label>
        <select id="copy-source-class-select" class="custom-select" style="font-size:14px;font-weight:700;">
          ${otherClasses.map(c => `<option value="${c.id}">🏫 ${c.name}</option>`).join('')}
        </select>
      </div>
      <p style="font-size:12px;color:var(--text-muted);margin-bottom:14px;">
        Tanlangan sinfning barcha haftalik dars jadvali ushbu sinfga ko‘chirib o‘tkaziladi. Saqlashdan oldin tahrirlashingiz mumkin.
      </p>
      <button class="admin-action-btn" onclick="window.AdminView.submitCopyFromClass()">Nusxani Ko‘chirish</button>
    `;
    window.App.showCustomModal('Boshqa Sinfdan Nusxalash', bodyHtml);
  },

  async submitCopyFromClass() {
    const sourceId = document.getElementById('copy-source-class-select')?.value;
    if (!sourceId) return;

    try {
      window.App.showToast('Jadval ko‘chirilmoqda...', 'info');
      const scheduleData = await Api.getClassSchedule(sourceId);
      const weekly = scheduleData.weekly || {};

      this.excelLessonsMap = {};
      for (let day = 1; day <= 6; day++) {
        const dayLessons = weekly[day]?.lessons || [];
        for (let pIdx = 0; pIdx < DEFAULT_PERIODS.length; pIdx++) {
          const pDef = DEFAULT_PERIODS[pIdx];
          const found = dayLessons[pIdx] || dayLessons.find(l => l.start_time === pDef.start_time);
          const key = `${day}_${pDef.period}`;
          this.excelLessonsMap[key] = {
            day_of_week: day,
            period: pDef.period,
            start_time: found?.start_time || pDef.start_time,
            end_time: found?.end_time || pDef.end_time,
            subject: found?.subject || '',
            teacher: found?.teacher || '',
            room: found?.room || ''
          };
        }
      }

      window.App.closeModal();
      window.App.showToast('Jadval ko‘chirildi! Saqlashni unutmang.', 'success');
      const body = document.getElementById('admin-tab-body');
      if (body) this.renderExcelTimetable(body);
    } catch (err) {
      window.App.showToast(err.message, 'error');
    }
  },

  showConflictDetailsModal() {
    const conflicts = this.excelConflicts || [];
    if (conflicts.length === 0) {
      return window.App.showToast('To‘qnashuvlar yo‘q', 'info');
    }

    const bodyHtml = `
      <div style="margin-bottom:12px;font-size:13px;color:#991b1b;background:#fee2e2;border:1px solid #fca5a5;padding:10px 12px;border-radius:8px;">
        <b>🚨 Jami ${conflicts.length} ta dars to‘qnashuvi aniqlandi:</b>
      </div>
      <div style="max-height:280px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;">
        ${conflicts.map((c, i) => `
          <div style="background:var(--bg-body);border-left:4px solid #ef4444;border-radius:6px;padding:8px 10px;font-size:12.5px;">
            <div style="font-weight:800;color:var(--text-main);">${i + 1}. 👨‍🏫 ${c.teacher}</div>
            <div style="color:var(--text-muted);font-size:11.5px;margin-top:2px;">
              🗓 <b>${DAY_NAMES[c.day]}</b>, ⏰ ${c.period}-soat (${c.otherTime})
            </div>
            <div style="color:#dc2626;font-weight:700;font-size:11.5px;margin-top:2px;">
              🏫 Band bo‘lgan sinf: <b>${c.otherClass}</b> (${c.subject})
            </div>
          </div>
        `).join('')}
      </div>
      <div style="margin-top:14px;text-align:right;">
        <button class="btn-sm" style="background:var(--primary);color:#fff;border:none;border-radius:8px;padding:8px 16px;font-weight:700;cursor:pointer;" onclick="window.App.closeModal()">
          Tushunarli, to‘g‘rilayman
        </button>
      </div>
    `;

    window.App.showCustomModal('⚠️ Ustozlar To‘qnashuvi Tafsilotlari', bodyHtml);
  },

  async saveExcelTimetable(force = false) {
    if (!this.excelSelectedClassId) {
      return window.App.showToast('Sinf tanlanmagan', 'error');
    }

    // Gather valid lessons
    const validLessons = [];
    for (let day = 1; day <= 6; day++) {
      for (let p = 1; p <= 7; p++) {
        const key = `${day}_${p}`;
        const item = this.excelLessonsMap[key];
        if (item && item.subject && item.subject.trim()) {
          validLessons.push({
            day_of_week: day,
            start_time: item.start_time || '08:00',
            end_time: item.end_time || '08:45',
            subject: item.subject.trim(),
            teacher: item.teacher ? item.teacher.trim() : null,
            room: item.room ? item.room.trim() : null
          });
        }
      }
    }

    // Check conflicts
    const conflicts = this.calculateExcelConflicts();
    if (conflicts.length > 0 && !force) {
      const confirmHtml = `
        <div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:10px;padding:12px;margin-bottom:14px;color:#991b1b;">
          <div style="font-weight:800;font-size:14px;margin-bottom:4px;">⚠️ DIQQAT: ${conflicts.length} ta ustozda dars to‘qnashuvi bor!</div>
          <div style="font-size:12px;">Ustoz bir vaqtning o‘zida 2 ta sinfda dars bera olmaydi.</div>
        </div>

        <div style="max-height:220px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;margin-bottom:16px;">
          ${conflicts.slice(0, 5).map(c => `
            <div style="font-size:12px;background:var(--bg-body);padding:6px 10px;border-radius:6px;border-left:3px solid #ef4444;">
              👨‍🏫 <b>${c.teacher}</b> — ${DAY_NAMES[c.day]} (${c.otherClass} da band)
            </div>
          `).join('')}
          ${conflicts.length > 5 ? `<div style="font-size:11px;color:var(--text-muted);text-align:center;">...va yana ${conflicts.length - 5} ta to‘qnashuv</div>` : ''}
        </div>

        <div style="display:flex;gap:8px;">
          <button class="btn-sm" style="flex:1;background:var(--bg-subtle);color:var(--text-main);border:1px solid var(--border);border-radius:8px;padding:10px;font-weight:700;cursor:pointer;" onclick="window.App.closeModal()">
            Bekor qilish va to‘g‘rilash
          </button>
          <button class="btn-sm" style="flex:1;background:#dc2626;color:#fff;border:none;border-radius:8px;padding:10px;font-weight:700;cursor:pointer;" onclick="window.AdminView.saveExcelTimetable(true)">
            Baribir Saqlash
          </button>
        </div>
      `;
      return window.App.showCustomModal('⚠️ To‘qnashuv haqida ogohlantirish', confirmHtml);
    }

    try {
      window.App.showToast('Jadval saqlanmoqda...', 'info');
      const res = await Api.saveClassTimetable({
        classId: this.excelSelectedClassId,
        lessons: validLessons,
        force
      });

      window.App.closeModal();
      window.App.showToast(`🎉 ${res.message || 'Dars jadvali muvaffaqiyatli saqlandi!'}`, 'success');
      
      // Reload in place
      this.excelScheduleLoaded = false;
      const body = document.getElementById('admin-tab-body');
      if (body) this.renderExcelTimetable(body);
    } catch (err) {
      window.App.showToast(`Xatolik: ${err.message}`, 'error');
    }
  },

  // =========================================================
  // TO‘QNASHUVLAR TAHLILI (CONFLICTS TAB)
  // =========================================================
  async renderConflictsTab(container) {
    const res = await Api.getTeacherConflicts();
    const conflicts = res.conflicts || [];

    let html = `
      <div class="welcome-card" style="margin-bottom:16px;">
        <div class="welcome-title">Maktab Dars To‘qnashuvlari Tahlili</div>
        <div class="welcome-subtitle">Bir vaqtning o‘zida 2 ta sinfda darsi qo‘yilgan ustozlar monitoringi</div>
      </div>
    `;

    if (conflicts.length === 0) {
      html += `
        <div class="state-box" style="background:#ecfdf5;border:1px solid #a7f3d0;">
          <div style="font-size:36px;margin-bottom:8px;">🎉</div>
          <div class="state-title" style="color:#065f46;">To‘qnashuvlar topilmadi!</div>
          <div class="state-desc" style="color:#047857;">Maktabingizdagi barcha sinflar va ustozlar dars taqsimoti 100% to‘g‘ri tuzilgan.</div>
          <button class="admin-action-btn" style="background:#059669;margin-top:14px;" onclick="window.AdminView.switchTab('excel')">
            📊 Excel Jadvaliga o‘tish
          </button>
        </div>
      `;
    } else {
      html += `
        <div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:12px;padding:12px 14px;margin-bottom:14px;color:#991b1b;">
          <div style="font-weight:800;font-size:15px;">🚨 Jami ${conflicts.length} ta to‘qnashuv mavjud!</div>
          <div style="font-size:12px;margin-top:2px;">Quyidagi ustozlar bir vaqtda bir nechta sinfga biriktirilgan:</div>
        </div>

        <div style="display:flex;flex-direction:column;gap:10px;">
      `;

      conflicts.forEach((c, idx) => {
        html += `
          <div style="background:var(--bg-card);border:1px solid var(--border);border-left:4px solid #ef4444;border-radius:10px;padding:12px;box-shadow:var(--shadow-sm);">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;">
              <div>
                <div style="font-weight:800;font-size:15px;color:var(--text-main);">
                  ${idx + 1}. 👨‍🏫 ${c.teacher}
                </div>
                <div style="font-size:12.5px;color:var(--text-muted);margin-top:3px;">
                  🗓 <b>${DAY_NAMES[c.day_of_week] || c.day_of_week}</b> | ⏰ <b>${c.time}</b>
                </div>
                <div style="font-size:12.5px;color:#dc2626;font-weight:700;margin-top:4px;">
                  To‘qnashgan sinflar: ${c.classes.map(cl => `<span style="background:#fee2e2;padding:2px 6px;border-radius:4px;margin-right:4px;">🏫 ${cl.name} (${cl.subject})</span>`).join('')}
                </div>
              </div>
            </div>

            <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;">
              ${c.classes.map(cl => `
                <button class="btn-sm" style="background:var(--primary-subtle);color:var(--primary);border:1px solid var(--border);border-radius:6px;padding:4px 8px;font-size:11px;font-weight:700;cursor:pointer;" onclick="window.AdminView.excelSelectedClassId = ${cl.group_id}; window.AdminView.excelScheduleLoaded = false; window.AdminView.excelActiveDay = ${c.day_of_week}; window.AdminView.switchTab('excel');">
                  ✏️ ${cl.name} jadvalini ochish
                </button>
              `).join('')}
            </div>
          </div>
        `;
      });

      html += `</div>`;
    }

    container.innerHTML = html;
  },

  // 1. STATS
  async renderStats(container) {
    const stats = await Api.getAdminStats(window.App.currentSchoolCode);
    container.innerHTML = `
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:12px 14px;margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-size:11px;color:var(--text-muted);font-weight:700;">BOTGA ULANISH KODI:</div>
            <div style="font-size:20px;font-weight:800;color:var(--primary);">${window.App.currentSchoolCode}</div>
          </div>
          <button class="btn-sm" style="background:var(--primary);color:#fff;border:none;border-radius:6px;padding:6px 12px;cursor:pointer;font-weight:700;display:inline-flex;align-items:center;gap:4px;" onclick="navigator.clipboard?.writeText('${window.App.currentSchoolCode}'); window.App.showToast('Kodi nusxalandi: ${window.App.currentSchoolCode}', 'success');">
            ${Icons.copy} Kodni nusxalash
          </button>
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:6px;">
          O‘quvchilar va guruhlar botga kirib <b>${window.App.currentSchoolCode}</b> deb yozsa, to‘g‘ridan-to‘g‘ri ushbu maktab dars jadvali ochiladi.
        </div>
      </div>

      <div class="admin-stats-grid">
        <div class="stat-box">
          <div class="stat-val">${stats.classesCount || 0}</div>
          <div class="stat-label">Sinflar</div>
        </div>
        <div class="stat-box">
          <div class="stat-val">${stats.teachersCount || 0}</div>
          <div class="stat-label">O‘qituvchilar</div>
        </div>
        <div class="stat-box">
          <div class="stat-val">${stats.subjectsCount || 0}</div>
          <div class="stat-label">Fanlar</div>
        </div>
        <div class="stat-box">
          <div class="stat-val">${stats.lessonsCount || 0}</div>
          <div class="stat-label">Darslar</div>
        </div>
      </div>
    `;
  },

  // 2. CLASSES
  async renderClasses(container) {
    const classes = await Api.getClasses(window.App.currentSchoolCode);
    let html = `
      <button class="admin-action-btn" onclick="window.AdminView.openAddClassModal()" style="display:inline-flex;align-items:center;justify-content:center;gap:6px;">
        ${Icons.plus} Yangi Sinf Qo‘shish
      </button>
      <div class="lessons-list">
    `;

    if (classes.length === 0) {
      html += `<div class="state-box"><div class="state-title">Ushbu maktabda hozircha sinflar yo‘q</div></div>`;
    } else {
      classes.forEach(c => {
        html += `
          <div class="admin-list-item">
            <div>
              <div class="admin-item-title">${c.name}</div>
              <div class="admin-item-subtitle">Yuborish: ${c.send_time} | Darslar: ${c.lessons_count || 0} ta</div>
            </div>
            <div class="admin-btn-group">
              <button class="btn-icon-action" onclick="window.AdminView.openEditClassModal(${c.id}, '${c.name}', '${c.send_time}')">${Icons.edit}</button>
              <button class="btn-icon-action danger" onclick="window.AdminView.deleteClass(${c.id}, '${c.name}')">${Icons.trash}</button>
            </div>
          </div>
        `;
      });
    }
    html += `</div>`;
    container.innerHTML = html;
  },

  openAddClassModal() {
    const bodyHtml = `
      <div class="form-group">
        <label class="form-label">Sinf Nomi:</label>
        <input type="text" id="add-class-name" class="form-control" placeholder="Masalan: 10-A sinf">
      </div>
      <div class="form-group">
        <label class="form-label">Dars jadvalini yuborish vaqti:</label>
        <input type="time" id="add-class-time" class="form-control" value="06:00">
      </div>
      <button class="admin-action-btn" onclick="window.AdminView.submitAddClass()">Sinfni Saqlash</button>
    `;
    window.App.showCustomModal('Yangi Sinf Qo‘shish', bodyHtml);
  },

  async submitAddClass() {
    const name = document.getElementById('add-class-name')?.value?.trim();
    const send_time = document.getElementById('add-class-time')?.value?.trim();

    if (!name) return window.App.showToast('Sinf nomini kiriting', 'error');

    try {
      await Api.createClass({ name, send_time, school_id: window.App.currentSchoolId });
      window.App.closeModal();
      window.App.showToast('Sinf muvaffaqiyatli qo‘shildi!', 'success');
      this.loadTabContent();
    } catch (err) {
      window.App.showToast(err.message, 'error');
    }
  },

  openEditClassModal(id, currentName, currentTime) {
    const bodyHtml = `
      <div class="form-group">
        <label class="form-label">Sinf Nomi:</label>
        <input type="text" id="edit-class-name" class="form-control" value="${currentName}">
      </div>
      <div class="form-group">
        <label class="form-label">Yuborish vaqti:</label>
        <input type="time" id="edit-class-time" class="form-control" value="${currentTime || '06:00'}">
      </div>
      <button class="admin-action-btn" onclick="window.AdminView.submitEditClass(${id})">O‘zgarishlarni Saqlash</button>
    `;
    window.App.showCustomModal('Sinfni Tahrirlash', bodyHtml);
  },

  async submitEditClass(id) {
    const name = document.getElementById('edit-class-name')?.value?.trim();
    const send_time = document.getElementById('edit-class-time')?.value?.trim();

    try {
      await Api.updateClass(id, { name, send_time });
      window.App.closeModal();
      window.App.showToast('Sinf yangilandi!', 'success');
      this.loadTabContent();
    } catch (err) {
      window.App.showToast(err.message, 'error');
    }
  },

  async deleteClass(id, name) {
    if (confirm(`Haqiqatan ham "${name}" sinfini o‘chirmoqchimisiz?`)) {
      try {
        await Api.deleteClass(id);
        window.App.showToast('Sinf o‘chirildi', 'success');
        this.loadTabContent();
      } catch (err) {
        window.App.showToast(err.message, 'error');
      }
    }
  },

  // 3. TEACHERS
  async renderTeachers(container) {
    const teachers = await Api.getTeachers(window.App.currentSchoolCode);
    let html = `
      <button class="admin-action-btn" onclick="window.AdminView.openAddTeacherModal()" style="display:inline-flex;align-items:center;justify-content:center;gap:6px;">
        ${Icons.plus} O‘qituvchi Qo‘shish
      </button>
      <div class="lessons-list">
    `;

    if (teachers.length === 0) {
      html += `<div class="state-box"><div class="state-title">O‘qituvchilar yo‘q</div></div>`;
    } else {
      teachers.forEach(t => {
        const safeLast = (t.last_name || '').replace(/'/g, "\\'");
        const safeFirst = (t.first_name || '').replace(/'/g, "\\'");
        const safeSubj = (t.subject || '').replace(/'/g, "\\'");
        const safePhone = (t.phone || '').replace(/'/g, "\\'");
        html += `
          <div class="admin-list-item">
            <div>
              <div class="admin-item-title">${t.last_name} ${t.first_name}</div>
              <div class="admin-item-subtitle">${t.subject || 'Fan biriktirilmagan'} ${t.phone ? `| Tel: ${t.phone}` : ''}</div>
            </div>
            <div class="admin-btn-group">
              <button class="btn-icon-action" onclick="window.AdminView.openEditTeacherModal(${t.id}, '${safeLast}', '${safeFirst}', '${safeSubj}', '${safePhone}')">${Icons.edit}</button>
              <button class="btn-icon-action danger" onclick="window.AdminView.deleteTeacher(${t.id})">${Icons.trash}</button>
            </div>
          </div>
        `;
      });
    }
    html += `</div>`;
    container.innerHTML = html;
  },

  openAddTeacherModal() {
    const bodyHtml = `
      <div class="form-group">
        <label class="form-label">Familiya:</label>
        <input type="text" id="add-t-last" class="form-control" placeholder="Masalan: Aliyev">
      </div>
      <div class="form-group">
        <label class="form-label">Ism:</label>
        <input type="text" id="add-t-first" class="form-control" placeholder="Masalan: Rustam">
      </div>
      <div class="form-group">
        <label class="form-label">Fani:</label>
        <input type="text" id="add-t-subj" class="form-control" placeholder="Masalan: Matematika">
      </div>
      <div class="form-group">
        <label class="form-label">Telefon raqami (Ixtiyoriy):</label>
        <input type="text" id="add-t-phone" class="form-control" placeholder="Masalan: +998901234567">
      </div>
      <button class="admin-action-btn" onclick="window.AdminView.submitAddTeacher()">O‘qituvchini Saqlash</button>
    `;
    window.App.showCustomModal('Yangi O‘qituvchi Qo‘shish', bodyHtml);
  },

  async submitAddTeacher() {
    const last_name = document.getElementById('add-t-last')?.value?.trim();
    const first_name = document.getElementById('add-t-first')?.value?.trim();
    const subject = document.getElementById('add-t-subj')?.value?.trim();
    const phone = document.getElementById('add-t-phone')?.value?.trim();

    if (!last_name || !first_name) return window.App.showToast('Familiya va ism kiritilishi shart', 'error');

    try {
      await Api.createTeacher({ last_name, first_name, subject, phone, school_id: window.App.currentSchoolId });
      window.App.closeModal();
      window.App.showToast('O‘qituvchi saqlandi', 'success');
      this.loadTabContent();
    } catch (err) {
      window.App.showToast(err.message, 'error');
    }
  },

  openEditTeacherModal(id, currentLast, currentFirst, currentSubj, currentPhone) {
    const bodyHtml = `
      <div class="form-group">
        <label class="form-label">Familiya:</label>
        <input type="text" id="edit-t-last" class="form-control" value="${currentLast}">
      </div>
      <div class="form-group">
        <label class="form-label">Ism:</label>
        <input type="text" id="edit-t-first" class="form-control" value="${currentFirst}">
      </div>
      <div class="form-group">
        <label class="form-label">Fani:</label>
        <input type="text" id="edit-t-subj" class="form-control" value="${currentSubj}">
      </div>
      <div class="form-group">
        <label class="form-label">Telefon raqami:</label>
        <input type="text" id="edit-t-phone" class="form-control" value="${currentPhone}">
      </div>
      <button class="admin-action-btn" onclick="window.AdminView.submitEditTeacher(${id})">O‘zgarishlarni Saqlash</button>
    `;
    window.App.showCustomModal('O‘qituvchini Tahrirlash', bodyHtml);
  },

  async submitEditTeacher(id) {
    const last_name = document.getElementById('edit-t-last')?.value?.trim();
    const first_name = document.getElementById('edit-t-first')?.value?.trim();
    const subject = document.getElementById('edit-t-subj')?.value?.trim();
    const phone = document.getElementById('edit-t-phone')?.value?.trim();

    if (!last_name || !first_name) return window.App.showToast('Familiya va ism kiritilishi shart', 'error');

    try {
      await Api.updateTeacher(id, { last_name, first_name, subject, phone });
      window.App.closeModal();
      window.App.showToast('O‘qituvchi yangilandi!', 'success');
      this.loadTabContent();
    } catch (err) {
      window.App.showToast(err.message, 'error');
    }
  },

  async deleteTeacher(id) {
    if (confirm('O‘qituvchini o‘chirmoqchimisiz?')) {
      try {
        await Api.deleteTeacher(id);
        window.App.showToast('O‘qituvchi o‘chirildi', 'success');
        this.loadTabContent();
      } catch (err) {
        window.App.showToast(err.message, 'error');
      }
    }
  },

  // 4. SUBJECTS
  async renderSubjects(container) {
    const subjects = await Api.getSubjects(window.App.currentSchoolCode);
    let html = `
      <button class="admin-action-btn" onclick="window.AdminView.openAddSubjectModal()" style="display:inline-flex;align-items:center;justify-content:center;gap:6px;">
        ${Icons.plus} Yangi Fan Qo‘shish
      </button>
      <div class="lessons-list">
    `;

    if (subjects.length === 0) {
      html += `<div class="state-box"><div class="state-title">Fanlar yo‘q</div></div>`;
    } else {
      subjects.forEach(s => {
        html += `
          <div class="admin-list-item">
            <div>
              <div class="admin-item-title">${s.name}</div>
            </div>
            <div class="admin-btn-group">
              <button class="btn-icon-action danger" onclick="window.AdminView.deleteSubject(${s.id})">${Icons.trash}</button>
            </div>
          </div>
        `;
      });
    }
    html += `</div>`;
    container.innerHTML = html;
  },

  openAddSubjectModal() {
    const bodyHtml = `
      <div class="form-group">
        <label class="form-label">Fan Nomi:</label>
        <input type="text" id="add-s-name" class="form-control" placeholder="Masalan: Kimyo">
      </div>
      <button class="admin-action-btn" onclick="window.AdminView.submitAddSubject()">Fanni Saqlash</button>
    `;
    window.App.showCustomModal('Yangi Fan Qo‘shish', bodyHtml);
  },

  async submitAddSubject() {
    const name = document.getElementById('add-s-name')?.value?.trim();
    if (!name) return window.App.showToast('Fan nomini kiriting', 'error');

    try {
      await Api.createSubject({ name, school_id: window.App.currentSchoolId });
      window.App.closeModal();
      window.App.showToast('Fan saqlandi', 'success');
      this.loadTabContent();
    } catch (err) {
      window.App.showToast(err.message, 'error');
    }
  },

  async deleteSubject(id) {
    if (confirm('Fanni o‘chirmoqchimisiz?')) {
      try {
        await Api.deleteSubject(id);
        window.App.showToast('Fan o‘chirildi', 'success');
        this.loadTabContent();
      } catch (err) {
        window.App.showToast(err.message, 'error');
      }
    }
  },

  // 5. LESSONS (DARS JADVALINI KIRITISH VA O'ZGARTIRISH)
  async renderLessons(container) {
    const [classes, subjects, teachers] = await Promise.all([
      Api.getClasses(window.App.currentSchoolCode),
      Api.getSubjects(window.App.currentSchoolCode).catch(() => []),
      Api.getTeachers(window.App.currentSchoolCode).catch(() => [])
    ]);

    this.cachedSubjects = subjects || [];
    this.cachedTeachers = teachers || [];

    if (classes.length === 0) {
      container.innerHTML = `<div class="state-box"><div class="state-title">Avval sinflar qo‘shing</div></div>`;
      return;
    }

    const selectedClassId = this.adminSelectedClassId || classes[0].id;
    this.adminSelectedClassId = selectedClassId;

    const scheduleData = await Api.getClassSchedule(selectedClassId);
    const weekly = scheduleData.weekly || {};

    let html = `
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:12px 14px;margin-bottom:14px;">
        <label class="form-label" style="font-size:13px;font-weight:700;color:var(--text-main);margin-bottom:6px;display:block;">Sinf dars jadvalini tanlang:</label>
        <select class="custom-select" id="admin-class-select" onchange="window.AdminView.adminSelectedClassId = Number(this.value); window.AdminView.loadTabContent();" style="font-weight:700;font-size:14px;">
          ${classes.map(c => `<option value="${c.id}" ${c.id === selectedClassId ? 'selected' : ''}>🏫 ${c.name} (${c.lessons_count || 0} ta dars)</option>`).join('')}
        </select>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;">
        <button class="admin-action-btn" onclick="window.AdminView.switchTab('excel')" style="background:#0284c7;color:#fff;display:inline-flex;align-items:center;justify-content:center;gap:6px;flex:1.2;min-width:180px;margin-top:0;">
          📊 Dars jadvalini yangilash (Excel)
        </button>
        <button class="btn-sm" onclick="window.AdminView.openAddLessonModal(${selectedClassId})" style="background:var(--bg-card);border:1px solid var(--border);padding:10px 14px;border-radius:10px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:4px;">
          ${Icons.plus} 1 ta dars qo‘shish
        </button>
        <button class="btn-sm" style="background:var(--bg-card);border:1px solid var(--border);padding:10px 14px;border-radius:10px;font-weight:700;cursor:pointer;" onclick="window.AdminView.switchTab('import')">
          ${Icons.upload} Ommaviy Import
        </button>
      </div>
    `;

    const dayNames = { 1: 'Dushanba', 2: 'Seshanba', 3: 'Chorshanba', 4: 'Payshanba', 5: 'Juma', 6: 'Shanba' };

    for (let day = 1; day <= 6; day++) {
      const dayLessons = weekly[day]?.lessons || [];
      html += `
        <div style="margin-top:14px;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:12px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;border-bottom:1px solid var(--border);padding-bottom:6px;">
            <div style="font-size:14px;font-weight:800;color:var(--primary);display:flex;align-items:center;gap:6px;">
              <span>🗓</span> ${dayNames[day]} <span style="font-size:11px;font-weight:600;color:var(--text-muted);">(${dayLessons.length} ta dars)</span>
            </div>
            <button class="btn-sm" style="background:var(--primary-subtle);color:var(--primary);border:none;border-radius:6px;padding:4px 8px;font-size:11px;font-weight:700;cursor:pointer;" onclick="window.AdminView.openAddLessonModal(${selectedClassId}, ${day})">
              + Dars qo‘shish
            </button>
          </div>
          <div class="lessons-list">
      `;

      if (dayLessons.length === 0) {
        html += `<div style="padding:10px;color:var(--text-muted);font-size:12px;text-align:center;">Ushbu kunga darslar kiritilmagan</div>`;
      } else {
        dayLessons.forEach((l, idx) => {
          const safeSubj = (l.subject || '').replace(/'/g, "\\'");
          const safeTeacher = (l.teacher || '').replace(/'/g, "\\'");
          const safeRoom = (l.room || '').replace(/'/g, "\\'");

          html += `
            <div class="admin-list-item" style="border-left:3px solid var(--primary);border-radius:8px;margin-bottom:6px;padding:8px 10px;">
              <div>
                <div class="admin-item-title" style="font-weight:800;font-size:13.5px;">${idx + 1}. ${l.subject}</div>
                <div class="admin-item-subtitle" style="font-size:11.5px;margin-top:2px;">
                  ⏰ <b>${l.start_time} - ${l.end_time}</b> ${l.teacher ? ` | 👨‍🏫 ${l.teacher}` : ''} ${l.room ? ` | 🏫 ${l.room}-xona` : ''}
                </div>
              </div>
              <div class="admin-btn-group">
                <button class="btn-icon-action" onclick="window.AdminView.openEditLessonModal(${l.id}, ${selectedClassId}, ${l.day_of_week || day}, '${l.start_time}', '${l.end_time}', '${safeSubj}', '${safeTeacher}', '${safeRoom}')" title="Tahrirlash">${Icons.edit}</button>
                <button class="btn-icon-action danger" onclick="window.AdminView.deleteLesson(${l.id})" title="O‘chirish">${Icons.trash}</button>
              </div>
            </div>
          `;
        });
      }
      html += `</div></div>`;
    }

    container.innerHTML = html;
  },

  applyLessonTimePreset(startId, endId, startTime, endTime) {
    const sInput = document.getElementById(startId);
    const eInput = document.getElementById(endId);
    if (sInput) sInput.value = startTime;
    if (eInput) eInput.value = endTime;
  },

  openAddLessonModal(groupId, defaultDay = 1) {
    const subjects = this.cachedSubjects || [];
    const teachers = this.cachedTeachers || [];

    const bodyHtml = `
      <div class="form-group">
        <label class="form-label">Hafta kuni:</label>
        <select id="add-l-day" class="custom-select">
          <option value="1" ${defaultDay === 1 ? 'selected' : ''}>Dushanba</option>
          <option value="2" ${defaultDay === 2 ? 'selected' : ''}>Seshanba</option>
          <option value="3" ${defaultDay === 3 ? 'selected' : ''}>Chorshanba</option>
          <option value="4" ${defaultDay === 4 ? 'selected' : ''}>Payshanba</option>
          <option value="5" ${defaultDay === 5 ? 'selected' : ''}>Juma</option>
          <option value="6" ${defaultDay === 6 ? 'selected' : ''}>Shanba</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Tezkor dars soati:</label>
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px;">
          <button type="button" class="btn-sm" style="font-size:10.5px;padding:4px 6px;border:1px solid var(--border);border-radius:6px;background:var(--bg-body);cursor:pointer;" onclick="window.AdminView.applyLessonTimePreset('add-l-start','add-l-end','08:00','08:45')">1-soat</button>
          <button type="button" class="btn-sm" style="font-size:10.5px;padding:4px 6px;border:1px solid var(--border);border-radius:6px;background:var(--bg-body);cursor:pointer;" onclick="window.AdminView.applyLessonTimePreset('add-l-start','add-l-end','08:50','09:35')">2-soat</button>
          <button type="button" class="btn-sm" style="font-size:10.5px;padding:4px 6px;border:1px solid var(--border);border-radius:6px;background:var(--bg-body);cursor:pointer;" onclick="window.AdminView.applyLessonTimePreset('add-l-start','add-l-end','09:40','10:25')">3-soat</button>
          <button type="button" class="btn-sm" style="font-size:10.5px;padding:4px 6px;border:1px solid var(--border);border-radius:6px;background:var(--bg-body);cursor:pointer;" onclick="window.AdminView.applyLessonTimePreset('add-l-start','add-l-end','10:30','11:15')">4-soat</button>
          <button type="button" class="btn-sm" style="font-size:10.5px;padding:4px 6px;border:1px solid var(--border);border-radius:6px;background:var(--bg-body);cursor:pointer;" onclick="window.AdminView.applyLessonTimePreset('add-l-start','add-l-end','11:20','12:05')">5-soat</button>
          <button type="button" class="btn-sm" style="font-size:10.5px;padding:4px 6px;border:1px solid var(--border);border-radius:6px;background:var(--bg-body);cursor:pointer;" onclick="window.AdminView.applyLessonTimePreset('add-l-start','add-l-end','12:10','12:55')">6-soat</button>
          <button type="button" class="btn-sm" style="font-size:10.5px;padding:4px 6px;border:1px solid var(--border);border-radius:6px;background:var(--bg-body);cursor:pointer;" onclick="window.AdminView.applyLessonTimePreset('add-l-start','add-l-end','13:00','13:45')">7-soat</button>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <input type="time" id="add-l-start" class="form-control" value="08:00" style="flex:1;">
          <span>—</span>
          <input type="time" id="add-l-end" class="form-control" value="08:45" style="flex:1;">
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Fan nomi:</label>
        <input type="text" id="add-l-subj" list="admin-subjects-datalist" class="form-control" placeholder="Masalan: Matematika">
        <datalist id="admin-subjects-datalist">
          ${subjects.map(s => `<option value="${s.name}">`).join('')}
        </datalist>
      </div>

      <div class="form-group">
        <label class="form-label">O‘qituvchi (Ustoz):</label>
        <input type="text" id="add-l-teacher" list="admin-teachers-datalist" class="form-control" placeholder="Masalan: Aliyev Rustam">
        <datalist id="admin-teachers-datalist">
          ${teachers.map(t => `<option value="${t.last_name} ${t.first_name}">`).join('')}
        </datalist>
      </div>

      <div class="form-group">
        <label class="form-label">Xona (Ixtiyoriy):</label>
        <input type="text" id="add-l-room" class="form-control" placeholder="Masalan: 204">
      </div>

      <button class="admin-action-btn" onclick="window.AdminView.submitAddLesson(${groupId})">Darsni Saqlash</button>
    `;
    window.App.showCustomModal('Yangi Dars Qo‘shish', bodyHtml);
  },

  async submitAddLesson(groupId) {
    const day_of_week = document.getElementById('add-l-day')?.value;
    const start_time = document.getElementById('add-l-start')?.value;
    const end_time = document.getElementById('add-l-end')?.value;
    const subject = document.getElementById('add-l-subj')?.value?.trim();
    const teacher = document.getElementById('add-l-teacher')?.value?.trim();
    const room = document.getElementById('add-l-room')?.value?.trim();

    if (!subject) return window.App.showToast('Fan nomini kiriting', 'error');

    try {
      await Api.createLesson({
        school_id: window.App.currentSchoolId,
        group_id: groupId,
        day_of_week,
        start_time,
        end_time,
        subject,
        teacher,
        room
      });
      window.App.closeModal();
      window.App.showToast('Dars muvaffaqiyatli saqlandi!', 'success');
      this.loadTabContent();
    } catch (err) {
      window.App.showToast(err.message, 'error');
    }
  },

  openEditLessonModal(lessonId, groupId, currentDay, currentStart, currentEnd, currentSubj, currentTeacher, currentRoom) {
    const subjects = this.cachedSubjects || [];
    const teachers = this.cachedTeachers || [];

    const bodyHtml = `
      <div class="form-group">
        <label class="form-label">Hafta kuni:</label>
        <select id="edit-l-day" class="custom-select">
          <option value="1" ${Number(currentDay) === 1 ? 'selected' : ''}>Dushanba</option>
          <option value="2" ${Number(currentDay) === 2 ? 'selected' : ''}>Seshanba</option>
          <option value="3" ${Number(currentDay) === 3 ? 'selected' : ''}>Chorshanba</option>
          <option value="4" ${Number(currentDay) === 4 ? 'selected' : ''}>Payshanba</option>
          <option value="5" ${Number(currentDay) === 5 ? 'selected' : ''}>Juma</option>
          <option value="6" ${Number(currentDay) === 6 ? 'selected' : ''}>Shanba</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Tezkor dars soati:</label>
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px;">
          <button type="button" class="btn-sm" style="font-size:10.5px;padding:4px 6px;border:1px solid var(--border);border-radius:6px;background:var(--bg-body);cursor:pointer;" onclick="window.AdminView.applyLessonTimePreset('edit-l-start','edit-l-end','08:00','08:45')">1-soat</button>
          <button type="button" class="btn-sm" style="font-size:10.5px;padding:4px 6px;border:1px solid var(--border);border-radius:6px;background:var(--bg-body);cursor:pointer;" onclick="window.AdminView.applyLessonTimePreset('edit-l-start','edit-l-end','08:50','09:35')">2-soat</button>
          <button type="button" class="btn-sm" style="font-size:10.5px;padding:4px 6px;border:1px solid var(--border);border-radius:6px;background:var(--bg-body);cursor:pointer;" onclick="window.AdminView.applyLessonTimePreset('edit-l-start','edit-l-end','09:40','10:25')">3-soat</button>
          <button type="button" class="btn-sm" style="font-size:10.5px;padding:4px 6px;border:1px solid var(--border);border-radius:6px;background:var(--bg-body);cursor:pointer;" onclick="window.AdminView.applyLessonTimePreset('edit-l-start','edit-l-end','10:30','11:15')">4-soat</button>
          <button type="button" class="btn-sm" style="font-size:10.5px;padding:4px 6px;border:1px solid var(--border);border-radius:6px;background:var(--bg-body);cursor:pointer;" onclick="window.AdminView.applyLessonTimePreset('edit-l-start','edit-l-end','11:20','12:05')">5-soat</button>
          <button type="button" class="btn-sm" style="font-size:10.5px;padding:4px 6px;border:1px solid var(--border);border-radius:6px;background:var(--bg-body);cursor:pointer;" onclick="window.AdminView.applyLessonTimePreset('edit-l-start','edit-l-end','12:10','12:55')">6-soat</button>
          <button type="button" class="btn-sm" style="font-size:10.5px;padding:4px 6px;border:1px solid var(--border);border-radius:6px;background:var(--bg-body);cursor:pointer;" onclick="window.AdminView.applyLessonTimePreset('edit-l-start','edit-l-end','13:00','13:45')">7-soat</button>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <input type="time" id="edit-l-start" class="form-control" value="${currentStart}" style="flex:1;">
          <span>—</span>
          <input type="time" id="edit-l-end" class="form-control" value="${currentEnd}" style="flex:1;">
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Fan nomi:</label>
        <input type="text" id="edit-l-subj" list="admin-subjects-datalist-edit" class="form-control" value="${currentSubj}">
        <datalist id="admin-subjects-datalist-edit">
          ${subjects.map(s => `<option value="${s.name}">`).join('')}
        </datalist>
      </div>

      <div class="form-group">
        <label class="form-label">O‘qituvchi (Ustoz):</label>
        <input type="text" id="edit-l-teacher" list="admin-teachers-datalist-edit" class="form-control" value="${currentTeacher}">
        <datalist id="admin-teachers-datalist-edit">
          ${teachers.map(t => `<option value="${t.last_name} ${t.first_name}">`).join('')}
        </datalist>
      </div>

      <div class="form-group">
        <label class="form-label">Xona (Ixtiyoriy):</label>
        <input type="text" id="edit-l-room" class="form-control" value="${currentRoom}">
      </div>

      <button class="admin-action-btn" onclick="window.AdminView.submitEditLesson(${lessonId})">O‘zgarishlarni Saqlash</button>
    `;
    window.App.showCustomModal('Darsni Tahrirlash', bodyHtml);
  },

  async submitEditLesson(lessonId) {
    const day_of_week = document.getElementById('edit-l-day')?.value;
    const start_time = document.getElementById('edit-l-start')?.value;
    const end_time = document.getElementById('edit-l-end')?.value;
    const subject = document.getElementById('edit-l-subj')?.value?.trim();
    const teacher = document.getElementById('edit-l-teacher')?.value?.trim();
    const room = document.getElementById('edit-l-room')?.value?.trim();

    if (!subject) return window.App.showToast('Fan nomini kiriting', 'error');

    try {
      await Api.updateLesson(lessonId, {
        day_of_week: Number(day_of_week),
        start_time,
        end_time,
        subject,
        teacher,
        room
      });
      window.App.closeModal();
      window.App.showToast('Dars yangilandi!', 'success');
      this.loadTabContent();
    } catch (err) {
      window.App.showToast(err.message, 'error');
    }
  },

  async deleteLesson(id) {
    if (confirm('Darsni o‘chirmoqchimisiz?')) {
      try {
        await Api.deleteLesson(id);
        window.App.showToast('Dars o‘chirildi', 'success');
        this.loadTabContent();
      } catch (err) {
        window.App.showToast(err.message, 'error');
      }
    }
  },

  // 6. IMPORT
  async renderImport(container) {
    container.innerHTML = `
      <div class="welcome-card" style="margin-bottom:16px;">
        <div class="welcome-title">Dars Jadvallarini Ommaviy Yuklash</div>
        <div class="welcome-subtitle">Barcha sinflar va darslarni 1 zumda saytga kiritish</div>
      </div>

      <div class="profile-card" style="text-align:left;">
        <div style="font-size:13px;font-weight:700;margin-bottom:6px;">Format namunasi (JSON):</div>
        <textarea id="import-json-text" class="template-textarea" style="height:160px;font-family:monospace;font-size:11px;" placeholder='[
  {
    "name": "11-A sinf",
    "lessons": [
      { "day_of_week": 1, "start_time": "08:30", "end_time": "09:15", "subject": "Matematika", "teacher": "Aliyev" },
      { "day_of_week": 1, "start_time": "09:20", "end_time": "10:05", "subject": "Ona tili", "teacher": "Karimova" }
    ]
  }
]'></textarea>

        <button class="admin-action-btn" style="margin-top:10px;display:inline-flex;align-items:center;justify-content:center;gap:6px;" onclick="window.AdminView.submitImport()">
          ${Icons.upload} Jadvalni Bazaga Yuklash
        </button>
      </div>
    `;
  },

  async submitImport() {
    const jsonStr = document.getElementById('import-json-text')?.value?.trim();
    if (!jsonStr) return window.App.showToast('Jadval ma’lumotini kiriting', 'error');

    try {
      const parsed = JSON.parse(jsonStr);
      const classes = Array.isArray(parsed) ? parsed : [parsed];
      window.App.showToast('Yuklanmoqda...', 'info');
      const res = await Api.importTimetable({ classes, school_id: window.App.currentSchoolId });
      window.App.showToast(res.message, 'success');
      this.switchTab('classes');
    } catch (err) {
      window.App.showToast(`Xatolik: ${err.message}`, 'error');
    }
  },

  // 7. BROADCAST
  async renderBroadcast(container) {
    const classes = await Api.getClasses(window.App.currentSchoolCode);

    container.innerHTML = `
      <div class="welcome-card" style="margin-bottom:16px;">
        <div class="welcome-title">Telegram Guruhlarga Yuborish</div>
        <div class="welcome-subtitle">Bugungi dars jadvalini Telegram guruhlariga darhol jo‘natish</div>
      </div>

      <div class="form-group">
        <label class="form-label">Qaysi sinfga yuborilsin?</label>
        <select id="broadcast-class" class="custom-select">
          <option value="all">Barcha faol sinflarga</option>
          ${classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
        </select>
      </div>

      <button class="admin-action-btn" onclick="window.AdminView.triggerBroadcast()" style="display:inline-flex;align-items:center;justify-content:center;gap:6px;">
        ${Icons.send} Hozir Yuborish
      </button>
    `;
  },

  async triggerBroadcast() {
    const classId = document.getElementById('broadcast-class')?.value;
    if (confirm('Bugungi dars jadvali Telegram guruhlariga yuborilsinmi?')) {
      try {
        window.App.showToast('Yuborilmoqda...', 'info');
        await Api.sendNow(classId);
        window.App.showToast(`Muvaffaqiyatli yuborildi!`, 'success');
      } catch (err) {
        window.App.showToast(err.message, 'error');
      }
    }
  }
};
