import { Api } from './api.js';
import { TelegramApp } from './telegram.js';

export const AdminView = {
  currentTab: 'stats', // 'stats' | 'classes' | 'teachers' | 'subjects' | 'lessons' | 'template' | 'broadcast'

  async render(container) {
    container.innerHTML = `
      <div class="section-header">
        <div class="section-title">⚙️ ADMIN BOSHQARUV PANELI</div>
      </div>

      <div class="tab-pills" id="admin-pills">
        <button class="tab-pill active" onclick="window.AdminView.switchTab('stats')">📊 Statistika</button>
        <button class="tab-pill" onclick="window.AdminView.switchTab('classes')">🏫 Sinflar</button>
        <button class="tab-pill" onclick="window.AdminView.switchTab('teachers')">👨‍🏫 O‘qituvchilar</button>
        <button class="tab-pill" onclick="window.AdminView.switchTab('subjects')">📚 Fanlar</button>
        <button class="tab-pill" onclick="window.AdminView.switchTab('lessons')">📅 Dars jadvali</button>
        <button class="tab-pill" onclick="window.AdminView.switchTab('template')">📩 Xabar shabloni</button>
        <button class="tab-pill" onclick="window.AdminView.switchTab('broadcast')">📤 Hozir yuborish</button>
      </div>

      <div id="admin-tab-body">
        <div class="state-box"><div class="skeleton" style="height:140px;"></div></div>
      </div>
    `;

    this.loadTabContent();
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
      } else if (this.currentTab === 'template') {
        await this.renderTemplate(body);
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
    const stats = await Api.getAdminStats();
    container.innerHTML = `
      <div class="admin-stats-grid">
        <div class="stat-box">
          <div class="stat-val">${stats.groupsCount || stats.classesCount || 0}</div>
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
        <div class="stat-box">
          <div class="stat-val">${stats.usersCount || 0}</div>
          <div class="stat-label">👥 Foydalanuvchilar</div>
        </div>
        <div class="stat-box">
          <div class="stat-val">${stats.todaySentCount || 0}</div>
          <div class="stat-label">📤 Bugun yuborilgan</div>
        </div>
      </div>
    `;
  },

  // 2. CLASSES
  async renderClasses(container) {
    const classes = await Api.getClasses();
    let html = `
      <button class="admin-action-btn" onclick="window.AdminView.openAddClassModal()">➕ Yangi Sinf Qo‘shish</button>
      <div class="lessons-list">
    `;

    if (classes.length === 0) {
      html += `<div class="state-box"><div class="state-title">Hozircha sinflar yo‘q</div></div>`;
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
    window.App.showCustomModal('➕ Yangi Sinf Qo‘shish', `
      <div class="form-group">
        <label class="form-label">Sinf Nomi (masalan 7-A):</label>
        <input type="text" id="modal-class-name" class="form-control" placeholder="10-B sinf">
      </div>
      <div class="form-group">
        <label class="form-label">Yuborish Vaqti (standart 06:00):</label>
        <input type="time" id="modal-class-time" class="form-control" value="06:00">
      </div>
      <button class="admin-action-btn" onclick="window.AdminView.saveNewClass()">💾 Saqlash</button>
    `);
  },

  async saveNewClass() {
    const name = document.getElementById('modal-class-name')?.value;
    const time = document.getElementById('modal-class-time')?.value;

    if (!name || !name.trim()) {
      window.App.showToast('Sinf nomini kiriting!', 'error');
      return;
    }

    try {
      await Api.createClass({ name: name.trim(), send_time: time });
      window.App.closeModal();
      window.App.showToast('Sinf muvaffaqiyatli qo‘shildi!', 'success');
      this.loadTabContent();
    } catch (err) {
      window.App.showToast(err.message, 'error');
    }
  },

  openEditClassModal(id, currentName, currentTime) {
    window.App.showCustomModal('✏️ Sinfni Tahrirlash', `
      <div class="form-group">
        <label class="form-label">Sinf Nomi:</label>
        <input type="text" id="modal-edit-class-name" class="form-control" value="${currentName}">
      </div>
      <div class="form-group">
        <label class="form-label">Yuborish Vaqti:</label>
        <input type="time" id="modal-edit-class-time" class="form-control" value="${currentTime}">
      </div>
      <button class="admin-action-btn" onclick="window.AdminView.saveEditClass(${id})">💾 Saqlash</button>
    `);
  },

  async saveEditClass(id) {
    const name = document.getElementById('modal-edit-class-name')?.value;
    const time = document.getElementById('modal-edit-class-time')?.value;

    try {
      await Api.updateClass(id, { name: name.trim(), send_time: time });
      window.App.closeModal();
      window.App.showToast('Sinf o‘zgartirildi!', 'success');
      this.loadTabContent();
    } catch (err) {
      window.App.showToast(err.message, 'error');
    }
  },

  async deleteClass(id, name) {
    if (confirm(`Haqiqatan ham ${name} sinfini o‘chirmoqchimisiz? Barcha darslari o‘chadi!`)) {
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
    const teachers = await Api.getTeachers();
    let html = `
      <button class="admin-action-btn" onclick="window.AdminView.openAddTeacherModal()">➕ Yangi O‘qituvchi Qo‘shish</button>
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
              <div class="admin-item-subtitle">📚 ${t.subject || 'Fan yo‘q'} ${t.phone ? `| 📞 ${t.phone}` : ''}</div>
            </div>
            <div class="admin-btn-group">
              <button class="btn-icon-action danger" onclick="window.AdminView.deleteTeacher(${t.id}, '${t.last_name}')">🗑</button>
            </div>
          </div>
        `;
      });
    }

    html += `</div>`;
    container.innerHTML = html;
  },

  openAddTeacherModal() {
    window.App.showCustomModal('➕ Yangi O‘qituvchi', `
      <div class="form-group">
        <label class="form-label">Ism:</label>
        <input type="text" id="modal-t-first" class="form-control" placeholder="Anvar">
      </div>
      <div class="form-group">
        <label class="form-label">Familiya:</label>
        <input type="text" id="modal-t-last" class="form-control" placeholder="Aliyev">
      </div>
      <div class="form-group">
        <label class="form-label">Asosiy Fan:</label>
        <input type="text" id="modal-t-sub" class="form-control" placeholder="Matematika">
      </div>
      <div class="form-group">
        <label class="form-label">Telefon (ixtiyoriy):</label>
        <input type="tel" id="modal-t-phone" class="form-control" placeholder="+998901234567">
      </div>
      <button class="admin-action-btn" onclick="window.AdminView.saveNewTeacher()">💾 Saqlash</button>
    `);
  },

  async saveNewTeacher() {
    const first_name = document.getElementById('modal-t-first')?.value;
    const last_name = document.getElementById('modal-t-last')?.value;
    const subject = document.getElementById('modal-t-sub')?.value;
    const phone = document.getElementById('modal-t-phone')?.value;

    if (!first_name || !last_name) {
      window.App.showToast('Ism va familiyani kiriting!', 'error');
      return;
    }

    try {
      await Api.createTeacher({ first_name, last_name, subject, phone });
      window.App.closeModal();
      window.App.showToast('O‘qituvchi muvaffaqiyatli qo‘shildi!', 'success');
      this.loadTabContent();
    } catch (err) {
      window.App.showToast(err.message, 'error');
    }
  },

  async deleteTeacher(id, name) {
    if (confirm(`${name} ni o‘chirmoqchimisiz?`)) {
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
    const subjects = await Api.getSubjects();
    let html = `
      <button class="admin-action-btn" onclick="window.AdminView.openAddSubjectModal()">➕ Yangi Fan Qo‘shish</button>
      <div class="lessons-list">
    `;

    subjects.forEach(s => {
      html += `
        <div class="admin-list-item">
          <div class="admin-item-title">${s.emoji || '📚'} ${s.name}</div>
          <button class="btn-icon-action danger" onclick="window.AdminView.deleteSubject(${s.id}, '${s.name}')">🗑</button>
        </div>
      `;
    });

    html += `</div>`;
    container.innerHTML = html;
  },

  openAddSubjectModal() {
    window.App.showCustomModal('➕ Yangi Fan', `
      <div class="form-group">
        <label class="form-label">Fan Nomi:</label>
        <input type="text" id="modal-sub-name" class="form-control" placeholder="Kimyo">
      </div>
      <div class="form-group">
        <label class="form-label">Emoji (ixtiyoriy):</label>
        <input type="text" id="modal-sub-emoji" class="form-control" placeholder="🧪">
      </div>
      <button class="admin-action-btn" onclick="window.AdminView.saveNewSubject()">💾 Saqlash</button>
    `);
  },

  async saveNewSubject() {
    const name = document.getElementById('modal-sub-name')?.value;
    const emoji = document.getElementById('modal-sub-emoji')?.value;

    if (!name || !name.trim()) {
      window.App.showToast('Fan nomini kiriting!', 'error');
      return;
    }

    try {
      await Api.createSubject({ name: name.trim(), emoji: emoji || undefined });
      window.App.closeModal();
      window.App.showToast('Fan qo‘shildi!', 'success');
      this.loadTabContent();
    } catch (err) {
      window.App.showToast(err.message, 'error');
    }
  },

  async deleteSubject(id, name) {
    if (confirm(`${name} fanini o‘chirmoqchimisiz?`)) {
      try {
        await Api.deleteSubject(id);
        window.App.showToast('Fan o‘chirildi', 'success');
        this.loadTabContent();
      } catch (err) {
        window.App.showToast(err.message, 'error');
      }
    }
  },

  // 5. LESSONS CONSTRUCTOR
  async renderLessons(container) {
    const classes = await Api.getClasses();
    const selectedClassId = window.App.currentClassId || (classes[0] ? classes[0].id : null);
    const lessons = await Api.getAdminLessons(selectedClassId);

    let html = `
      <div class="form-group">
        <label class="form-label">Sinfni tanlang:</label>
        <select class="custom-select" onchange="window.AdminView.onLessonClassFilter(this.value)">
          ${classes.map(c => `<option value="${c.id}" ${c.id == selectedClassId ? 'selected' : ''}>${c.name}</option>`).join('')}
        </select>
      </div>

      <button class="admin-action-btn" onclick="window.AdminView.openAddLessonModal(${selectedClassId})">➕ Dars Qo‘shish</button>
      <div class="lessons-list">
    `;

    const dayNames = ['', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];

    if (lessons.length === 0) {
      html += `<div class="state-box"><div class="state-title">Bu sinfda darslar yo‘q</div></div>`;
    } else {
      lessons.forEach(l => {
        html += `
          <div class="admin-list-item">
            <div>
              <div class="admin-item-title">${l.subject} (${dayNames[l.day_of_week] || ''})</div>
              <div class="admin-item-subtitle">⏰ ${l.start_time} - ${l.end_time} | 👨‍🏫 ${l.teacher || 'Ustoz yo‘q'} ${l.room ? `| xona: ${l.room}` : ''}</div>
            </div>
            <div class="admin-btn-group">
              <button class="btn-icon-action danger" onclick="window.AdminView.deleteLesson(${l.id})">🗑</button>
            </div>
          </div>
        `;
      });
    }

    html += `</div>`;
    container.innerHTML = html;
  },

  onLessonClassFilter(classId) {
    window.App.currentClassId = classId;
    this.loadTabContent();
  },

  async openAddLessonModal(selectedClassId) {
    const classes = await Api.getClasses();
    const subjects = await Api.getSubjects();
    const teachers = await Api.getTeachers();

    window.App.showCustomModal('➕ Dars Qo‘shish', `
      <div class="form-group">
        <label class="form-label">Sinf:</label>
        <select id="modal-l-class" class="custom-select">
          ${classes.map(c => `<option value="${c.id}" ${c.id == selectedClassId ? 'selected' : ''}>${c.name}</option>`).join('')}
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Hafta Kuni:</label>
        <select id="modal-l-day" class="custom-select">
          <option value="1">1 - Dushanba</option>
          <option value="2">2 - Seshanba</option>
          <option value="3">3 - Chorshanba</option>
          <option value="4">4 - Payshanba</option>
          <option value="5">5 - Juma</option>
          <option value="6">6 - Shanba</option>
        </select>
      </div>

      <div class="form-group" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div>
          <label class="form-label">Boshlanish:</label>
          <input type="time" id="modal-l-start" class="form-control" value="08:00">
        </div>
        <div>
          <label class="form-label">Tugash:</label>
          <input type="time" id="modal-l-end" class="form-control" value="08:45">
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Fan:</label>
        <input type="text" id="modal-l-sub" class="form-control" list="sub-list" placeholder="Matematika">
        <datalist id="sub-list">
          ${subjects.map(s => `<option value="${s.name}">`).join('')}
        </datalist>
      </div>

      <div class="form-group">
        <label class="form-label">O‘qituvchi:</label>
        <input type="text" id="modal-l-teacher" class="form-control" list="teacher-list" placeholder="Aliyev A.">
        <datalist id="teacher-list">
          ${teachers.map(t => `<option value="${t.last_name} ${t.first_name[0]}.">`).join('')}
        </datalist>
      </div>

      <div class="form-group">
        <label class="form-label">Xona (masalan 204):</label>
        <input type="text" id="modal-l-room" class="form-control" placeholder="204">
      </div>

      <button class="admin-action-btn" onclick="window.AdminView.saveNewLesson()">💾 Saqlash</button>
    `);
  },

  async saveNewLesson() {
    const group_id = document.getElementById('modal-l-class')?.value;
    const day_of_week = document.getElementById('modal-l-day')?.value;
    const start_time = document.getElementById('modal-l-start')?.value;
    const end_time = document.getElementById('modal-l-end')?.value;
    const subject = document.getElementById('modal-l-sub')?.value;
    const teacher = document.getElementById('modal-l-teacher')?.value;
    const room = document.getElementById('modal-l-room')?.value;

    if (!subject || !start_time || !end_time) {
      window.App.showToast('Fan va vaqtlarni to‘liq kiriting!', 'error');
      return;
    }

    try {
      await Api.createLesson({
        group_id,
        day_of_week,
        start_time,
        end_time,
        subject: subject.trim(),
        teacher: teacher ? teacher.trim() : null,
        room: room ? room.trim() : null
      });

      window.App.closeModal();
      window.App.showToast('Dars muvaffaqiyatli saqlandi!', 'success');
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

  // 6. MESSAGE TEMPLATE
  async renderTemplate(container) {
    const template = await Api.getTemplate();
    container.innerHTML = `
      <div class="form-group">
        <label class="form-label">Sarlavha (Header):</label>
        <input type="text" id="tpl-header" class="form-control" value="${template.header || ''}">
      </div>

      <div class="form-group">
        <label class="form-label">Pastki Matn (Footer):</label>
        <input type="text" id="tpl-footer" class="form-control" value="${template.footer || ''}">
      </div>

      <div class="form-group">
        <label class="form-label">To‘liq Shablon Tuzilishi (Body):</label>
        <textarea id="tpl-body" class="template-textarea">${template.body || ''}</textarea>
      </div>

      <div class="template-chips">
        <span class="chip" onclick="window.AdminView.insertPlaceholder('{{header}}')">{{header}}</span>
        <span class="chip" onclick="window.AdminView.insertPlaceholder('{{date}}')">{{date}}</span>
        <span class="chip" onclick="window.AdminView.insertPlaceholder('{{group}}')">{{group}}</span>
        <span class="chip" onclick="window.AdminView.insertPlaceholder('{{lessons}}')">{{lessons}}</span>
        <span class="chip" onclick="window.AdminView.insertPlaceholder('{{footer}}')">{{footer}}</span>
      </div>

      <div class="admin-btn-group" style="margin-bottom:14px;">
        <button class="admin-action-btn" style="flex:1;" onclick="window.AdminView.saveTemplate()">💾 Saqlash</button>
        <button class="btn-icon-action" style="padding:10px;" onclick="window.AdminView.previewTemplate()">👁 Ko‘rib chiqish</button>
        <button class="btn-icon-action danger" style="padding:10px;" onclick="window.AdminView.resetTemplate()">🔄 Reset</button>
      </div>

      <div id="tpl-preview-area"></div>
    `;
  },

  insertPlaceholder(tag) {
    const textarea = document.getElementById('tpl-body');
    if (textarea) {
      textarea.value += (textarea.value ? '\n\n' : '') + tag;
    }
  },

  async saveTemplate() {
    const header = document.getElementById('tpl-header')?.value;
    const footer = document.getElementById('tpl-footer')?.value;
    const body = document.getElementById('tpl-body')?.value;

    try {
      await Api.saveTemplate({ header, footer, body });
      window.App.showToast('Shablon saqlandi!', 'success');
    } catch (err) {
      window.App.showToast(err.message, 'error');
    }
  },

  async resetTemplate() {
    if (confirm('Shablonni standart holatga qaytarmoqchimisiz?')) {
      try {
        await Api.resetTemplate();
        window.App.showToast('Standart holat tiklandi', 'success');
        this.loadTabContent();
      } catch (err) {
        window.App.showToast(err.message, 'error');
      }
    }
  },

  async previewTemplate() {
    const header = document.getElementById('tpl-header')?.value;
    const footer = document.getElementById('tpl-footer')?.value;
    const body = document.getElementById('tpl-body')?.value;
    const previewArea = document.getElementById('tpl-preview-area');

    try {
      const res = await Api.previewTemplate({ header, footer, body });
      if (previewArea) {
        previewArea.innerHTML = `
          <div class="section-title" style="margin-bottom:6px;">👁 Ko‘rib chiqish:</div>
          <div class="preview-box">${res.preview}</div>
        `;
      }
    } catch (err) {
      window.App.showToast(err.message, 'error');
    }
  },

  // 7. BROADCAST (SEND NOW) & SEND TIME
  async renderBroadcast(container) {
    const classes = await Api.getClasses();

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

      <hr style="margin:20px 0;border:none;border-top:1px solid var(--border);">

      <div class="section-title" style="margin-bottom:10px;">⏰ Standart Yuborish Vaqti</div>
      <div class="form-group">
        <label class="form-label">Har kuni avtomatik yuborish vaqti:</label>
        <input type="time" id="global-send-time" class="form-control" value="06:00">
      </div>
      <button class="btn-icon-action" style="width:100%;padding:10px;" onclick="window.AdminView.saveSendTime()">⏰ Vaqtni Saqlash</button>
    `;
  },

  async triggerBroadcast() {
    const classId = document.getElementById('broadcast-class')?.value;
    if (confirm('Bugungi dars jadvali Telegram guruhlariga yuborilsinmi?')) {
      try {
        window.App.showToast('Yuborilmoqda...', 'info');
        const res = await Api.sendNow(classId);
        window.App.showToast(`Muvaffaqiyatli yuborildi!`, 'success');
      } catch (err) {
        window.App.showToast(err.message, 'error');
      }
    }
  },

  async saveSendTime() {
    const time = document.getElementById('global-send-time')?.value;
    try {
      await Api.updateSendTime(time, 'all');
      window.App.showToast(`Yuborish vaqti ${time} ga o‘zgartirildi`, 'success');
    } catch (err) {
      window.App.showToast(err.message, 'error');
    }
  }
};
