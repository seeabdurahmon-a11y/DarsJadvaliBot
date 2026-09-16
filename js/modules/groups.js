/* =========================================================
   MADAD TA'LIM — Groups & Students Management Module
   ========================================================= */

window.GroupsModule = {
  selectedGroupId: 'group-3a-eng',

  render() {
    const container = document.getElementById('main-content-area');
    if (!container) return;

    const groups = window.dataStore.getGroups();
    const activeGroup = groups.find(g => g.id === this.selectedGroupId) || groups[0];

    container.innerHTML = `
      <div class="animate-fade">
        <div class="section-header">
          <div>
            <h2>👥 Guruhlar va O‘quvchilar</h2>
            <p style="color:var(--text-muted); font-size:13px;">Sinflar, o‘quvchilar ro‘yxati va ularning o‘zlashtirish darajasi</p>
          </div>
          <div class="flex gap-2">
            <button class="btn btn-primary" onclick="window.GroupsModule.openAddStudentModal()">
              <span>+ Yangi O‘quvchi Qo‘shish</span>
            </button>
          </div>
        </div>

        <!-- Groups Selector Tabs -->
        <div class="tabs-header" style="max-width: 600px; margin-bottom: 24px;">
          ${groups.map(g => `
            <button class="tab-btn ${g.id === activeGroup.id ? 'active' : ''}" onclick="window.GroupsModule.selectGroup('${g.id}')">
              <span>${g.flag} ${g.name} (${g.gradeLevel})</span>
            </button>
          `).join('')}
        </div>

        <!-- Active Group Overview Card -->
        <div class="glass-panel" style="padding: 24px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
          <div class="flex items-center gap-4">
            <div class="brand-icon" style="width: 52px; height: 52px; font-size: 26px;">${activeGroup.flag}</div>
            <div>
              <h3 style="font-size: 20px;">${activeGroup.name} — ${activeGroup.subject}</h3>
              <p style="color: var(--text-muted); font-size: 13px;">
                Ustoz: <strong>${activeGroup.teacher}</strong> • Xona: ${activeGroup.room} • Hozirgi mavzu: <strong>${activeGroup.currentTopic}</strong>
              </p>
            </div>
          </div>
          <div class="flex gap-4 items-center">
            <div style="text-align: right;">
              <span style="font-size: 12px; color: var(--text-muted); display: block;">Guruh o‘rtacha balli:</span>
              <strong style="font-size: 24px; color: var(--primary);">${activeGroup.groupAverage}%</strong>
            </div>
            <button class="btn btn-warning btn-sm" onclick="window.AnalyticsModule.generateAdaptiveLesson('${activeGroup.id}')">
              <span>⚡ Zaif mavzularga mos dars</span>
            </button>
          </div>
        </div>

        <!-- Students Table -->
        <div class="data-table-wrapper">
          <table class="custom-table">
            <thead>
              <tr>
                <th>#</th>
                <th>O‘quvchi Ismi</th>
                <th>Oxirgi Test</th>
                <th>Foiz</th>
                <th>Yulduz</th>
                <th>Davomat</th>
                <th>Holat</th>
                <th>Amal</th>
              </tr>
            </thead>
            <tbody>
              ${activeGroup.students.map((s, idx) => `
                <tr>
                  <td><strong>${idx + 1}</strong></td>
                  <td>
                    <div class="student-row-info">
                      <div class="student-avatar-circle">${s.avatar}</div>
                      <div>
                        <strong>${s.name}</strong>
                      </div>
                    </div>
                  </td>
                  <td><strong>${s.score} / ${s.maxScore}</strong></td>
                  <td>
                    <span class="badge ${s.percent >= 90 ? 'badge-success' : s.percent >= 75 ? 'badge-primary' : 'badge-warning'}">
                      ${s.percent}%
                    </span>
                  </td>
                  <td><span class="score-star-badge">${s.stars}</span></td>
                  <td>${s.attendance}</td>
                  <td>
                    <span class="badge ${s.status === "A'lo" ? 'badge-success' : s.status === 'Yaxshi' ? 'badge-primary' : 'badge-warning'}">
                      ${s.status}
                    </span>
                  </td>
                  <td>
                    <button class="btn btn-sm btn-outline" onclick="window.AppRouter.showToast('${s.name} uchun shaxsiy tahlil ochildi', 'info')">
                      👁 Tahlil
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  selectGroup(groupId) {
    this.selectedGroupId = groupId;
    window.speechEngine.playFx('click');
    this.render();
  },

  openAddStudentModal() {
    const modal = document.getElementById('generic-modal');
    const modalTitle = document.getElementById('generic-modal-title');
    const modalBody = document.getElementById('generic-modal-body');
    const modalFooter = document.getElementById('generic-modal-footer');

    if (!modal || !modalTitle || !modalBody || !modalFooter) return;

    modalTitle.innerText = "➕ Yangi O‘quvchi Qo‘shish";
    modalBody.innerHTML = `
      <form id="add-student-form" onsubmit="event.preventDefault(); window.GroupsModule.saveNewStudent();">
        <div class="form-group">
          <label>O‘quvchining F.I.SH:</label>
          <input type="text" id="new-student-name" class="form-control" placeholder="Masalan: Abdulloh Umarov" required>
        </div>
        <div class="form-group">
          <label>Guruh:</label>
          <select id="new-student-group" class="form-control">
            <option value="group-3a-eng">3-A Sinf (English)</option>
            <option value="group-2b-ru">2-B Sinf (Русский язык)</option>
            <option value="group-4a-eng">4-A Sinf (English)</option>
          </select>
        </div>
      </form>
    `;

    modalFooter.innerHTML = `
      <button class="btn btn-secondary" onclick="window.AppRouter.closeGenericModal()">Bekor qilish</button>
      <button class="btn btn-primary" onclick="window.GroupsModule.saveNewStudent()">Saqlash</button>
    `;

    modal.classList.add('active');
  },

  saveNewStudent() {
    const nameInput = document.getElementById('new-student-name');
    const groupId = document.getElementById('new-student-group')?.value || this.selectedGroupId;
    if (!nameInput || !nameInput.value.trim()) return;

    const name = nameInput.value.trim();
    const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

    const groups = window.dataStore.getGroups();
    const group = groups.find(g => g.id === groupId);
    if (group) {
      group.students.push({
        id: `s-${Date.now()}`,
        name: name,
        score: 18,
        maxScore: 20,
        percent: 90,
        stars: "⭐⭐⭐",
        status: "Yaxshi",
        avatar: initials,
        attendance: "100%"
      });
      group.studentsCount = group.students.length;
      window.dataStore.saveGroup(group);
      window.AppRouter.closeGenericModal();
      window.speechEngine.playFx('correct');
      window.AppRouter.showToast(`${name} muvaffaqiyatli qo‘shildi!`, 'success');
      this.render();
    }
  }
};
