/* =========================================================
   MADAD TA'LIM — Lesson Creator & AI / Internet Generator
   ========================================================= */

window.LessonCreatorModule = {
  currentGeneratedLesson: null,
  activeMode: 'ai', // 'ai' or 'web'

  render(prefillData = null) {
    const container = document.getElementById('main-content-area');
    if (!container) return;

    const initialTopic = prefillData ? prefillData.topic : 'Animals';
    const initialSubject = prefillData ? prefillData.subject : 'English';
    const initialGrade = prefillData ? prefillData.grade : '3-sinf';

    container.innerHTML = `
      <div class="animate-fade">
        <div class="section-header">
          <div>
            <h2>➕ Yangi Dars Yaratish</h2>
            <p style="color:var(--text-muted); font-size:13px;">AI yordamchi yoki Internet qidiruvi orqali dars materiallarini avtomatik tayyorlang</p>
          </div>
          <button class="btn btn-secondary" onclick="window.AppRouter.navigate('dashboard')">
            ← Ortga (Dashboard)
          </button>
        </div>

        <div class="creator-container">
          <!-- Left: Input Form & Mode Selection -->
          <div class="glass-panel" style="padding: 28px;">
            <!-- Mode Switcher Tabs -->
            <div class="tabs-header">
              <button class="tab-btn active" id="tab-mode-ai" onclick="window.LessonCreatorModule.switchMode('ai')">
                <span>🤖 AI Yordamchi</span>
              </button>
              <button class="tab-btn" id="tab-mode-web" onclick="window.LessonCreatorModule.switchMode('web')">
                <span>🌐 Internetdan izlash</span>
              </button>
            </div>

            <form id="lesson-create-form" onsubmit="event.preventDefault(); window.LessonCreatorModule.generateLesson();">
              <div class="form-group">
                <label>📚 Dars Tili (Fani):</label>
                <select id="lesson-subject" class="form-control" onchange="window.LessonCreatorModule.onSubjectChange()">
                  <option value="English" ${initialSubject === 'English' ? 'selected' : ''}>🇬🇧 Ingliz tili (English)</option>
                  <option value="Русский язык" ${initialSubject === 'Русский язык' ? 'selected' : ''}>🇷🇺 Rus tili (Русский язык)</option>
                  <option value="Arab tili" ${initialSubject === 'Arab tili' ? 'selected' : ''}>🇸🇦 Arab tili</option>
                  <option value="Ona tili" ${initialSubject === 'Ona tili' ? 'selected' : ''}>🇺🇿 Ona tili va O‘qish</option>
                </select>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div class="form-group">
                  <label>🏫 Sinf:</label>
                  <select id="lesson-grade" class="form-control">
                    <option value="1-sinf" ${initialGrade === '1-sinf' ? 'selected' : ''}>1-sinf</option>
                    <option value="2-sinf" ${initialGrade === '2-sinf' ? 'selected' : ''}>2-sinf</option>
                    <option value="3-sinf" ${initialGrade === '3-sinf' ? 'selected' : ''}>3-sinf</option>
                    <option value="4-sinf" ${initialGrade === '4-sinf' ? 'selected' : ''}>4-sinf</option>
                    <option value="5-sinf" ${initialGrade === '5-sinf' ? 'selected' : ''}>5-sinf</option>
                  </select>
                </div>

                <div class="form-group">
                  <label>⏱ Dars Davomiyligi:</label>
                  <select id="lesson-duration" class="form-control">
                    <option value="1 kunlik" selected>1 kunlik dars</option>
                    <option value="2 kunlik">2 kunlik modul</option>
                    <option value="1 haftalik">1 haftalik sikl</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label>🎯 Qiyinlik Darajasi:</label>
                <div class="flex gap-2">
                  <label class="btn btn-outline btn-sm flex-1" style="cursor:pointer; display:flex; justify-content:center; gap:6px;">
                    <input type="radio" name="lesson-level" value="Oson" checked> Oson
                  </label>
                  <label class="btn btn-outline btn-sm flex-1" style="cursor:pointer; display:flex; justify-content:center; gap:6px;">
                    <input type="radio" name="lesson-level" value="O‘rta"> O‘rta
                  </label>
                  <label class="btn btn-outline btn-sm flex-1" style="cursor:pointer; display:flex; justify-content:center; gap:6px;">
                    <input type="radio" name="lesson-level" value="Qiyin"> Qiyin
                  </label>
                </div>
              </div>

              <div class="form-group">
                <label id="topic-prompt-label">📝 Mavzu yoki AI uchun so‘rov:</label>
                <div style="position:relative;">
                  <input type="text" id="lesson-topic-input" class="form-control" 
                    placeholder="Masalan: Animals (yoki 'Animals mavzusida 3-sinf uchun dars tuz')" 
                    value="${initialTopic}" required>
                </div>
                <div id="ai-quick-suggestions" class="flex flex-wrap gap-2" style="margin-top: 10px;">
                  <span style="font-size:12px; color:var(--text-muted);">Tavsiya mavzular:</span>
                  <button type="button" class="badge badge-muted" onclick="window.LessonCreatorModule.setTopic('Animals (Hayvonlar)')">🦁 Animals</button>
                  <button type="button" class="badge badge-muted" onclick="window.LessonCreatorModule.setTopic('Colors & Shapes (Ranglar)')">🎨 Colors</button>
                  <button type="button" class="badge badge-muted" onclick="window.LessonCreatorModule.setTopic('Family & Home (Oila)')">🏡 Family</button>
                  <button type="button" class="badge badge-muted" onclick="window.LessonCreatorModule.setTopic('Present Simple (Kun tartibi)')">⏰ Present Simple</button>
                  <button type="button" class="badge badge-muted" onclick="window.LessonCreatorModule.setTopic('Food and Drinks (Taomlar)')">🍎 Food & Fruits</button>
                </div>
              </div>

              <!-- Web search extra note if web mode is active -->
              <div id="web-search-info" style="display:none; background:var(--secondary-light); border:1px solid rgba(6,182,212,0.3); border-radius:var(--radius-md); padding:12px; margin-bottom:18px;">
                <p style="font-size:13px; color:#0e7490;">
                  🌐 <strong>Internet qidiruvi faol:</strong> Dastur rasmiy darslik va ochiq ta'lim bazasidan test savollari va materiallarni topib, siz uchun saralab beradi. Ustoz tasdiqlamaguncha o‘quvchiga ko‘rinmaydi.
                </p>
              </div>

              <button type="submit" id="btn-generate" class="btn btn-primary btn-lg" style="width: 100%; margin-top: 8px;">
                <span id="gen-btn-icon">⚡</span>
                <span id="gen-btn-text">Darsni Avtomatik Yaratish</span>
              </button>
            </form>
          </div>

          <!-- Right: Generated Lesson Preview & Teacher Editor -->
          <div class="ai-generation-preview">
            <div id="preview-placeholder" class="preview-empty-state">
              <div class="icon">✨</div>
              <h3 style="font-size: 18px; font-weight:800; margin-bottom: 8px;">Dars Materiallari Ko‘rinishi</h3>
              <p style="color:var(--text-muted); font-size:13px; max-width:360px; margin:0 auto 20px;">
                Chap tomondagi parametrlar bo‘yicha mavzuni kiriting va "Darsni Avtomatik Yaratish" tugmasini bosing.
              </p>
              <button class="btn btn-outline" onclick="window.LessonCreatorModule.generateLesson('Animals')">
                <span>⚡ Namunaviy 'Animals' darsini yaratish</span>
              </button>
            </div>

            <div id="preview-content" style="display:none; flex-direction:column; height:100%;">
              <div class="flex items-center justify-between" style="border-bottom:1px solid var(--border-subtle); padding-bottom:16px; margin-bottom:16px;">
                <div>
                  <span class="badge badge-success" id="preview-badge-status">✅ AI Tayyorladi (Tahrirlash mumkin)</span>
                  <h3 id="preview-title" style="margin-top:6px; font-size:18px;">Animals (3-sinf)</h3>
                </div>
                <div class="flex gap-2">
                  <button class="btn btn-sm btn-primary" onclick="window.LessonCreatorModule.saveAndStartLesson()">
                    <span>▶ Darsni O‘tish</span>
                  </button>
                  <button class="btn btn-sm btn-success" onclick="window.LessonCreatorModule.saveLessonOnly()">
                    <span>💾 Saqlash</span>
                  </button>
                </div>
              </div>

              <div id="preview-tabs" style="flex:1; overflow-y:auto; padding-right:6px;">
                <!-- Word list preview -->
                <div style="margin-bottom: 20px;">
                  <h4 style="font-size:14px; margin-bottom:10px; color:var(--primary);">📖 1. Yangi so‘zlar & Talaffuz (${this.currentGeneratedLesson?.vocabulary?.length || 0} ta):</h4>
                  <div id="preview-vocab-list" style="display:flex; flex-direction:column; gap:8px;"></div>
                </div>

                <!-- Missing Letters spelling preview -->
                <div style="margin-bottom: 20px;">
                  <h4 style="font-size:14px; margin-bottom:10px; color:var(--primary);">✍️ 2. Yozma topshiriqlar (C _ T formatida):</h4>
                  <div id="preview-spelling-list" style="display:flex; flex-wrap:wrap; gap:8px;"></div>
                </div>

                <!-- Test preview -->
                <div>
                  <h4 style="font-size:14px; margin-bottom:10px; color:var(--primary);">📝 3. Kun yakuniy testi (${this.currentGeneratedLesson?.quiz?.length || 0} ta savol):</h4>
                  <div id="preview-quiz-list" style="display:flex; flex-direction:column; gap:8px;"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    if (prefillData) {
      this.generateLesson(prefillData.topic);
    }
  },

  switchMode(mode) {
    this.activeMode = mode;
    document.getElementById('tab-mode-ai')?.classList.toggle('active', mode === 'ai');
    document.getElementById('tab-mode-web')?.classList.toggle('active', mode === 'web');
    
    const webInfo = document.getElementById('web-search-info');
    const label = document.getElementById('topic-prompt-label');
    const btnText = document.getElementById('gen-btn-text');

    if (mode === 'web') {
      if (webInfo) webInfo.style.display = 'block';
      if (label) label.innerText = '🌐 Internet qidiruv so‘rovi:';
      if (btnText) btnText.innerText = 'Internetdan Material & Test Topish';
    } else {
      if (webInfo) webInfo.style.display = 'none';
      if (label) label.innerText = '📝 Mavzu yoki AI uchun so‘rov:';
      if (btnText) btnText.innerText = 'AI orqali Dars Yaratish';
    }
    window.speechEngine.playFx('click');
  },

  setTopic(topic) {
    const input = document.getElementById('lesson-topic-input');
    if (input) {
      input.value = topic;
      window.speechEngine.playFx('click');
    }
  },

  onSubjectChange() {
    const subject = document.getElementById('lesson-subject')?.value;
    const suggestions = document.getElementById('ai-quick-suggestions');
    if (!suggestions) return;

    if (subject === 'Русский язык') {
      suggestions.innerHTML = `
        <span style="font-size:12px; color:var(--text-muted);">Tavsiya:</span>
        <button type="button" class="badge badge-muted" onclick="window.LessonCreatorModule.setTopic('Цвета (Ranglar)')">🎨 Цвета</button>
        <button type="button" class="badge badge-muted" onclick="window.LessonCreatorModule.setTopic('Школьные принадлежности')">🎒 Школа</button>
        <button type="button" class="badge badge-muted" onclick="window.LessonCreatorModule.setTopic('Моя Семья')">👨‍👩‍👧 Семья</button>
      `;
    } else if (subject === 'Arab tili') {
      suggestions.innerHTML = `
        <span style="font-size:12px; color:var(--text-muted);">Tavsiya:</span>
        <button type="button" class="badge badge-muted" onclick="window.LessonCreatorModule.setTopic('Alifbo harflari va so‘zlar')">🔤 Alifbo</button>
        <button type="button" class="badge badge-muted" onclick="window.LessonCreatorModule.setTopic('Hayvonlar nomlari')">🦁 Hayvonlar</button>
      `;
    } else {
      suggestions.innerHTML = `
        <span style="font-size:12px; color:var(--text-muted);">Tavsiya:</span>
        <button type="button" class="badge badge-muted" onclick="window.LessonCreatorModule.setTopic('Animals (Hayvonlar)')">🦁 Animals</button>
        <button type="button" class="badge badge-muted" onclick="window.LessonCreatorModule.setTopic('Colors & Shapes')">🎨 Colors</button>
        <button type="button" class="badge badge-muted" onclick="window.LessonCreatorModule.setTopic('Present Simple')">⏰ Present Simple</button>
        <button type="button" class="badge badge-muted" onclick="window.LessonCreatorModule.setTopic('Food & Drinks')">🍎 Food & Fruits</button>
      `;
    }
  },

  // Generates complete 5-stage lesson content
  generateLesson(forcedTopic = null) {
    const subject = document.getElementById('lesson-subject')?.value || 'English';
    const grade = document.getElementById('lesson-grade')?.value || '3-sinf';
    const duration = document.getElementById('lesson-duration')?.value || '1 kunlik';
    const topic = forcedTopic || document.getElementById('lesson-topic-input')?.value || 'Animals';
    const level = document.querySelector('input[name="lesson-level"]:checked')?.value || 'O‘rta';

    // Show loading state
    const btn = document.getElementById('btn-generate');
    const icon = document.getElementById('gen-btn-icon');
    const text = document.getElementById('gen-btn-text');
    if (btn) btn.disabled = true;
    if (icon) icon.innerText = '⏳';
    if (text) text.innerText = this.activeMode === 'web' ? 'Internetdan ma’lumot saralanmoqda...' : 'AI dars va mashqlarni tuzmoqda...';

    window.speechEngine.playFx('click');

    setTimeout(() => {
      // Build tailored educational curriculum data based on subject & topic
      const generated = this.buildCurriculumContent(subject, grade, topic, duration, level);
      this.currentGeneratedLesson = generated;

      // Update UI
      if (btn) btn.disabled = false;
      if (icon) icon.innerText = '⚡';
      if (text) text.innerText = this.activeMode === 'web' ? 'Internetdan Material & Test Topish' : 'AI orqali Dars Yaratish';

      document.getElementById('preview-placeholder').style.display = 'none';
      const previewContent = document.getElementById('preview-content');
      if (previewContent) {
        previewContent.style.display = 'flex';
      }

      this.renderPreviewData();
      window.speechEngine.playFx('correct');
      window.AppRouter.showToast(`"${topic}" darsi muvaffaqiyatli tayyorlandi! Ustoz sifatida ko‘rib chiqing.`, 'success');
    }, 600);
  },

  buildCurriculumContent(subject, grade, topic, duration, level) {
    const lower = topic.toLowerCase();
    let flag = '🇬🇧';
    let langCode = 'en-US';

    if (subject === 'Русский язык') {
      flag = '🇷🇺';
      langCode = 'ru-RU';
    } else if (subject === 'Arab tili') {
      flag = '🇸🇦';
      langCode = 'ar-SA';
    } else if (subject === 'Ona tili') {
      flag = '🇺🇿';
      langCode = 'uz-UZ';
    }

    // Comprehensive topic templates with vocabulary and quiz
    let vocab = [];
    let quiz = [];

    if (lower.includes('animal') || lower.includes('hayvon')) {
      vocab = [
        { word: "Cat", translation: "Mushuk", phonetic: "[kæt]", emoji: "🐱", example: "A cat is playing with wool.", missingLetter: "C _ T", fullWord: "CAT" },
        { word: "Dog", translation: "It", phonetic: "[dɒɡ]", emoji: "🐶", example: "The dog is running in the yard.", missingLetter: "D _ G", fullWord: "DOG" },
        { word: "Lion", translation: "Sher", phonetic: "[ˈlaɪ.ən]", emoji: "🦁", example: "The lion is the king of animals.", missingLetter: "L _ O N", fullWord: "LION" },
        { word: "Tiger", translation: "Yo‘lbars", phonetic: "[ˈtaɪ.ɡər]", emoji: "🐯", example: "A tiger has orange and black stripes.", missingLetter: "T _ G _ R", fullWord: "TIGER" },
        { word: "Elephant", translation: "Fil", phonetic: "[ˈel.ɪ.fənt]", emoji: "🐘", example: "The elephant has large ears.", missingLetter: "E L _ P H _ N T", fullWord: "ELEPHANT" },
        { word: "Monkey", translation: "Maymun", phonetic: "[ˈmʌŋ.ki]", emoji: "🐒", example: "A monkey eats yellow bananas.", missingLetter: "M _ N K _ Y", fullWord: "MONKEY" }
      ];
      quiz = [
        { question: "Qaysi hayvon 'Lion' deb ataladi?", options: ["Yo‘lbars", "Sher", "Bo‘ri", "Fil"], correctIndex: 1, explanation: "'Lion' — Sher." },
        { question: "'Tiger' so‘zining o‘zbekcha tarjimasi nima?", options: ["Qoplon", "Yo‘lbars", "Sher", "Ayiq"], correctIndex: 1, explanation: "'Tiger' — Yo‘lbars." },
        { question: "Tushirib qoldirilgan harfni toping: C _ T", options: ["O", "A", "E", "I"], correctIndex: 1, explanation: "CAT (Mushuk)." },
        { question: "Qaysi hayvon bananni yaxshi ko‘radi?", options: ["Dog", "Monkey", "Cat", "Lion"], correctIndex: 1, explanation: "Monkey (Maymun)." }
      ];
    } else if (lower.includes('color') || lower.includes('rang') || lower.includes('цвет')) {
      vocab = [
        { word: "Red", translation: "Qizil", phonetic: "[red]", emoji: "🔴", example: "Red apples are sweet.", missingLetter: "R _ D", fullWord: "RED" },
        { word: "Blue", translation: "Ko‘k", phonetic: "[bluː]", emoji: "🔵", example: "The sky is blue today.", missingLetter: "B L _ E", fullWord: "BLUE" },
        { word: "Green", translation: "Yashil", phonetic: "[ɡriːn]", emoji: "🟢", example: "Fresh green leaves in spring.", missingLetter: "G R _ _ N", fullWord: "GREEN" },
        { word: "Yellow", translation: "Sariq", phonetic: "[ˈjel.əʊ]", emoji: "🟡", example: "The sun is bright yellow.", missingLetter: "Y _ L L _ W", fullWord: "YELLOW" }
      ];
      quiz = [
        { question: "'Red' qaysi rang?", options: ["Yashil", "Qizil", "Ko‘k", "Sariq"], correctIndex: 1, explanation: "Red — Qizil." },
        { question: "Quyosh qaysi rangda? (The sun is ___)", options: ["Yellow", "Blue", "Green", "Black"], correctIndex: 0, explanation: "Yellow — Sariq." }
      ];
    } else if (lower.includes('food') || lower.includes('fruit') || lower.includes('taom') || lower.includes('meva')) {
      vocab = [
        { word: "Apple", translation: "Olma", phonetic: "[ˈæp.əl]", emoji: "🍎", example: "I eat a red apple every day.", missingLetter: "A P P _ E", fullWord: "APPLE" },
        { word: "Banana", translation: "Banan", phonetic: "[bəˈnɑː.nə]", emoji: "🍌", example: "Monkeys like sweet bananas.", missingLetter: "B _ N A N _", fullWord: "BANANA" },
        { word: "Milk", translation: "Sut", phonetic: "[mɪlk]", emoji: "🥛", example: "Drink warm milk for health.", missingLetter: "M _ L K", fullWord: "MILK" },
        { word: "Bread", translation: "Non", phonetic: "[bred]", emoji: "🍞", example: "Fresh hot bread on table.", missingLetter: "B R _ A D", fullWord: "BREAD" }
      ];
      quiz = [
        { question: "'Apple' so‘zining ma'nosi nima?", options: ["Nok", "Olma", "Uzum", "Banan"], correctIndex: 1, explanation: "Apple — Olma." },
        { question: "Sut ingliz tilida qanday ataladi?", options: ["Juice", "Milk", "Water", "Tea"], correctIndex: 1, explanation: "Milk — Sut." }
      ];
    } else {
      // Dynamic fallback for any custom topic
      vocab = [
        { word: `${topic} 1`, translation: `${topic} asosiy tushunchasi`, phonetic: `[${topic.toLowerCase()}]`, emoji: "✨", example: `Learning about ${topic} in ${grade}.`, missingLetter: `${topic.slice(0, 2).toUpperCase()} _ _`, fullWord: topic.toUpperCase() },
        { word: `Practice Word`, translation: `Mashq so‘zi`, phonetic: `[præktɪs]`, emoji: "📝", example: `Practice makes perfect.`, missingLetter: `P R _ C T I C E`, fullWord: `PRACTICE` },
        { word: `Knowledge`, translation: `Bilim`, phonetic: `[ˈnɒl.ɪdʒ]`, emoji: "🧠", example: `Knowledge is key to success.`, missingLetter: `K N _ W`, fullWord: `KNOW` }
      ];
      quiz = [
        { question: `${topic} mavzusining asosiy maqsadi nima?`, options: ["Bilimlarni mustahkamlash", "Faqat yodlash", "Mashqsiz o‘rganish", "Noma'lum"], correctIndex: 0, explanation: "Har bir dars amaliy mashqlar orqali mustahkamlanadi." }
      ];
    }

    return {
      id: `lesson-${Date.now()}`,
      title: `${topic} (${grade})`,
      subject: subject,
      flag: flag,
      langCode: langCode,
      grade: grade,
      duration: duration,
      level: level,
      topic: topic,
      isToday: true,
      totalStudents: 25,
      avgScore: 90,
      vocabulary: vocab,
      quiz: quiz
    };
  },

  renderPreviewData() {
    if (!this.currentGeneratedLesson) return;
    const lesson = this.currentGeneratedLesson;

    const titleEl = document.getElementById('preview-title');
    if (titleEl) titleEl.innerText = `${lesson.flag} ${lesson.title} — ${lesson.duration} (${lesson.level})`;

    // Vocab list
    const vocabListEl = document.getElementById('preview-vocab-list');
    if (vocabListEl) {
      vocabListEl.innerHTML = lesson.vocabulary.map((v, i) => `
        <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 14px; background:var(--bg-muted); border-radius:var(--radius-md); border:1px solid var(--border-subtle);">
          <div class="flex items-center gap-3">
            <span style="font-size:24px;">${v.emoji}</span>
            <div>
              <strong>${v.word}</strong> <span style="color:var(--text-muted); font-size:12px;">${v.phonetic}</span> — <span style="color:var(--primary); font-weight:700;">${v.translation}</span>
              <p style="font-size:12px; color:var(--text-muted); margin-top:2px;">Misol: <em>"${v.example}"</em></p>
            </div>
          </div>
          <button class="btn btn-sm btn-icon" title="Ovozni eshitish" onclick="window.speechEngine.speak('${v.word}', '${lesson.langCode}')">
            🔊
          </button>
        </div>
      `).join('');
    }

    // Spelling list
    const spellingListEl = document.getElementById('preview-spelling-list');
    if (spellingListEl) {
      spellingListEl.innerHTML = lesson.vocabulary.map(v => `
        <div style="padding:6px 12px; background:var(--primary-light); border:1px dashed var(--primary); border-radius:var(--radius-md); font-weight:700; font-size:13px;">
          ${v.missingLetter} → <strong style="color:var(--primary);">${v.fullWord}</strong>
        </div>
      `).join('');
    }

    // Quiz list
    const quizListEl = document.getElementById('preview-quiz-list');
    if (quizListEl) {
      quizListEl.innerHTML = lesson.quiz.map((q, i) => `
        <div style="padding:10px 14px; background:var(--bg-muted); border-radius:var(--radius-md); border:1px solid var(--border-subtle); font-size:13px;">
          <strong>${i + 1}. ${q.question}</strong>
          <div class="flex gap-2" style="margin-top:6px; flex-wrap:wrap;">
            ${q.options.map((opt, idx) => `
              <span class="badge ${idx === q.correctIndex ? 'badge-success' : 'badge-muted'}">
                ${String.fromCharCode(65 + idx)}) ${opt} ${idx === q.correctIndex ? '✓' : ''}
              </span>
            `).join('')}
          </div>
        </div>
      `).join('');
    }
  },

  saveLessonOnly() {
    if (!this.currentGeneratedLesson) return;
    window.dataStore.saveLesson(this.currentGeneratedLesson);
    window.speechEngine.playFx('correct');
    window.AppRouter.showToast('Dars muvaffaqiyatli saqlandi!', 'success');
  },

  saveAndStartLesson() {
    if (!this.currentGeneratedLesson) return;
    const saved = window.dataStore.saveLesson(this.currentGeneratedLesson);
    window.LessonPlayerModule.openPlayer(saved.id);
  },

  openEditor(lessonId) {
    const lessons = window.dataStore.getLessons();
    const lesson = lessons.find(l => l.id === lessonId);
    if (!lesson) return;
    window.AppRouter.navigate('new-lesson');
    setTimeout(() => {
      this.currentGeneratedLesson = lesson;
      const input = document.getElementById('lesson-topic-input');
      if (input) input.value = lesson.topic;
      document.getElementById('preview-placeholder').style.display = 'none';
      const previewContent = document.getElementById('preview-content');
      if (previewContent) previewContent.style.display = 'flex';
      this.renderPreviewData();
    }, 100);
  }
};
