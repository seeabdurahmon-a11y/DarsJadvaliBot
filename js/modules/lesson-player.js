/* =========================================================
   MADAD TA'LIM — 5-Stage Interactive Lesson Player & Constructor
   ========================================================= */

window.LessonPlayerModule = {
  currentLesson: null,
  currentStage: 1, // 1 to 5
  // Stage 3 state (Spelling)
  spellingIndex: 0,
  // Stage 4 state (Match pairs)
  matchCards: [],
  selectedCard: null,
  matchedPairsCount: 0,
  // Stage 5 state (Quiz)
  quizIndex: 0,
  quizScore: 0,
  quizAnswers: [],

  openPlayer(lessonId) {
    const lessons = window.dataStore.getLessons();
    const lesson = lessons.find(l => l.id === lessonId) || lessons[0];
    if (!lesson) return;

    this.currentLesson = lesson;
    this.currentStage = 1;
    this.spellingIndex = 0;
    this.quizIndex = 0;
    this.quizScore = 0;
    this.quizAnswers = [];

    const modal = document.getElementById('lesson-player-modal');
    if (!modal) return;

    modal.classList.add('active');
    this.renderStage();
  },

  closePlayer() {
    const modal = document.getElementById('lesson-player-modal');
    if (modal) modal.classList.remove('active');
    window.speechEngine.synth?.cancel();
  },

  goToStage(stageNum) {
    if (stageNum < 1 || stageNum > 5) return;
    this.currentStage = stageNum;
    window.speechEngine.playFx('click');
    this.renderStage();
  },

  renderStage() {
    const lesson = this.currentLesson;
    if (!lesson) return;

    // Update Header Info
    const titleEl = document.getElementById('player-header-title');
    if (titleEl) {
      titleEl.innerHTML = `${lesson.flag} ${lesson.title} <span class="badge badge-primary">${lesson.grade}</span>`;
    }

    // Update Stepper buttons
    for (let i = 1; i <= 5; i++) {
      const stepBtn = document.getElementById(`step-btn-${i}`);
      if (stepBtn) {
        stepBtn.className = `stage-step-btn ${i === this.currentStage ? 'active' : ''} ${i < this.currentStage ? 'completed' : ''}`;
      }
    }

    const viewport = document.getElementById('player-viewport-content');
    if (!viewport) return;

    switch (this.currentStage) {
      case 1:
        this.renderStage1_Vocabulary(viewport);
        break;
      case 2:
        this.renderStage2_Pronunciation(viewport);
        break;
      case 3:
        this.renderStage3_Spelling(viewport);
        break;
      case 4:
        this.renderStage4_Review(viewport);
        break;
      case 5:
        this.renderStage5_FinalQuiz(viewport);
        break;
    }
  },

  // ==========================================
  // STAGE 1: YANGI MAVZU (Vocabulary & Cards)
  // ==========================================
  renderStage1_Vocabulary(container) {
    const lesson = this.currentLesson;
    container.innerHTML = `
      <div class="player-stage-content animate-fade">
        <div class="flex items-center justify-between" style="margin-bottom: 20px;">
          <div>
            <span class="badge badge-primary">📖 1-BOSQICH</span>
            <h2 style="font-size:24px; margin-top:4px;">Yangi mavzu va so‘zlar bilan tanishish</h2>
            <p style="color:var(--text-muted); font-size:14px;">So‘zlarning talaffuzi va ma'nosini o‘rganing. Audio tugmasi orqali jonli eshiting.</p>
          </div>
        </div>

        <div class="vocab-grid">
          ${lesson.vocabulary.map((v, i) => `
            <div class="vocab-card">
              <div class="vocab-emoji">${v.emoji || '📖'}</div>
              <div class="vocab-word">${v.word}</div>
              <div class="vocab-phonetic">${v.phonetic || ''}</div>
              <div class="vocab-translation">${v.translation}</div>
              <div class="vocab-example">"${v.example}"</div>
              
              <button class="audio-btn-pill" onclick="window.speechEngine.speak('${v.word}', '${lesson.langCode}')">
                <span>🔊 Talaffuzni eshitish</span>
              </button>
            </div>
          `).join('')}
        </div>

        <div class="flex justify-between" style="margin-top: 32px; padding-top: 20px; border-top: 1px solid var(--border-subtle);">
          <button class="btn btn-secondary" onclick="window.LessonPlayerModule.closePlayer()">Chiqish</button>
          <button class="btn btn-primary btn-lg" onclick="window.LessonPlayerModule.goToStage(2)">
            <span>Keyingi: 2. Talaffuz mashqi →</span>
          </button>
        </div>
      </div>
    `;
  },

  // ==========================================
  // STAGE 2: TALAFFUZ MASHQI (Pronunciation)
  // ==========================================
  pronounceIndex: 0,
  renderStage2_Pronunciation(container) {
    const lesson = this.currentLesson;
    const currentWordObj = lesson.vocabulary[this.pronounceIndex] || lesson.vocabulary[0];

    container.innerHTML = `
      <div class="player-stage-content animate-fade" style="max-width: 640px;">
        <div style="text-align:center; margin-bottom: 24px;">
          <span class="badge badge-primary">🔊 2-BOSQICH</span>
          <h2 style="font-size:24px; margin-top:4px;">Talaffuz mashqi (Pronunciation)</h2>
          <p style="color:var(--text-muted); font-size:14px;">Diqqat bilan tinglang va ovoz chiqarib takrorlang (${this.pronounceIndex + 1}/${lesson.vocabulary.length})</p>
        </div>

        <div class="pronounce-card">
          <span style="font-size: 64px;">${currentWordObj.emoji}</span>
          <div class="pronounce-word-display">${currentWordObj.word}</div>
          <div style="font-size: 18px; color: var(--text-muted);">${currentWordObj.phonetic} — <strong>${currentWordObj.translation}</strong></div>

          <!-- Animated Audio Waveform -->
          <div class="audio-visualizer" id="audio-wave-box">
            <div class="wave-bar"></div>
            <div class="wave-bar"></div>
            <div class="wave-bar"></div>
            <div class="wave-bar"></div>
            <div class="wave-bar"></div>
          </div>

          <div class="flex gap-3">
            <button class="btn btn-primary btn-lg" onclick="window.LessonPlayerModule.playPronounceAudio('${currentWordObj.word}', '${lesson.langCode}')">
              <span>🔊 Qayta Tinglash</span>
            </button>
            <button class="btn btn-outline btn-lg" onclick="window.LessonPlayerModule.simulateVoiceCheck('${currentWordObj.word}')">
              <span>🎙 Qaytarib aytish</span>
            </button>
          </div>
          <div id="voice-check-feedback" style="min-height: 24px; font-weight:700; font-size:14px;"></div>
        </div>

        <div class="flex justify-between" style="margin-top: 32px;">
          <button class="btn btn-secondary" onclick="window.LessonPlayerModule.goToStage(1)">← 1-bosqich</button>
          <div class="flex gap-2">
            <button class="btn btn-secondary" ${this.pronounceIndex === 0 ? 'disabled' : ''} onclick="window.LessonPlayerModule.prevPronounceWord()">← Oldingi so‘z</button>
            ${this.pronounceIndex < lesson.vocabulary.length - 1 ? `
              <button class="btn btn-primary" onclick="window.LessonPlayerModule.nextPronounceWord()">Keyingi so‘z →</button>
            ` : `
              <button class="btn btn-success" onclick="window.LessonPlayerModule.goToStage(3)">3. Yozish mashqiga o‘tish →</button>
            `}
          </div>
        </div>
      </div>
    `;

    // Auto-play audio on entry
    setTimeout(() => {
      this.playPronounceAudio(currentWordObj.word, lesson.langCode);
    }, 200);
  },

  playPronounceAudio(text, lang) {
    const waveBars = document.querySelectorAll('.wave-bar');
    waveBars.forEach(b => b.classList.add('active'));
    window.speechEngine.speak(text, lang, null, () => {
      waveBars.forEach(b => b.classList.remove('active'));
    });
  },

  simulateVoiceCheck(word) {
    const feedback = document.getElementById('voice-check-feedback');
    if (!feedback) return;
    feedback.innerHTML = '<span style="color:var(--primary);">🎙 Tinglanmoqda... Marhamat, ayting!</span>';
    setTimeout(() => {
      window.speechEngine.playFx('correct');
      feedback.innerHTML = `<span style="color:var(--success);">🌟 A'lo darajada talaffuz qilindi! (+10 ball)</span>`;
    }, 1200);
  },

  nextPronounceWord() {
    if (this.pronounceIndex < this.currentLesson.vocabulary.length - 1) {
      this.pronounceIndex++;
      this.renderStage();
    }
  },

  prevPronounceWord() {
    if (this.pronounceIndex > 0) {
      this.pronounceIndex--;
      this.renderStage();
    }
  },

  // ==========================================
  // STAGE 3: YOZISH MASHQI (C _ T format)
  // ==========================================
  renderStage3_Spelling(container) {
    const lesson = this.currentLesson;
    const currentItem = lesson.vocabulary[this.spellingIndex] || lesson.vocabulary[0];
    const letters = currentItem.fullWord.split('');

    container.innerHTML = `
      <div class="player-stage-content animate-fade" style="max-width: 680px;">
        <div style="text-align:center; margin-bottom: 24px;">
          <span class="badge badge-primary">✍️ 3-BOSQICH</span>
          <h2 style="font-size:24px; margin-top:4px;">Yozish mashqi (Missing Letters)</h2>
          <p style="color:var(--text-muted); font-size:14px;">Tushirib qoldirilgan harflarni to‘g‘ri yozing (${this.spellingIndex + 1}/${lesson.vocabulary.length})</p>
        </div>

        <div class="spelling-box">
          <span style="font-size: 54px;">${currentItem.emoji}</span>
          <div class="spelling-clue-title">Tarjimasi: <strong>${currentItem.translation}</strong></div>

          <!-- Letters display slot -->
          <div class="spelling-letter-slots">
            ${letters.map((ch, idx) => `
              <div class="letter-slot ${idx === 1 ? 'blank-active' : 'filled-static'}" id="slot-${idx}">
                ${idx === 1 ? '_' : ch}
              </div>
            `).join('')}
          </div>

          <form onsubmit="event.preventDefault(); window.LessonPlayerModule.checkSpelling('${currentItem.fullWord}');">
            <input type="text" id="spelling-user-input" class="spelling-input" 
              placeholder="${currentItem.missingLetter}" autocomplete="off" autofocus>
            <div style="margin-top: 18px;">
              <button type="submit" class="btn btn-primary btn-lg">
                <span>Tekshirish (Enter) ✓</span>
              </button>
            </div>
          </form>

          <div id="spelling-feedback" style="min-height: 28px; font-weight: 700; font-size: 15px;"></div>
        </div>

        <div class="flex justify-between" style="margin-top: 32px;">
          <button class="btn btn-secondary" onclick="window.LessonPlayerModule.goToStage(2)">← 2-bosqich</button>
          <div class="flex gap-2">
            <button class="btn btn-outline" onclick="window.LessonPlayerModule.showSpellingHint('${currentItem.fullWord}')">💡 Yordam</button>
            ${this.spellingIndex < lesson.vocabulary.length - 1 ? `
              <button class="btn btn-primary" onclick="window.LessonPlayerModule.nextSpelling()">Keyingi so‘z →</button>
            ` : `
              <button class="btn btn-success" onclick="window.LessonPlayerModule.goToStage(4)">4. Qaytarish o‘yiniga o‘tish →</button>
            `}
          </div>
        </div>
      </div>
    `;

    setTimeout(() => {
      document.getElementById('spelling-user-input')?.focus();
    }, 100);
  },

  checkSpelling(targetWord) {
    const input = document.getElementById('spelling-user-input');
    const feedback = document.getElementById('spelling-feedback');
    if (!input || !feedback) return;

    const val = input.value.trim().toUpperCase();
    const cleanTarget = targetWord.replace(/\s+/g, '').toUpperCase();
    const cleanVal = val.replace(/\s+/g, '');

    if (cleanVal === cleanTarget) {
      window.speechEngine.playFx('correct');
      feedback.innerHTML = `<span style="color:var(--success);">🎉 Juda to‘g‘ri yozildi! Barakkalla!</span>`;
      const slots = document.querySelectorAll('.letter-slot');
      slots.forEach((s, i) => {
        s.className = 'letter-slot correct';
        s.innerText = targetWord[i] || '';
      });

      setTimeout(() => {
        if (this.spellingIndex < this.currentLesson.vocabulary.length - 1) {
          this.nextSpelling();
        } else {
          this.goToStage(4);
        }
      }, 1200);
    } else {
      window.speechEngine.playFx('wrong');
      feedback.innerHTML = `<span style="color:var(--danger);">❌ Xato bo‘ldi. Qaytadan urinib ko‘ring!</span>`;
      const slots = document.querySelectorAll('.letter-slot');
      slots.forEach(s => s.classList.add('wrong'));
      setTimeout(() => {
        slots.forEach(s => s.classList.remove('wrong'));
      }, 800);
    }
  },

  showSpellingHint(targetWord) {
    const feedback = document.getElementById('spelling-feedback');
    if (feedback) {
      feedback.innerHTML = `<span style="color:var(--warning);">💡 Yordam: Birinchi harfi '${targetWord[0]}', oxirgi harfi '${targetWord[targetWord.length - 1]}'</span>`;
    }
  },

  nextSpelling() {
    if (this.spellingIndex < this.currentLesson.vocabulary.length - 1) {
      this.spellingIndex++;
      this.renderStage();
    }
  },

  // ==========================================
  // STAGE 4: MAVZUNI QAYTARISH (Memory Pair Match)
  // ==========================================
  renderStage4_Review(container) {
    const lesson = this.currentLesson;
    const subset = lesson.vocabulary.slice(0, 4);

    if (this.matchCards.length === 0 || this.matchedPairsCount === subset.length) {
      const cards = [];
      subset.forEach(item => {
        cards.push({ id: `w-${item.word}`, pairId: item.word, text: `${item.emoji} ${item.word}`, type: 'word' });
        cards.push({ id: `t-${item.word}`, pairId: item.word, text: item.translation, type: 'trans' });
      });
      // Shuffle
      this.matchCards = cards.sort(() => Math.random() - 0.5);
      this.matchedPairsCount = 0;
      this.selectedCard = null;
    }

    container.innerHTML = `
      <div class="player-stage-content animate-fade">
        <div style="text-align:center; margin-bottom: 24px;">
          <span class="badge badge-primary">🧠 4-BOSQICH</span>
          <h2 style="font-size:24px; margin-top:4px;">Mavzuni qaytarish (Juftliklarni toping)</h2>
          <p style="color:var(--text-muted); font-size:14px;">So‘z va uning tarjimasini o‘zaro birlashtiring</p>
        </div>

        <div class="match-game-grid">
          ${this.matchCards.map(c => `
            <div class="match-tile ${c.isMatched ? 'matched' : ''} ${this.selectedCard?.id === c.id ? 'selected' : ''}" 
                 id="card-${c.id}" onclick="window.LessonPlayerModule.onCardClick('${c.id}')">
              ${c.text}
            </div>
          `).join('')}
        </div>

        <div class="flex justify-between" style="margin-top: 32px;">
          <button class="btn btn-secondary" onclick="window.LessonPlayerModule.goToStage(3)">← 3-bosqich</button>
          <button class="btn btn-primary btn-lg" onclick="window.LessonPlayerModule.goToStage(5)">
            <span>Keyingi: 5. Kun yakuniy testi →</span>
          </button>
        </div>
      </div>
    `;
  },

  onCardClick(cardId) {
    const card = this.matchCards.find(c => c.id === cardId);
    if (!card || card.isMatched) return;

    window.speechEngine.playFx('click');

    if (!this.selectedCard) {
      this.selectedCard = card;
      this.renderStage();
    } else {
      if (this.selectedCard.id === card.id) {
        this.selectedCard = null;
        this.renderStage();
        return;
      }

      if (this.selectedCard.pairId === card.pairId && this.selectedCard.type !== card.type) {
        // MATCH!
        window.speechEngine.playFx('correct');
        this.selectedCard.isMatched = true;
        card.isMatched = true;
        this.matchedPairsCount++;
        this.selectedCard = null;
        this.renderStage();

        if (this.matchedPairsCount === 4) {
          window.speechEngine.playFx('fanfare');
          window.AppRouter.showToast('Barcha juftliklar to‘g‘ri topildi! 🌟', 'success');
        }
      } else {
        // WRONG
        window.speechEngine.playFx('wrong');
        const el1 = document.getElementById(`card-${this.selectedCard.id}`);
        const el2 = document.getElementById(`card-${card.id}`);
        if (el1) el1.style.borderColor = 'var(--danger)';
        if (el2) el2.style.borderColor = 'var(--danger)';

        setTimeout(() => {
          this.selectedCard = null;
          this.renderStage();
        }, 600);
      }
    }
  },

  // ==========================================
  // STAGE 5: KUN YAKUNIY TESTI (Daily Final Quiz)
  // ==========================================
  renderStage5_FinalQuiz(container) {
    const lesson = this.currentLesson;
    const quiz = lesson.quiz || [];

    if (this.quizIndex >= quiz.length) {
      // Show Final Scorecard
      const percent = Math.round((this.quizScore / quiz.length) * 100);
      const stars = percent >= 90 ? '⭐⭐⭐' : percent >= 70 ? '⭐⭐' : '⭐';

      container.innerHTML = `
        <div class="player-stage-content animate-fade" style="max-width: 580px;">
          <div class="glass-panel quiz-result-card">
            <div class="score-trophy">🏆</div>
            <h2 style="font-size: 26px; margin-bottom: 6px;">Dars Yakunlandi!</h2>
            <p style="color:var(--text-muted); font-size:14px;">"${lesson.title}" bo‘yicha kunlik test natijangiz:</p>

            <div class="score-badge-huge" style="margin: 20px 0 8px;">
              ${this.quizScore} / ${quiz.length}
            </div>
            <div class="score-percent-badge">${percent}% O‘zlashtirish • ${stars}</div>

            <div style="margin: 24px 0; padding: 16px; background: var(--bg-muted); border-radius: var(--radius-lg); text-align: left; font-size: 13px;">
              <p><strong>Xulosa:</strong> O‘quvchi bugungi darsdagi asosiy so‘z va topshiriqlarni a'lo darajada bajardi. Natijalar o‘qituvchi jurnali va zaif joylar tahliliga kiritildi.</p>
            </div>

            <div class="flex gap-3 justify-center">
              <button class="btn btn-secondary" onclick="window.LessonPlayerModule.openPlayer('${lesson.id}')">
                🔄 Qaytadan topshirish
              </button>
              <button class="btn btn-primary" onclick="window.LessonPlayerModule.closePlayer(); window.AppRouter.navigate('analytics');">
                📊 Natijalar bo‘limiga o‘tish
              </button>
            </div>
          </div>
        </div>
      `;
      window.speechEngine.playFx('fanfare');
      return;
    }

    const currentQ = quiz[this.quizIndex];
    const progressPercent = ((this.quizIndex) / quiz.length) * 100;

    container.innerHTML = `
      <div class="player-stage-content animate-fade" style="max-width: 680px;">
        <div class="flex items-center justify-between" style="margin-bottom: 16px;">
          <span class="badge badge-warning">📝 5-BOSQICH • KUN YAKUNIY TESTI</span>
          <span style="font-weight: 700; font-size: 13px; color: var(--text-muted);">Savol: ${this.quizIndex + 1} / ${quiz.length}</span>
        </div>

        <div class="quiz-progress-bar">
          <div class="quiz-progress-fill" style="width: ${progressPercent}%;"></div>
        </div>

        <div class="quiz-container">
          <div class="quiz-question-text">${currentQ.question}</div>

          <div class="quiz-options-list">
            ${currentQ.options.map((opt, idx) => `
              <button class="quiz-option-btn" onclick="window.LessonPlayerModule.submitQuizAnswer(${idx})">
                <span class="option-letter">${String.fromCharCode(65 + idx)}</span>
                <span>${opt}</span>
              </button>
            `).join('')}
          </div>

          <div id="quiz-explanation-box" style="display:none; margin-top: 20px; padding: 14px; background: var(--bg-muted); border-radius: var(--radius-md); font-size: 13px;"></div>
        </div>
      </div>
    `;
  },

  submitQuizAnswer(selectedIndex) {
    const currentQ = this.currentLesson.quiz[this.quizIndex];
    const isCorrect = selectedIndex === currentQ.correctIndex;
    const optionBtns = document.querySelectorAll('.quiz-option-btn');

    optionBtns.forEach((btn, idx) => {
      btn.disabled = true;
      if (idx === currentQ.correctIndex) {
        btn.classList.add('correct');
      } else if (idx === selectedIndex) {
        btn.classList.add('wrong');
      }
    });

    if (isCorrect) {
      window.speechEngine.playFx('correct');
      this.quizScore++;
    } else {
      window.speechEngine.playFx('wrong');
    }

    const expBox = document.getElementById('quiz-explanation-box');
    if (expBox) {
      expBox.style.display = 'block';
      expBox.innerHTML = `💡 <strong>Izoh:</strong> ${currentQ.explanation}`;
    }

    setTimeout(() => {
      this.quizIndex++;
      this.renderStage();
    }, 1400);
  }
};
