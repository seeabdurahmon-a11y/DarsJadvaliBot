import { Api } from './api.js';
import { TelegramApp } from './telegram.js';

export const AdminView = {
  currentTab: 'stats', // 'stats' | 'classes' | 'teachers' | 'subjects' | 'lessons' | 'import' | 'broadcast'

  async render(container) {
    // Check if user is logged in as Admin (via Telegram or School Token)
    const token = localStorage.getItem('maktab_school_token');
    if (!window.App.isAdmin && !token) {
      return this.renderLoginView(container);
    }

    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:12px 14px;">
        <div>
          <div style="font-size:11px;color:var(--text-muted);font-weight:700;">MAKTAB BOSHQARUV PANELI</div>
          <div style="font-size:15px;font-weight:800;color:var(--primary);">${window.App.currentSchoolName || 'Maktab'} <span style="background:var(--primary);color:#fff;font-size:11px;padding:2px 6px;border-radius:4px;margin-left:4px;">${window.App.currentSchoolCode}</span></div>
        </div>
        <button class="btn-sm" style="background:var(--danger);color:#fff;border:none;border-radius:6px;padding:6px 10px;cursor:pointer;" onclick="window.AdminView.logout()">🚪 Chiqish</button>
      </div>

      <div class="tab-pills" id="admin-pills" style="overflow-x:auto;white-space:nowrap;">
        <button class="tab-pill active" onclick="window.AdminView.switchTab('stats')">📊 Statistika</button>
        <button class="tab-pill" onclick="window.AdminView.switchTab('classes')">🏫 Sinflar</button>
        <button class="tab-pill" onclick="window.AdminView.switchTab('teachers')">👨‍🏫 Ustozlar</button>
        <button class="tab-pill" onclick="window.AdminView.switchTab('subjects')">📚 Fanlar</button>
        <button class="tab-pill" onclick="window.AdminView.switchTab('lessons')">📅 Dars jadvali</button>
        <button class="tab-pill" onclick="window.AdminView.switchTab('import')">📥 Jadval yuklash</button>
        <button class="tab-pill" onclick="window.AdminView.switchTab('broadcast')">📤 Hozir yuborish</button>
      </div>

      <div id="admin-tab-body">
        <div class="state-box"><div class="skeleton" style="height:140px;"></div></div>
      </div>
    `;

    this.loadTabContent();
  },

  renderLoginView(container) {
    container.innerHTML = `
      <div class="welcome-card" style="margin-bottom:16px;">
        <div class="welcome-title">🔐 Maktab Boshqaruv Paneli</div>
        <div class="welcome-subtitle">Dars jadvalini tahrirlash, sinflar va o‘qituvchilarni kiritish uchun maktab parolini kiriting.</div>
      </div>

      <div class="profile-card" style="text-align:left;">
        <div class="form-group">
          <label class="form-label">Maktab Kodi:</label>
          <input type="text" id="admin-login-code" class="form-control" value="${window.App.currentSchoolCode || 'M-01'}" placeholder="Masalan: M-01" style="text-transform:uppercase;font-weight:700;">
        </div>

        <div class="form-group">
          <label class="form-label">Admin Paroli:</label>
          <input type="password" id="admin-login-pwd" class="form-control" placeholder="Parolni kiriting">
        </div>

        <button class="admin-action-btn" style="margin-top:10px;" onclick="window.AdminView.submitLogin()">🔑 Tizimga kirish</button>

        <hr style="margin:20px 0;border:none;border-top:1px solid var(--border);">

        <div style="text-align:center;">
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;">Yangi maktabni tizimga ulamoqchimisiz?</div>
          <button class="btn-icon-action" style="width:100%;padding:10px;" onclick="window.AdminView.openRegisterSchoolModal()">➕ Yangi maktab ro‘yxatdan o‘tkazish</button>
        </div>
      </div>
    `;
  },

  async submitLogin() {
    const code = document.getElementById('admin-login-code')?.value?.trim();
    const password = document.getElementById('admin-login-pwd')?.value?.trim();

    if (!code || !password) {
      return window.App.showToast('Maktab kodi va parolini kiriting', 'error');
    }

    try {
      window.App.showToast('Kirilmoqda...', 'info');
      const res = await Api.loginSchool(code, password);
      localStorage.setItem('maktab_school_token', res.token);
      localStorage.setItem('maktab_selected_school_code', res.school.code);
      localStorage.setItem('maktab_selected_school_name', res.school.name);
      localStorage.setItem('maktab_selected_school_id', String(res.school.id));

      window.App.isAdmin = true;
      window.App.currentSchoolCode = res.school.code;
      window.App.currentSchoolName = res.school.name;
      window.App.currentSchoolId = res.school.id;
      window.App.updateHeaderClassPill();

      window.App.showToast(`Xush kelibsiz, ${res.school.name}!`, 'success');
      const container = document.getElementById('admin-view-container');
      if (container) this.render(container);
    } catch (err) {
      window.App.showToast(err.message, 'error');
    }
  },

  logout() {
    localStorage.removeItem('maktab_school_token');
    window.App.isAdmin = false;
    window.App.showToast('Admin paneldan chiqildi', 'info');
    const container = document.getElementById('admin-view-container');
    if (container) this.render(container);
  },

  openRegisterSchoolModal() {
    const bodyHtml = `
      <div class="form-group">
        <label class="form-label">Maktab nomi:</label>
        <input type="text" id="reg-school-name" class="form-control" placeholder="Masalan: 12-IDUM yoki 45-maktab">
      </div>
      <div class="form-group">
        <label class="form-label">Maktab kodi (Ixtiyoriy):</label>
        <input type="text" id="reg-school-code" class="form-control" placeholder="Bo‘sh qoldirilsa M-02 kabi avtomatik beriladi" style="text-transform:uppercase;">
      </div>
      <div class="form-group">
        <label class="form-label">Viloyat / Tuman:</label>
        <input type="text" id="reg-school-region" class="form-control" placeholder="Masalan: Toshkent shahar, Yunusobod">
      </div>
      <div class="form-group">
        <label class="form-label">Admin Paroli:</label>
        <input type="text" id="reg-school-pwd" class="form-control" value="admin123">
      </div>
      <button class="admin-action-btn" onclick="window.AdminView.submitRegisterSchool()">🚀 Maktabni Yaratish</button>
    `;
    window.App.showCustomModal('➕ Yangi Maktab Ro‘yxatdan O‘tkazish', bodyHtml);
  },

  async submitRegisterSchool() {
    const name = document.getElementById('reg-school-name')?.value?.trim();
    const code = document.getElementById('reg-school-code')?.value?.trim();
    const region = document.getElementById('reg-school-region')?.value?.trim();
    const admin_password = document.getElementById('reg-school-pwd')?.value?.trim();

    if (!name) {
      return window.App.showToast('Maktab nomini kiriting', 'error');
    }

    try {
      const res = await Api.registerSchool({ name, code, region, admin_password });
      window.App.closeModal();
      window.App.showToast(res.message, 'success');
      localStorage.setItem('maktab_school_token', res.token);
      localStorage.setItem('maktab_selected_school_code', res.school.code);
      localStorage.setItem('maktab_selected_school_name', res.school.name);
      localStorage.setItem('maktab_selected_school_id', String(res.school.id));

      window.App.isAdmin = true;
      window.App.currentSchoolCode = res.school.code;
      window.App.currentSchoolName = res.school.name;
      window.App.currentSchoolId = res.school.id;
      window.App.updateHeaderClassPill();

      const container = document.getElementById('admin-view-container');
      if (container) this.render(container);
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
      if (this.currentTab === 'stats') {
        await this.renderStats(body);
      } else if (this.currentTab === 'classes') {
        await this.renderClasses(body);
      } else if (this.currentTab === 'teachers') {
        await this.renderTeachers(body);
      } else if (this.currentTab === 'subjects') {
        await this.renderSubjects(body);
      } else if (this.currentTab === 'lessons') {
        await this.renderLessons(body);
      } else if (this.currentTab === 'import') {
        await this.renderImport(body);
      } else if (this.currentTab === 'broadcast') {
        await this.renderBroadcast(body);
      }
    } catch (err) {
      body.innerHTML = `
        <div class="state-box">
          <div class="state-icon">⚠️</div>
          <div class="state-title">Yuklashda xatolik</div>
          <div class="state-desc">${err.message}</div>
        </div>
      `;
    }
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
          <button class="btn-sm" style="background:var(--primary);color:#fff;border:none;border-radius:6px;padding:6px 12px;cursor:pointer;font-weight:700;" onclick="navigator.clipboard?.writeText('${window.App.currentSchoolCode}'); window.App.showToast('Kodi nusxalandi: ${window.App.currentSchoolCode}', 'success');">📋 Kodni nusxalash</button>
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:6px;">
          💡 <i>O‘quvchilar va guruhlar botga kirib <b>${window.App.currentSchoolCode}</b> deb yozsa, to‘g‘ridan-to‘g‘ri ushbu maktab dars jadvali ochiladi.</i>
        </div>
      </div>

      <div class="admin-stats-grid">
        <div class="stat-box">
          <div class="stat-val">${stats.classesCount || 0}</div>
          <div class="stat-label">🏫 Sinflar</div>
        </div>
        <div class="stat-box">
          <div class="stat-val">${stats.teachersCount || 0}</div>
          <div class="stat-label">👨‍🏫 O‘qituvchilar</div>
        </div>
        <div class="stat-box">
          <div class="stat-val">${stats.subjectsCount || 0}</div>
          <div class="stat-label">📚 Fanlar</div>
        </div>
        <div class="stat-box">
          <div class="stat-val">${stats.lessonsCount || 0}</div>
          <div class="stat-label">📅 Darslar</div>
        </div>
      </div>
    `;
  },

  // 2. CLASSES
  async renderClasses(container) {
    const classes = await Api.getClasses(window.App.currentSchoolCode);
    let html = `
      <button class="admin-action-btn" onclick="window.AdminView.openAddClassModal()">➕ Yangi Sinf Qo‘shish</button>
      <div class="lessons-list">
    `;

    if (classes.length === 0) {
      html += `<div class="state-box"><div class="state-title">Ushbu maktabda hozircha sinflar yo‘q</div></div>`;
    } else {
      classes.forEach(c => {
        html += `
          <div class="admin-list-item">
            <div>
              <div class="admin-item-title">🏫 ${c.name}</div>
              <div class="admin-item-subtitle">⏰ Yuborish: ${c.send_time} | 📚 Darslar: ${c.lessons_count || 0} ta</div>
            </div>
            <div class="admin-btn-group">
              <button class="btn-icon-action" onclick="window.AdminView.openEditClassModal(${c.id}, '${c.name}', '${c.send_time}')">✏️</button>
              <button class="btn-icon-action danger" onclick="window.AdminView.deleteClass(${c.id}, '${c.name}')">🗑</button>
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
      <button class="admin-action-btn" onclick="window.AdminView.submitAddClass()">💾 Sinfni Saqlash</button>
    `;
    window.App.showCustomModal('➕ Yangi Sinf Qo‘shish', bodyHtml);
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
      <button class="admin-action-btn" onclick="window.AdminView.submitEditClass(${id})">💾 O‘zgarishlarni Saqlash</button>
    `;
    window.App.showCustomModal('✏️ Sinfni Tahrirlash', bodyHtml);
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
      <button class="admin-action-btn" onclick="window.AdminView.openAddTeacherModal()">➕ O‘qituvchi Qo‘shish</button>
      <div class="lessons-list">
    `;

    if (teachers.length === 0) {
      html += `<div class="state-box"><div class="state-title">O‘qituvchilar yo‘q</div></div>`;
    } else {
      teachers.forEach(t => {
        html += `
          <div class="admin-list-item">
            <div>
              <div class="admin-item-title">👨‍🏫 ${t.last_name} ${t.first_name}</div>
              <div class="admin-item-subtitle">📖 ${t.subject || 'Fan biriktirilmagan'} ${t.phone ? `| 📞 ${t.phone}` : ''}</div>
            </div>
            <div class="admin-btn-group">
              <button class="btn-icon-action danger" onclick="window.AdminView.deleteTeacher(${t.id})">🗑</button>
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
      <button class="admin-action-btn" onclick="window.AdminView.submitAddTeacher()">💾 O‘qituvchini Saqlash</button>
    `;
    window.App.showCustomModal('➕ Yangi O‘qituvchi Qo‘shish', bodyHtml);
  },

  async submitAddTeacher() {
    const last_name = document.getElementById('add-t-last')?.value?.trim();
    const first_name = document.getElementById('add-t-first')?.value?.trim();
    const subject = document.getElementById('add-t-subj')?.value?.trim();

    if (!last_name || !first_name) return window.App.showToast('Familiya va ism kiritilishi shart', 'error');

    try {
      await Api.createTeacher({ last_name, first_name, subject, school_id: window.App.currentSchoolId });
      window.App.closeModal();
      window.App.showToast('O‘qituvchi saqlandi', 'success');
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
      <button class="admin-action-btn" onclick="window.AdminView.openAddSubjectModal()">➕ Yangi Fan Qo‘shish</button>
      <div class="lessons-list">
    `;

    if (subjects.length === 0) {
      html += `<div class="state-box"><div class="state-title">Fanlar yo‘q</div></div>`;
    } else {
      subjects.forEach(s => {
        html += `
          <div class="admin-list-item">
            <div>
              <div class="admin-item-title">${s.emoji || '📚'} ${s.name}</div>
            </div>
            <div class="admin-btn-group">
              <button class="btn-icon-action danger" onclick="window.AdminView.deleteSubject(${s.id})">🗑</button>
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
      <div class="form-group">
        <label class="form-label">Emoji (Ixtiyoriy):</label>
        <input type="text" id="add-s-emoji" class="form-control" placeholder="Masalan: 🧪">
      </div>
      <button class="admin-action-btn" onclick="window.AdminView.submitAddSubject()">💾 Fanni Saqlash</button>
    `;
    window.App.showCustomModal('➕ Yangi Fan Qo‘shish', bodyHtml);
  },

  async submitAddSubject() {
    const name = document.getElementById('add-s-name')?.value?.trim();
    const emoji = document.getElementById('add-s-emoji')?.value?.trim();

    if (!name) return window.App.showToast('Fan nomini kiriting', 'error');

    try {
      await Api.createSubject({ name, emoji, school_id: window.App.currentSchoolId });
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

  // 5. LESSONS (Dars jadvali)
  async renderLessons(container) {
    const classes = await Api.getClasses(window.App.currentSchoolCode);

    if (classes.length === 0) {
      container.innerHTML = `<div class="state-box"><div class="state-title">Avval sinflar qo‘shing</div></div>`;
      return;
    }

    const selectedClassId = this.adminSelectedClassId || classes[0].id;
    this.adminSelectedClassId = selectedClassId;

    const scheduleData = await Api.getClassSchedule(selectedClassId);
    const weekly = scheduleData.weekly || {};

    let html = `
      <div class="form-group">
        <label class="form-label">Sinfni tanlang:</label>
        <select class="custom-select" id="admin-class-select" onchange="window.AdminView.adminSelectedClassId = Number(this.value); window.AdminView.loadTabContent();">
          ${classes.map(c => `<option value="${c.id}" ${c.id === selectedClassId ? 'selected' : ''}>${c.name}</option>`).join('')}
        </select>
      </div>

      <button class="admin-action-btn" onclick="window.AdminView.openAddLessonModal(${selectedClassId})">➕ Dars Qo‘shish</button>
    `;

    const dayNames = { 1: 'Dushanba', 2: 'Seshanba', 3: 'Chorshanba', 4: 'Payshanba', 5: 'Juma', 6: 'Shanba' };

    for (let day = 1; day <= 6; day++) {
      const dayLessons = weekly[day]?.lessons || [];
      html += `
        <div style="margin-top:16px;">
          <div class="section-title" style="margin-bottom:8px;font-size:14px;color:var(--primary);">🗓 ${dayNames[day]}</div>
          <div class="lessons-list">
      `;

      if (dayLessons.length === 0) {
        html += `<div style="padding:10px;color:var(--text-muted);font-size:12px;background:var(--bg-card);border-radius:8px;">Darslar yo‘q</div>`;
      } else {
        dayLessons.forEach((l, idx) => {
          html += `
            <div class="admin-list-item">
              <div>
                <div class="admin-item-title">${idx + 1}. ${l.subject}</div>
                <div class="admin-item-subtitle">🕐 ${l.start_time} - ${l.end_time} ${l.teacher ? `| 👨‍🏫 ${l.teacher}` : ''} ${l.room ? `| 🏫 ${l.room}` : ''}</div>
              </div>
              <div class="admin-btn-group">
                <button class="btn-icon-action danger" onclick="window.AdminView.deleteLesson(${l.id})">🗑</button>
              </div>
            </div>
          `;
        });
      }
      html += `</div></div>`;
    }

    container.innerHTML = html;
  },

  openAddLessonModal(groupId) {
    const bodyHtml = `
      <div class="form-group">
        <label class="form-label">Hafta kuni:</label>
        <select id="add-l-day" class="custom-select">
          <option value="1">Dushanba</option>
          <option value="2">Seshanba</option>
          <option value="3">Chorshanba</option>
          <option value="4">Payshanba</option>
          <option value="5">Juma</option>
          <option value="6">Shanba</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Dars vaqti:</label>
        <div style="display:flex;gap:8px;">
          <input type="time" id="add-l-start" class="form-control" value="08:30">
          <span style="align-self:center;">—</span>
          <input type="time" id="add-l-end" class="form-control" value="09:15">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Fan nomi:</label>
        <input type="text" id="add-l-subj" class="form-control" placeholder="Masalan: Matematika">
      </div>
      <div class="form-group">
        <label class="form-label">O‘qituvchi (Ixtiyoriy):</label>
        <input type="text" id="add-l-teacher" class="form-control" placeholder="Masalan: Rustam aka">
      </div>
      <div class="form-group">
        <label class="form-label">Xona (Ixtiyoriy):</label>
        <input type="text" id="add-l-room" class="form-control" placeholder="Masalan: 204">
      </div>
      <button class="admin-action-btn" onclick="window.AdminView.submitAddLesson(${groupId})">💾 Darsni Saqlash</button>
    `;
    window.App.showCustomModal('➕ Dars Qo‘shish', bodyHtml);
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
      window.App.showToast('Dars qo‘shildi', 'success');
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

  // 6. IMPORT (Jadval yuklash)
  async renderImport(container) {
    container.innerHTML = `
      <div class="welcome-card" style="margin-bottom:16px;">
        <div class="welcome-title">📥 Dars Jadvallarini Ommaviy Yuklash</div>
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

        <button class="admin-action-btn" style="margin-top:10px;" onclick="window.AdminView.submitImport()">🚀 Jadvalni Bazaga Yuklash</button>
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

  // 7. BROADCAST (Telegram guruhlarga yuborish)
  async renderBroadcast(container) {
    const classes = await Api.getClasses(window.App.currentSchoolCode);

    container.innerHTML = `
      <div class="welcome-card" style="margin-bottom:16px;">
        <div class="welcome-title">📤 Telegram Guruhlarga Yuborish</div>
        <div class="welcome-subtitle">Bugungi dars jadvalini Telegram guruhlariga darhol jo‘natish</div>
      </div>

      <div class="form-group">
        <label class="form-label">Qaysi sinfga yuborilsin?</label>
        <select id="broadcast-class" class="custom-select">
          <option value="all">📤 Barcha faol sinflarga</option>
          ${classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
        </select>
      </div>

      <button class="admin-action-btn" onclick="window.AdminView.triggerBroadcast()">🚀 Hozir Yuborish</button>
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
