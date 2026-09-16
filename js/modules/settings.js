/* =========================================================
   MADAD TA'LIM — Settings Module
   ========================================================= */

window.SettingsModule = {
  render() {
    const container = document.getElementById('main-content-area');
    if (!container) return;

    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';

    container.innerHTML = `
      <div class="animate-fade" style="max-width: 800px;">
        <div class="section-header">
          <div>
            <h2>⚙ Tizim Sozlamalari</h2>
            <p style="color:var(--text-muted); font-size:13px;">Ovoz parametrlari, mavzu va ustoz profili</p>
          </div>
        </div>

        <!-- Settings Cards -->
        <div class="glass-panel" style="padding: 28px; margin-bottom: 24px;">
          <h3 style="font-size: 16px; margin-bottom: 18px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 10px;">
            🎨 Ko‘rinish va Mavzu
          </h3>
          <div class="flex items-center justify-between">
            <div>
              <strong>Tungi / Kunduzgi rejim (Dark/Light mode)</strong>
              <p style="color: var(--text-muted); font-size: 13px;">Ko‘zga qulay qorong‘i yoki yorqin interfeys</p>
            </div>
            <button class="btn btn-outline" onclick="window.AppRouter.toggleTheme()">
              <span id="theme-btn-text">${currentTheme === 'dark' ? '☀️ Kunduzgi rejim' : '🌙 Tungi rejim'}</span>
            </button>
          </div>
        </div>

        <div class="glass-panel" style="padding: 28px; margin-bottom: 24px;">
          <h3 style="font-size: 16px; margin-bottom: 18px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 10px;">
            🔊 Audio & Talaffuz (Web Speech API)
          </h3>
          
          <div class="form-group">
            <label>Ovoz tezligi (Speech Rate):</label>
            <div class="flex items-center gap-3">
              <input type="range" min="0.5" max="1.5" step="0.1" value="${window.speechEngine.rate}" 
                class="form-control" style="flex:1;" onchange="window.SettingsModule.updateSpeechRate(this.value)">
              <span id="speech-rate-display" style="font-weight: 700; width: 45px;">${window.speechEngine.rate}x</span>
            </div>
          </div>

          <div class="flex gap-2" style="margin-top: 16px;">
            <button class="btn btn-outline btn-sm" onclick="window.speechEngine.speak('Hello! Welcome to Madad Talim.', 'en-US')">
              🇬🇧 English sinash
            </button>
            <button class="btn btn-outline btn-sm" onclick="window.speechEngine.speak('Здравствуйте! Добро пожаловать.', 'ru-RU')">
              🇷🇺 Ruscha sinash
            </button>
            <button class="btn btn-outline btn-sm" onclick="window.speechEngine.speak('مرحبا بكم في مدد تعليم', 'ar-SA')">
              🇸🇦 Arabcha sinash
            </button>
          </div>
        </div>

        <div class="glass-panel" style="padding: 28px; margin-bottom: 24px;">
          <h3 style="font-size: 16px; margin-bottom: 18px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 10px;">
            👩‍🏫 O‘qituvchi Profili
          </h3>
          <div class="form-group">
            <label>O‘qituvchi F.I.SH:</label>
            <input type="text" class="form-control" value="Dilnoza Karimova" readonly>
          </div>
          <div class="form-group">
            <label>Maktab / Ta'lim muassasasi:</label>
            <input type="text" class="form-control" value="14-sonli ixtisoslashtirilgan maktab" readonly>
          </div>
        </div>

        <div class="glass-panel" style="padding: 28px; border-color: rgba(239,68,68,0.2);">
          <h3 style="font-size: 16px; color: var(--danger); margin-bottom: 12px;">
            ⚠️ Ma'lumotlarni Qayta Tiklash
          </h3>
          <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 16px;">
            Barcha darslar va o‘quvchilar test natijalarini boshlang‘ich namunaviy holatga qaytarish.
          </p>
          <button class="btn btn-danger btn-sm" onclick="window.SettingsModule.resetData()">
            Barcha ma'lumotlarni qayta tiklash
          </button>
        </div>
      </div>
    `;
  },

  updateSpeechRate(val) {
    window.speechEngine.rate = parseFloat(val);
    const display = document.getElementById('speech-rate-display');
    if (display) display.innerText = `${val}x`;
    window.speechEngine.speak('Voice speed updated', 'en-US');
  },

  resetData() {
    if (confirm('Barcha darslar va natijalar standart namunaga qaytarilsinmi?')) {
      window.dataStore.resetAllData();
      window.speechEngine.playFx('correct');
      window.AppRouter.showToast('Standart ma’lumotlar tiklandi!', 'success');
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  }
};
