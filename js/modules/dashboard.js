/* =========================================================
   MADAD TA'LIM — Dashboard Module
   ========================================================= */

window.DashboardModule = {
  render() {
    const container = document.getElementById('main-content-area');
    if (!container) return;

    const lessons = window.dataStore.getLessons();
    const groups = window.dataStore.getGroups();
    const todayLessons = lessons.filter(l => l.isToday);

    // Calculate aggregated metrics
    const totalStudents = groups.reduce((acc, g) => acc + (g.studentsCount || 0), 0);
    const overallAvg = groups.length ? Math.round(groups.reduce((acc, g) => acc + (g.groupAverage || 0), 0) / groups.length) : 84;
    const totalWeakSpots = groups.reduce((acc, g) => acc + (g.weakSpots ? g.weakSpots.length : 0), 0);

    container.innerHTML = `
      <div class="animate-fade">
        <!-- Welcome Hero Banner -->
        <div class="welcome-banner">
          <div class="welcome-content">
            <h2>Xush kelibsiz, Dilnoza Karimova! 🎓</h2>
            <p>Bugun darslaringizni sun'iy intellekt va interaktiv mashqlar bilan qiziqarli tashkil eting. O‘quvchilar natijalari va zaif joylar tahlili tayyor.</p>
            <div class="flex gap-3" style="margin-top: 18px;">
              <button class="btn btn-primary" style="background:#fff; color:var(--primary); font-weight:800;" onclick="window.AppRouter.navigate('new-lesson')">
                <span>➕ Yangi Dars Yaratish</span>
              </button>
              <button class="btn btn-outline" style="border-color:rgba(255,255,255,0.4); color:#fff;" onclick="window.AppRouter.navigate('ai-chat')">
                <span>🧠 AI Yordamchi bilan suhbat</span>
              </button>
            </div>
          </div>
        </div>

        <!-- 6 Quick Navigation Cards -->
        <div class="quick-nav-grid">
          <div class="quick-nav-card" onclick="window.AppRouter.navigate('lessons')">
            <div class="quick-card-icon" style="background:var(--primary-light); color:var(--primary);">📚</div>
            <div class="quick-card-title">Darslar</div>
            <div class="quick-card-subtitle">${lessons.length} ta dars rejasi</div>
          </div>
          <div class="quick-nav-card" onclick="window.AppRouter.navigate('groups')">
            <div class="quick-card-icon" style="background:var(--secondary-light); color:var(--secondary);">👥</div>
            <div class="quick-card-title">Guruhlar</div>
            <div class="quick-card-subtitle">${groups.length} ta sinf faol</div>
          </div>
          <div class="quick-nav-card" onclick="window.AppRouter.navigate('ai-chat')">
            <div class="quick-card-icon" style="background:var(--accent-light); color:var(--accent);">🧠</div>
            <div class="quick-card-title">AI Yordamchi</div>
            <div class="quick-card-subtitle">Tezkor dars tuzuvchi</div>
          </div>
          <div class="quick-nav-card" onclick="window.AppRouter.navigate('analytics')">
            <div class="quick-card-icon" style="background:var(--success-light); color:var(--success);">📊</div>
            <div class="quick-card-title">Natijalar</div>
            <div class="quick-card-subtitle">O‘rtacha ${overallAvg}% ko‘rsatkich</div>
          </div>
          <div class="quick-nav-card" onclick="window.AppRouter.navigate('new-lesson')">
            <div class="quick-card-icon" style="background:var(--warning-light); color:var(--warning);">➕</div>
            <div class="quick-card-title">Yangi dars</div>
            <div class="quick-card-subtitle">AI & Internet qidiruv</div>
          </div>
          <div class="quick-nav-card" onclick="window.AppRouter.navigate('settings')">
            <div class="quick-card-icon" style="background:var(--bg-muted); color:var(--text-muted);">⚙</div>
            <div class="quick-card-title">Sozlamalar</div>
            <div class="quick-card-subtitle">Audio, Ovoz va Tizim</div>
          </div>
        </div>

        <!-- 2 Column Layout: Today's Lessons & Weak Spots Alert -->
        <div class="dashboard-grid-2col">
          <!-- Left Column: Bugungi Darslar -->
          <div>
            <div class="section-header">
              <h3><span>📅</span> BUGUNGI Darslar</h3>
              <button class="btn btn-sm btn-outline" onclick="window.AppRouter.navigate('new-lesson')">+ Qo‘shish</button>
            </div>
            
            <div class="today-lessons-list">
              ${todayLessons.map(lesson => `
                <div class="today-lesson-card">
                  <div class="flex items-center gap-4">
                    <span class="lesson-flag-icon">${lesson.flag || '📖'}</span>
                    <div class="lesson-main-info">
                      <h4>
                        <span>${lesson.subject}</span>
                        <span class="badge badge-primary">${lesson.grade}</span>
                      </h4>
                      <div class="lesson-meta">
                        <span>🏷 <strong>${lesson.topic}</strong></span>
                        <span>•</span>
                        <span>⏱ ${lesson.duration}</span>
                        <span>•</span>
                        <span>📊 O‘rtacha: ${lesson.avgScore || 85}%</span>
                      </div>
                    </div>
                  </div>
                  <div class="lesson-actions">
                    <button class="btn btn-sm btn-primary" onclick="window.LessonPlayerModule.openPlayer('${lesson.id}')">
                      <span>▶ Ochish (Darsni boshlash)</span>
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="window.LessonCreatorModule.openEditor('${lesson.id}')">
                      <span>✏ Tahrirlash</span>
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Right Column: Weak Spots Warning Box (Moslashuvchan tahlil) -->
          <div>
            <div class="section-header">
              <h3><span>⚠</span> Diqqat talab mavzular</h3>
              <span class="badge badge-warning">${totalWeakSpots} ta zaif nuqta</span>
            </div>

            <div class="weak-spots-card">
              <div class="weak-header">
                <span style="font-size: 24px;">📊</span>
                <div>
                  <h4>Ko‘pchilik xato qilgan mavzular (3-A Sinf):</h4>
                  <p style="font-size: 12px; color: var(--text-muted);">So‘nggi test natijalari asosida tahlil qilindi</p>
                </div>
              </div>

              <div class="weak-item">
                <div class="weak-item-name">
                  <span>🐯</span>
                  <span><strong>Tiger</strong> (yo‘lbars) imlosi</span>
                </div>
                <span class="weak-item-rate">42% xato</span>
              </div>

              <div class="weak-item">
                <div class="weak-item-name">
                  <span>🐘</span>
                  <span><strong>Elephant</strong> (fil) so‘zi</span>
                </div>
                <span class="weak-item-rate">38% xato</span>
              </div>

              <div class="weak-item">
                <div class="weak-item-name">
                  <span>🔊</span>
                  <span><strong>Pronunciation</strong> (Talaffuz)</span>
                </div>
                <span class="weak-item-rate">31% xato</span>
              </div>

              <div class="adaptive-prompt-box">
                <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 12px;">
                  💡 <strong>Avtomatik moslashuv:</strong> O‘quvchilar qiynalgan mana shu so‘zlar bo‘yicha qo‘shimcha mustahkamlash darsini bir bosishda tayyorlang.
                </p>
                <button class="btn btn-warning" style="width: 100%; font-weight: 800;" onclick="window.AnalyticsModule.generateAdaptiveLesson('group-3a-eng')">
                  <span>⚡ Zaif joylarga mos yangi dars yaratish</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
};
