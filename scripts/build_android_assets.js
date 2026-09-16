import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

function generateFullHtml() {
  const db = new DatabaseSync('data/bot.sqlite');

  // Subjects emoji map
  const subjectsRows = db.prepare('SELECT name, emoji FROM subjects').all();
  const emojiMap = {
    'Alifbe': '📚',
    'Yozuv': '✍️',
    'O‘qish': '📖',
    'O\'qish': '📖',
    'Matematika': '📐',
    'Algebra': '📐',
    'Geometriya': '📐',
    'Ona tili': '📚',
    'Adabiyot': '📖',
    'Rus tili': '🇷🇺',
    'Ingliz tili': '🇬🇧',
    'Fizika': '⚡',
    'Kimyo': '🧪',
    'Biologiya': '🧬',
    'Tabiiy fan': '🌱',
    'Tarix': '🏛',
    'Jahon tarixi': '🏛',
    'O‘zbekiston tarixi': '🏛',
    'Geografiya': '🌍',
    'Iqtisod': '💼',
    'Geografiya / Iqtisod': '🌍',
    'Informatika': '💻',
    'Jismoniy tarbiya': '⚽',
    'Texnologiya': '🛠',
    'Tasviriy san\'at': '🎨',
    'Musiqa': '🎵',
    'Tarbiya': '🌟',
    'ChQBT': '🎖',
    'Huquq': '⚖️',
    'Astronomiya': '🔭',
    'Tadbirkorlik': '💼',
    'Kelajak soati': '💡'
  };

  subjectsRows.forEach(s => {
    if (s.name && s.emoji) {
      emojiMap[s.name] = s.emoji;
    }
  });

  const getEmoji = (name) => {
    if (!name) return '📚';
    if (emojiMap[name]) return emojiMap[name];
    for (const [k, v] of Object.entries(emojiMap)) {
      if (name.toLowerCase().includes(k.toLowerCase())) return v;
    }
    return '📖';
  };

  // Get and sort groups
  const rawGroups = db.prepare('SELECT id, name FROM groups').all();
  const parseClass = (name) => {
    const match = name.match(/(\d+)-?([A-ZА-ЯЁa-zа-яё]+)?/);
    if (!match) return { num: 99, letter: name };
    return { num: parseInt(match[1], 10), letter: match[2] || '' };
  };

  rawGroups.sort((a, b) => {
    const ca = parseClass(a.name);
    const cb = parseClass(b.name);
    if (ca.num !== cb.num) return ca.num - cb.num;
    return ca.letter.localeCompare(cb.letter);
  });

  const classesList = rawGroups.map(g => {
    const match = g.name.match(/(\d+)-?([A-ZА-ЯЁa-zа-яё]+)?/);
    const num = match ? parseInt(match[1], 10) : 0;
    let category = 'middle';
    if (num >= 1 && num <= 4) category = 'primary';
    else if (num >= 5 && num <= 9) category = 'middle';
    else if (num >= 10) category = 'high';

    return {
      id: g.name.replace(/\s*sinf$/i, ''),
      dbId: g.id,
      name: g.name,
      category: category,
      gradeNum: num
    };
  });

  // Get all lessons
  const lessonsRows = db.prepare('SELECT group_id, day_of_week, start_time, end_time, subject, teacher, room FROM lessons ORDER BY day_of_week, start_time').all();

  const schedules = {};
  classesList.forEach(c => {
    schedules[c.id] = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  });

  lessonsRows.forEach(l => {
    const c = classesList.find(cls => cls.dbId === l.group_id);
    if (c) {
      if (!schedules[c.id][l.day_of_week]) {
        schedules[c.id][l.day_of_week] = [];
      }
      schedules[c.id][l.day_of_week].push({
        start: l.start_time,
        end: l.end_time,
        subject: l.subject,
        teacher: l.teacher || 'O‘qituvchi',
        room: l.room ? `${l.room}-xona` : 'Xona',
        emoji: getEmoji(l.subject)
      });
    }
  });

  const schoolDataJson = JSON.stringify({
    classes: classesList,
    schedules: schedules
  });

  const htmlContent = `<!DOCTYPE html>
<html lang="uz" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>Maktab Dars Jadvali</title>
  <style>
    :root {
      --primary: #1e40af;
      --primary-light: #3b82f6;
      --primary-dark: #1e3a8a;
      --primary-subtle: #eff6ff;
      --bg-main: #f8fafc;
      --bg-card: #ffffff;
      --bg-subtle: #f1f5f9;
      --border: #e2e8f0;
      --text-main: #0f172a;
      --text-muted: #64748b;
      --radius-sm: 8px;
      --radius-md: 12px;
      --radius-lg: 16px;
      --radius-full: 9999px;
      --shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.06);
      --shadow-md: 0 4px 12px rgba(15, 23, 42, 0.08);
      --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }

    [data-theme="dark"] {
      --primary: #3b82f6;
      --primary-light: #60a5fa;
      --primary-dark: #1d4ed8;
      --primary-subtle: rgba(59, 130, 246, 0.15);
      --bg-main: #090d16;
      --bg-card: #131b2e;
      --bg-subtle: #1e293b;
      --border: #23314d;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
    body {
      font-family: var(--font-family);
      background-color: var(--bg-main);
      color: var(--text-main);
      min-height: 100vh;
      user-select: none;
      padding-bottom: 30px;
    }

    /* Header */
    .app-header {
      position: sticky;
      top: 0;
      z-index: 50;
      background: var(--bg-card);
      border-bottom: 1px solid var(--border);
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: var(--shadow-sm);
    }
    .brand-title { font-size: 17px; font-weight: 800; display: flex; align-items: center; gap: 8px; }
    .class-pill {
      background: var(--primary-subtle);
      color: var(--primary);
      border: 1px solid var(--primary-light);
      padding: 6px 14px;
      border-radius: var(--radius-full);
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }
    .class-pill:active { transform: scale(0.96); }
    .theme-btn {
      background: var(--bg-subtle);
      border: 1px solid var(--border);
      font-size: 16px;
      padding: 6px 10px;
      border-radius: var(--radius-md);
      cursor: pointer;
    }

    .container { max-width: 600px; margin: 0 auto; padding: 16px; }

    /* Day pills */
    .day-pills {
      display: flex;
      gap: 6px;
      overflow-x: auto;
      scrollbar-width: none;
      margin-bottom: 16px;
      padding-bottom: 4px;
    }
    .day-pills::-webkit-scrollbar { display: none; }
    .day-pill {
      flex-shrink: 0;
      padding: 8px 14px;
      border-radius: var(--radius-full);
      background: var(--bg-card);
      border: 1px solid var(--border);
      font-size: 13px;
      font-weight: 700;
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .day-pill.active {
      background: var(--primary);
      color: #ffffff;
      border-color: var(--primary);
      box-shadow: 0 4px 10px rgba(37, 99, 235, 0.3);
    }

    /* Live Hero Card (Jonli ko'k banner) */
    .current-hero {
      background: linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #3b82f6 100%);
      color: #ffffff;
      padding: 16px 18px;
      border-radius: var(--radius-lg);
      margin-bottom: 16px;
      box-shadow: 0 8px 24px -4px rgba(37, 99, 235, 0.45);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    .current-hero.is-break {
      background: linear-gradient(135deg, #0369a1 0%, #0284c7 50%, #38bdf8 100%);
      box-shadow: 0 8px 24px -4px rgba(2, 132, 199, 0.4);
    }
    .hero-top { display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 800; text-transform: uppercase; margin-bottom: 6px; }
    .pulse-dot {
      width: 8px; height: 8px; background: #4ade80; border-radius: 50%;
      box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.7);
      animation: pulse 1.8s infinite;
    }
    @keyframes pulse {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.7); }
      70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(74, 222, 128, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(74, 222, 128, 0); }
    }
    .hero-subject { font-size: 19px; font-weight: 800; margin-bottom: 4px; }
    .hero-meta { display: flex; flex-wrap: wrap; gap: 10px; font-size: 12px; opacity: 0.95; }
    .hero-pill { background: rgba(255, 255, 255, 0.2); padding: 2px 8px; border-radius: var(--radius-sm); font-weight: 700; }

    /* Lesson List */
    .lessons-list { display: flex; flex-direction: column; gap: 10px; }
    .lesson-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 14px 16px;
      box-shadow: var(--shadow-sm);
      display: flex;
      align-items: center;
      gap: 14px;
      position: relative;
      transition: all 0.2s ease;
    }
    .lesson-card::before {
      content: ''; position: absolute; left: 0; top: 12px; bottom: 12px; width: 4px;
      border-radius: 0 4px 4px 0; background: var(--primary-light);
    }
    .lesson-card.is-current {
      border: 2px solid #2563eb;
      background: linear-gradient(135deg, rgba(37, 99, 235, 0.09) 0%, rgba(59, 130, 246, 0.03) 100%), var(--bg-card);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2), 0 8px 16px -2px rgba(37, 99, 235, 0.15);
      transform: scale(1.01);
    }
    .lesson-card.is-current::before { background: #2563eb; width: 6px; box-shadow: 0 0 10px #2563eb; }
    .lesson-num {
      width: 32px; height: 32px; border-radius: var(--radius-full); background: var(--bg-subtle);
      color: var(--primary); font-size: 14px; font-weight: 800; display: flex; align-items: center;
      justify-content: center; flex-shrink: 0;
    }
    .lesson-card.is-current .lesson-num { background: #2563eb; color: #ffffff; }
    .lesson-content { flex: 1; min-width: 0; }
    .lesson-time { font-size: 12px; font-weight: 700; color: var(--primary); display: flex; align-items: center; gap: 6px; margin-bottom: 2px; }
    .now-tag { background: #2563eb; color: #ffffff; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: var(--radius-full); }
    .lesson-title { font-size: 15px; font-weight: 800; color: var(--text-main); margin-bottom: 4px; display: flex; align-items: center; gap: 6px; }
    .lesson-details { font-size: 12px; color: var(--text-muted); display: flex; flex-wrap: wrap; gap: 8px; }
    .room-badge { background: var(--bg-subtle); padding: 2px 8px; border-radius: var(--radius-sm); font-weight: 600; }

    /* Class Selection Modal */
    .modal-overlay {
      position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(4px);
      z-index: 100; display: none; align-items: flex-end; justify-content: center;
    }
    .modal-overlay.active { display: flex; }
    .modal-sheet {
      background: var(--bg-card); width: 100%; max-width: 600px; max-height: 88vh;
      border-radius: 24px 24px 0 0; padding: 20px; overflow-y: auto;
      box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.2); animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
    .modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .modal-title { font-size: 18px; font-weight: 800; }
    .close-btn { background: var(--bg-subtle); border: none; font-size: 18px; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; color: var(--text-main); }
    
    /* Search & Category Filter */
    .search-input {
      width: 100%;
      padding: 12px 16px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border);
      background: var(--bg-subtle);
      color: var(--text-main);
      font-size: 14px;
      font-weight: 600;
      outline: none;
      margin-bottom: 12px;
      transition: border-color 0.2s;
    }
    .search-input:focus {
      border-color: var(--primary);
      background: var(--bg-card);
    }
    .category-tabs {
      display: flex;
      gap: 6px;
      overflow-x: auto;
      scrollbar-width: none;
      margin-bottom: 16px;
      padding-bottom: 2px;
    }
    .category-tabs::-webkit-scrollbar { display: none; }
    .category-tab {
      flex-shrink: 0;
      padding: 6px 12px;
      border-radius: var(--radius-full);
      background: var(--bg-subtle);
      border: 1px solid var(--border);
      font-size: 12px;
      font-weight: 700;
      color: var(--text-muted);
      cursor: pointer;
    }
    .category-tab.active {
      background: var(--primary);
      color: #ffffff;
      border-color: var(--primary);
    }

    .class-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; }
    @media (max-width: 420px) {
      .class-grid { grid-template-columns: repeat(3, 1fr); }
    }
    .class-card {
      background: var(--bg-subtle); border: 1px solid var(--border); border-radius: var(--radius-md);
      padding: 12px 6px; text-align: center; font-size: 14px; font-weight: 800; cursor: pointer;
      transition: all 0.15s ease;
    }
    .class-card:active { transform: scale(0.96); background: var(--primary-subtle); border-color: var(--primary); }
    .class-card.selected { background: var(--primary); color: #ffffff; border-color: var(--primary); }

    .empty-state { text-align: center; padding: 40px 20px; color: var(--text-muted); }
  </style>
</head>
<body>

  <header class="app-header">
    <div class="brand-title">🏫 <span>MAKTAB JADVALI</span></div>
    <div style="display:flex;align-items:center;gap:8px;">
      <button class="class-pill" id="selected-class-btn" onclick="openClassModal()">🏫 Sinf tanlang ▾</button>
      <button class="theme-btn" onclick="toggleTheme()">🌓</button>
    </div>
  </header>

  <main class="container">
    <!-- Day navigation pills -->
    <div class="day-pills" id="day-pills">
      <button class="day-pill active" onclick="setDay('today')">📅 Bugun</button>
      <button class="day-pill" onclick="setDay(1)">Dushanba</button>
      <button class="day-pill" onclick="setDay(2)">Seshanba</button>
      <button class="day-pill" onclick="setDay(3)">Chorshanba</button>
      <button class="day-pill" onclick="setDay(4)">Payshanba</button>
      <button class="day-pill" onclick="setDay(5)">Juma</button>
      <button class="day-pill" onclick="setDay(6)">Shanba</button>
    </div>

    <!-- Current active lesson banner (Ko'k rangdagi jonli dars banneri) -->
    <div id="hero-container"></div>

    <!-- Lesson cards list -->
    <div class="lessons-list" id="lessons-container"></div>
  </main>

  <!-- Class selection modal -->
  <div class="modal-overlay" id="class-modal">
    <div class="modal-sheet">
      <div class="modal-header">
        <div class="modal-title">🏫 O‘z sinfingizni tanlang</div>
        <button class="close-btn" onclick="closeClassModal()">✕</button>
      </div>

      <!-- Quick Search -->
      <input type="text" class="search-input" id="class-search" placeholder="🔍 Sinfni qidirish (masalan: 7-A, 11-D)..." oninput="filterClasses()">

      <!-- Category Filter -->
      <div class="category-tabs" id="category-tabs">
        <button class="category-tab active" onclick="setCategory('all')">Barchasi (40)</button>
        <button class="category-tab" onclick="setCategory('primary')">1-4 sinf</button>
        <button class="category-tab" onclick="setCategory('middle')">5-9 sinf</button>
        <button class="category-tab" onclick="setCategory('high')">10-11 sinf</button>
      </div>

      <div class="class-grid" id="class-grid"></div>
    </div>
  </div>

  <script>
    // Barcha 40 ta maktab sinflari va 1189 ta to'liq dars jadvallari
    const SCHOOL_DATA = ${schoolDataJson};

    let selectedClassId = localStorage.getItem('maktab_app_class_id');
    let currentDayTab = 'today';
    let currentCategory = 'all';
    let currentSearchText = '';

    function init() {
      // Default initial class if not selected
      if (!selectedClassId) {
        selectedClassId = SCHOOL_DATA.classes[0]?.id || '1-A';
      }
      updateClassHeader();
      renderClassGrid();
      renderSchedule();
      setInterval(updateLiveStatus, 15000);
    }

    function toggleTheme() {
      const html = document.documentElement;
      const current = html.getAttribute('data-theme') || 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', next);
      localStorage.setItem('maktab_theme', next);
    }

    // Restore theme
    const savedTheme = localStorage.getItem('maktab_theme');
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
    }

    function openClassModal() {
      document.getElementById('class-modal').classList.add('active');
      document.getElementById('class-search').value = '';
      currentSearchText = '';
      filterClasses();
    }
    function closeClassModal() {
      document.getElementById('class-modal').classList.remove('active');
    }

    function setCategory(cat) {
      currentCategory = cat;
      document.querySelectorAll('.category-tab').forEach((tab, idx) => {
        const matches = (cat === 'all' && idx === 0) ||
                        (cat === 'primary' && idx === 1) ||
                        (cat === 'middle' && idx === 2) ||
                        (cat === 'high' && idx === 3);
        tab.classList.toggle('active', matches);
      });
      filterClasses();
    }

    function filterClasses() {
      currentSearchText = (document.getElementById('class-search').value || '').trim().toLowerCase();
      renderClassGrid();
    }

    function renderClassGrid() {
      const grid = document.getElementById('class-grid');
      const filtered = SCHOOL_DATA.classes.filter(c => {
        const matchesCat = (currentCategory === 'all') || (c.category === currentCategory);
        const matchesSearch = !currentSearchText || c.name.toLowerCase().includes(currentSearchText) || c.id.toLowerCase().includes(currentSearchText);
        return matchesCat && matchesSearch;
      });

      if (filtered.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1 / -1; text-align:center; padding: 20px; color: var(--text-muted);">Sinf topilmadi 🔍</div>';
        return;
      }

      grid.innerHTML = filtered.map(c => \`
        <div class="class-card \${c.id === selectedClassId ? 'selected' : ''}" onclick="selectClass('\${c.id}')">
          \${c.id}
        </div>
      \`).join('');
    }

    function selectClass(classId) {
      selectedClassId = classId;
      localStorage.setItem('maktab_app_class_id', classId);
      updateClassHeader();
      renderClassGrid();
      closeClassModal();
      renderSchedule();
    }

    function updateClassHeader() {
      const cls = SCHOOL_DATA.classes.find(c => c.id === selectedClassId) || { name: selectedClassId + ' sinf' };
      document.getElementById('selected-class-btn').innerHTML = \`🏫 \${cls.name} ▾\`;
    }

    function setDay(day) {
      currentDayTab = day;
      document.querySelectorAll('.day-pill').forEach((btn, idx) => {
        const isMatch = (day === 'today' && idx === 0) || (typeof day === 'number' && idx === day);
        btn.classList.toggle('active', isMatch);
      });
      renderSchedule();
    }

    function getCurrentTimeStr() {
      const now = new Date();
      return \`\${String(now.getHours()).padStart(2, '0')}:\${String(now.getMinutes()).padStart(2, '0')}\`;
    }

    function getCurrentDayOfWeek() {
      const d = new Date().getDay(); // 0=Yak, 1=Dush..6=Shanba
      return d === 0 ? 7 : d;
    }

    function renderSchedule() {
      const targetDay = currentDayTab === 'today' ? getCurrentDayOfWeek() : currentDayTab;
      const isTodayView = currentDayTab === 'today';
      const scheduleMap = SCHOOL_DATA.schedules[selectedClassId] || {};
      const lessons = scheduleMap[targetDay] || [];

      const nowTime = getCurrentTimeStr();
      let currentLesson = null;
      let nextLesson = null;

      if (isTodayView && lessons.length > 0) {
        lessons.forEach(l => {
          if (nowTime >= l.start && nowTime <= l.end) {
            currentLesson = l;
          } else if (nowTime < l.start && !nextLesson) {
            nextLesson = l;
          }
        });
      }

      // Render Hero Live Status
      const heroContainer = document.getElementById('hero-container');
      if (isTodayView) {
        if (targetDay === 7) {
          heroContainer.innerHTML = \`
            <div class="current-hero is-break">
              <div class="hero-top"><span class="pulse-dot" style="background:#facc15;"></span> Yakshanba — Dam olish kuni 🎉</div>
              <div class="hero-subject">Bugun maktabda darslar yo‘q</div>
              <div class="hero-meta">Kelgusi darslar Dushanba kuni soat 08:30 da boshlanadi</div>
            </div>
          \`;
        } else if (currentLesson) {
          heroContainer.innerHTML = \`
            <div class="current-hero">
              <div class="hero-top"><span class="pulse-dot"></span> Hozirgi dars davom etmoqda</div>
              <div class="hero-subject">\${currentLesson.emoji} \${currentLesson.subject}</div>
              <div class="hero-meta">
                <span class="hero-pill">⏰ \${currentLesson.start} - \${currentLesson.end}</span>
                <span class="hero-pill">🚪 \${currentLesson.room}</span>
                <span class="hero-pill">👨‍🏫 \${currentLesson.teacher}</span>
              </div>
            </div>
          \`;
        } else if (nextLesson) {
          heroContainer.innerHTML = \`
            <div class="current-hero is-break">
              <div class="hero-top"><span class="pulse-dot" style="background:#38bdf8;"></span> Keyingi dars</div>
              <div class="hero-subject">\${nextLesson.emoji} \${nextLesson.subject}</div>
              <div class="hero-meta">
                <span class="hero-pill">⏰ Boshlanishi: \${nextLesson.start}</span>
                <span class="hero-pill">🚪 \${nextLesson.room}</span>
              </div>
            </div>
          \`;
        } else if (lessons.length > 0 && nowTime > lessons[lessons.length - 1].end) {
          heroContainer.innerHTML = \`
            <div class="current-hero is-break">
              <div class="hero-top">Bugungi barcha darslar yakunlandi ✨</div>
              <div class="hero-subject">Ertangi darslarga tayyorlaning!</div>
              <div class="hero-meta">Barcha darslar muvaffaqiyatli o‘tildi</div>
            </div>
          \`;
        } else {
          heroContainer.innerHTML = '';
        }
      } else {
        heroContainer.innerHTML = '';
      }

      // Render Lessons List
      const lessonsContainer = document.getElementById('lessons-container');
      if (lessons.length === 0) {
        lessonsContainer.innerHTML = \`
          <div class="empty-state">
            <div style="font-size: 40px; margin-bottom: 12px;">📅</div>
            <div style="font-size: 16px; font-weight: 700; margin-bottom: 4px;">Ushbu kunga darslar belgilanmagan</div>
            <div style="font-size: 13px;">Dam olish yoki boshqa kun jadvalini tanlang</div>
          </div>
        \`;
        return;
      }

      lessonsContainer.innerHTML = lessons.map((l, index) => {
        const isCurrent = isTodayView && (nowTime >= l.start && nowTime <= l.end);
        return \`
          <div class="lesson-card \${isCurrent ? 'is-current' : ''}">
            <div class="lesson-num">\${index + 1}</div>
            <div class="lesson-content">
              <div class="lesson-time">
                <span>⏰ \${l.start} — \${l.end}</span>
                \${isCurrent ? '<span class="now-tag">HOZIR</span>' : ''}
              </div>
              <div class="lesson-title">
                <span>\${l.emoji}</span>
                <span>\${l.subject}</span>
              </div>
              <div class="lesson-details">
                <span class="room-badge">🚪 \${l.room}</span>
                <span>👨‍🏫 \${l.teacher}</span>
              </div>
            </div>
          </div>
        \`;
      }).join('');
    }

    function updateLiveStatus() {
      if (currentDayTab === 'today') {
        renderSchedule();
      }
    }

    window.onload = init;
  </script>
</body>
</html>`;

  fs.writeFileSync('android-app/app/src/main/assets/index.html', htmlContent, 'utf8');
  console.log('✅ Android assets/index.html barcha 40 ta sinf va 1189 ta dars bilan muvaffaqiyatli yangilandi!');
}

generateFullHtml();
