/* =========================================================
   MADAD TA'LIM — Analytics & Adaptive Learning Intelligence
   ========================================================= */

window.AnalyticsModule = {
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
            <h2>📊 O‘quvchilar Natijalari & Tahlil</h2>
            <p style="color:var(--text-muted); font-size:13px;">Dars natijalari, o‘zlashtirish foizi va xatolar tahlili</p>
          </div>
          <div class="flex gap-2">
            <select class="form-control" style="width: auto; font-weight: 700;" onchange="window.AnalyticsModule.changeGroup(this.value)">
              ${groups.map(g => `
                <option value="${g.id}" ${g.id === activeGroup.id ? 'selected' : ''}>
                  ${g.flag} ${g.name} (${g.subject})
                </option>
              `).join('')}
            </select>
          </div>
        </div>

        <!-- 2 Column Analytics View -->
        <div class="dashboard-grid-2col" style="grid-template-columns: 1.3fr 1fr;">
          <!-- Left Column: Class Scoreboard -->
          <div>
            <div class="glass-panel" style="padding: 24px; margin-bottom: 20px;">
              <div class="flex justify-between items-center" style="margin-bottom: 16px;">
                <div>
                  <h3 style="font-size: 18px; text-transform: uppercase;">${activeGroup.gradeLevel} — ${activeGroup.subject}</h3>
                  <p style="color: var(--text-muted); font-size: 13px;">Mavzu: <strong>${activeGroup.currentTopic}</strong></p>
                </div>
                <div style="text-align: right;">
                  <span style="font-size: 12px; color: var(--text-muted);">Guruh natijasi:</span>
                  <div style="font-size: 24px; font-weight: 900; color: var(--primary);">${activeGroup.groupAverage}%</div>
                </div>
              </div>

              <!-- Score List -->
              <div style="display: flex; flex-direction: column; gap: 8px;">
                ${activeGroup.students.map(s => `
                  <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: var(--bg-muted); border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
                    <div class="flex items-center gap-3">
                      <div class="student-avatar-circle" style="width:32px; height:32px; font-size:12px;">${s.avatar}</div>
                      <strong>${s.name}</strong>
                    </div>
                    <div class="flex items-center gap-4">
                      <span style="font-weight: 800; font-size: 15px; color: var(--text-main);">${s.score}/${s.maxScore}</span>
                      <span class="score-star-badge" style="width: 60px; text-align: right;">${s.stars}</span>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- Right Column: Weak Spots & Adaptive Recommendation Engine -->
          <div>
            <div class="weak-spots-card" style="padding: 24px;">
              <div class="weak-header">
                <span style="font-size: 28px;">⚠</span>
                <div>
                  <h4>Ko‘pchilik xato qilgan mavzular:</h4>
                  <p style="font-size: 12px; color: var(--text-muted);">Ushbu nuqtalar ustida qo‘shimcha mashq zarur</p>
                </div>
              </div>

              <div style="display: flex; flex-direction: column; gap: 10px;">
                ${(activeGroup.weakSpots || []).map(ws => `
                  <div class="weak-item">
                    <div class="weak-item-name">
                      <span>${ws.icon || '📌'}</span>
                      <span>${ws.topic}</span>
                    </div>
                    <span class="weak-item-rate">${ws.errorRate}% xato</span>
                  </div>
                `).join('')}
              </div>

              <!-- Adaptive Lesson Generator Card -->
              <div class="adaptive-prompt-box" style="margin-top: 24px; padding: 18px; background: var(--primary-light); border-radius: var(--radius-lg); border: 1.5px dashed var(--primary);">
                <div class="flex items-center gap-2" style="margin-bottom: 8px;">
                  <span style="font-size: 20px;">🧠</span>
                  <strong style="color: var(--primary); font-size: 15px;">Eng muhim qism: Dars avtomatik moslashadi</strong>
                </div>
                <p style="font-size: 13px; color: var(--text-main); line-height: 1.5; margin-bottom: 16px;">
                  Tizim o‘quvchilar xato qilgan <strong>Tiger, Elephant</strong> va <strong>Pronunciation</strong> mavzulari bo‘yicha yangi moslashtirilgan zanjir (Mavzu → dars → mashqlar → test → takrorlash) tuzib beradi.
                </p>
                <button class="btn btn-primary" style="width: 100%; font-weight: 800;" onclick="window.AnalyticsModule.generateAdaptiveLesson('${activeGroup.id}')">
                  <span>⚡ Zaif joylarga mos yangi dars yaratish</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  changeGroup(groupId) {
    this.selectedGroupId = groupId;
    window.speechEngine.playFx('click');
    this.render();
  },

  // Generates adaptive remedial lesson targeting weak spots
  generateAdaptiveLesson(groupId) {
    const groups = window.dataStore.getGroups();
    const group = groups.find(g => g.id === groupId) || groups[0];

    window.speechEngine.playFx('click');
    window.AppRouter.showToast(`🧠 "${group.currentTopic}" bo‘yicha zaif joylarga mos dars zanjiri tuzilmoqda...`, 'info');

    setTimeout(() => {
      // Build focused remedial lesson
      const remedialLesson = {
        id: `adaptive-${Date.now()}`,
        title: `${group.currentTopic} — Qaytarish va Mustahkamlash (Remedial)`,
        subject: group.subject,
        flag: group.flag,
        langCode: group.flag === '🇷🇺' ? 'ru-RU' : group.flag === '🇸🇦' ? 'ar-SA' : 'en-US',
        grade: group.gradeLevel,
        duration: "1 kunlik",
        level: "Moslashuvchan",
        topic: `${group.currentTopic} (Takrorlash)`,
        isToday: true,
        totalStudents: group.studentsCount,
        avgScore: 84,
        vocabulary: [
          {
            word: "Tiger",
            translation: "Yo‘lbars (Xato qilingan so‘z)",
            phonetic: "[ˈtaɪ.ɡər]",
            emoji: "🐯",
            example: "The orange tiger has dark stripes.",
            missingLetter: "T _ G _ R",
            fullWord: "TIGER"
          },
          {
            word: "Elephant",
            translation: "Fil (Xato qilingan so‘z)",
            phonetic: "[ˈel.ɪ.fənt]",
            emoji: "🐘",
            example: "The big elephant drinks clean water.",
            missingLetter: "E L _ P H _ N T",
            fullWord: "ELEPHANT"
          },
          {
            word: "Lion",
            translation: "Sher",
            phonetic: "[ˈlaɪ.ən]",
            emoji: "🦁",
            example: "The strong lion runs in savanna.",
            missingLetter: "L _ O N",
            fullWord: "LION"
          }
        ],
        quiz: [
          {
            question: "Ko‘pchilik xato qilgan so‘z: 'Tiger' to‘g‘ri yozilishi qaysi?",
            options: ["Taiger", "Tiger", "Tygur", "Tigre"],
            correctIndex: 1,
            explanation: "To‘g‘ri inglizcha imlo: T-I-G-E-R."
          },
          {
            question: "'Elephant' so‘zidagi tushirib qoldirilgan harflarni toping: E L _ P H _ N T",
            options: ["E, A", "A, E", "I, O", "E, U"],
            correctIndex: 0,
            explanation: "E-L-E-P-H-A-N-T (Fil)."
          },
          {
            question: "Talaffuz mashqi: '[ˈtaɪ.ɡər]' transkripsiyasiga mos keluvchi so‘z qaysi?",
            options: ["Dog", "Tiger", "Cat", "Rabbit"],
            correctIndex: 1,
            explanation: "[ˈtaɪ.ɡər] — Tiger so‘zining talaffuzidir."
          }
        ]
      };

      window.dataStore.saveLesson(remedialLesson);
      window.LessonPlayerModule.openPlayer(remedialLesson.id);
      window.AppRouter.showToast("⚡ Moslashuvchan dars tayyor! O‘quvchilar bilan darsni boshlashingiz mumkin.", "success");
    }, 800);
  }
};
