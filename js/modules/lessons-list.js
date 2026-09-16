/* =========================================================
   MADAD TA'LIM — Lessons Catalog & Library Module
   ========================================================= */

window.LessonsListModule = {
  currentFilterSubject: 'all',
  searchQuery: '',

  render() {
    const container = document.getElementById('main-content-area');
    if (!container) return;

    let lessons = window.dataStore.getLessons();

    // Filter by subject
    if (this.currentFilterSubject !== 'all') {
      lessons = lessons.filter(l => l.subject === this.currentFilterSubject);
    }

    // Filter by search query
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      lessons = lessons.filter(l => 
        l.title.toLowerCase().includes(q) || 
        l.topic.toLowerCase().includes(q) ||
        l.grade.toLowerCase().includes(q)
      );
    }

    container.innerHTML = `
      <div class="animate-fade">
        <div class="section-header">
          <div>
            <h2>📚 Barcha Darslar Ro‘yxati</h2>
            <p style="color:var(--text-muted); font-size:13px;">Tayyor darslar bazasi, testlar va interaktiv mashqlar</p>
          </div>
          <button class="btn btn-primary" onclick="window.AppRouter.navigate('new-lesson')">
            <span>➕ Yangi Dars Yaratish</span>
          </button>
        </div>

        <!-- Filter bar -->
        <div class="glass-panel" style="padding: 16px 20px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px;">
          <div class="flex gap-2 flex-wrap">
            <button class="btn btn-sm ${this.currentFilterSubject === 'all' ? 'btn-primary' : 'btn-outline'}" onclick="window.LessonsListModule.setFilter('all')">
              Barchasi (${window.dataStore.getLessons().length})
            </button>
            <button class="btn btn-sm ${this.currentFilterSubject === 'English' ? 'btn-primary' : 'btn-outline'}" onclick="window.LessonsListModule.setFilter('English')">
              🇬🇧 English
            </button>
            <button class="btn btn-sm ${this.currentFilterSubject === 'Русский язык' ? 'btn-primary' : 'btn-outline'}" onclick="window.LessonsListModule.setFilter('Русский язык')">
              🇷🇺 Русский язык
            </button>
            <button class="btn btn-sm ${this.currentFilterSubject === 'Arab tili' ? 'btn-primary' : 'btn-outline'}" onclick="window.LessonsListModule.setFilter('Arab tili')">
              🇸🇦 Arab tili
            </button>
          </div>

          <div class="search-box" style="width: 240px;">
            <span class="search-icon">🔍</span>
            <input type="text" placeholder="Darsni izlash..." value="${this.searchQuery}" oninput="window.LessonsListModule.onSearch(this.value)">
          </div>
        </div>

        <!-- Lessons Cards Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px;">
          ${lessons.map(l => `
            <div class="glass-panel" style="padding: 22px; display: flex; flex-direction: column; justify-content: space-between; gap: 16px; transition: transform var(--transition-fast);">
              <div>
                <div class="flex items-center justify-between" style="margin-bottom: 12px;">
                  <span style="font-size: 32px;">${l.flag || '📖'}</span>
                  <span class="badge ${l.isToday ? 'badge-success' : 'badge-muted'}">
                    ${l.isToday ? 'Bugungi dars' : l.grade}
                  </span>
                </div>

                <h3 style="font-size: 18px; margin-bottom: 6px;">${l.title}</h3>
                <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 12px;">
                  Fani: <strong>${l.subject}</strong> • ${l.grade} • ${l.duration}
                </p>

                <div class="flex gap-2 flex-wrap" style="font-size: 12px;">
                  <span class="badge badge-primary">📖 ${l.vocabulary?.length || 0} ta so‘z</span>
                  <span class="badge badge-warning">📝 ${l.quiz?.length || 0} ta test</span>
                  <span class="badge badge-secondary">📊 ${l.avgScore || 85}% natija</span>
                </div>
              </div>

              <div class="flex gap-2" style="border-top: 1px solid var(--border-subtle); padding-top: 14px;">
                <button class="btn btn-sm btn-primary flex-1" onclick="window.LessonPlayerModule.openPlayer('${l.id}')">
                  <span>▶ Darsni O‘tish</span>
                </button>
                <button class="btn btn-sm btn-outline" title="Tahrirlash" onclick="window.LessonCreatorModule.openEditor('${l.id}')">
                  ✏
                </button>
                <button class="btn btn-sm btn-outline" title="O‘chirish" style="color:var(--danger); border-color:rgba(239,68,68,0.3);" onclick="window.LessonsListModule.deleteLesson('${l.id}')">
                  🗑
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  setFilter(subj) {
    this.currentFilterSubject = subj;
    window.speechEngine.playFx('click');
    this.render();
  },

  onSearch(val) {
    this.searchQuery = val;
    this.render();
  },

  deleteLesson(id) {
    if (confirm('Ushbu darsni o‘chirmoqchimisiz?')) {
      window.dataStore.deleteLesson(id);
      window.speechEngine.playFx('wrong');
      window.AppRouter.showToast('Dars o‘chirildi', 'info');
      this.render();
    }
  }
};
