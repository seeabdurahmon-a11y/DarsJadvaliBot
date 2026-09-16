/* =========================================================
   MADAD TA'LIM — Teacher AI Assistant Chat Module
   ========================================================= */

window.AiAssistantModule = {
  messages: [
    {
      sender: 'ai',
      text: 'Assalomu alaykum, Dilnoza ustoz! 🤖 Men sizning MADAD TA’LIM bo‘yicha sun’iy intellekt yordamchingizman. Menga istalgan mavzuni yozing (masalan: <em>"Animals mavzusida 3-sinf uchun dars tuz"</em> yoki <em>"Present Simple mavzusini davom ettiramiz"</em>), men dars rejasini to‘liq shakllantirib beraman.'
    }
  ],

  render() {
    const container = document.getElementById('main-content-area');
    if (!container) return;

    container.innerHTML = `
      <div class="animate-fade">
        <div class="section-header">
          <div>
            <h2>🧠 AI Ustoz Yordamchisi</h2>
            <p style="color:var(--text-muted); font-size:13px;">Interaktiv muloqot orqali yangi darslar, qiziqarli mashqlar va metodik tavsiyalar oling</p>
          </div>
        </div>

        <div class="ai-chat-layout">
          <!-- Left: Prompt Templates Sidebar -->
          <div class="ai-prompts-sidebar">
            <h4 style="font-size: 14px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">⚡ Tezkor So‘rovlar:</h4>
            
            <button class="prompt-chip" onclick="window.AiAssistantModule.sendPrompt('Animals mavzusida 3-sinf uchun dars tuz')">
              <span>🦁</span>
              <span>"Animals mavzusida 3-sinf uchun dars tuz"</span>
            </button>

            <button class="prompt-chip" onclick="window.AiAssistantModule.sendPrompt('Bugun Present Simple mavzusini davom ettiramiz')">
              <span>⏰</span>
              <span>"Bugun Present Simple mavzusini davom ettiramiz"</span>
            </button>

            <button class="prompt-chip" onclick="window.AiAssistantModule.sendPrompt('Tiger va Elephant so‘zlariga qiziqarli yozma mashqlar tuz')">
              <span>✍️</span>
              <span>"Tiger va Elephant bo‘yicha mashqlar tuz"</span>
            </button>

            <button class="prompt-chip" onclick="window.AiAssistantModule.sendPrompt('Rus tili 2-sinf uchun Цвета mavzusida test savollar')">
              <span>🎨</span>
              <span>"Rus tili 2-sinf 'Цвета' test savollari"</span>
            </button>

            <button class="prompt-chip" onclick="window.AiAssistantModule.sendPrompt('O‘quvchilar talaffuzini yaxshilash uchun 3 ta interaktiv o‘yin')">
              <span>🎙</span>
              <span>"Talaffuzni yaxshilovchi 3 ta o‘yin"</span>
            </button>
          </div>

          <!-- Right: Chat Window -->
          <div class="ai-chat-window">
            <div class="chat-messages" id="chat-messages-container">
              ${this.messages.map(m => `
                <div class="chat-bubble ${m.sender === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}">
                  ${m.text}
                </div>
              `).join('')}
            </div>

            <!-- Input Area -->
            <form class="chat-input-area" onsubmit="event.preventDefault(); window.AiAssistantModule.handleUserInput();">
              <input type="text" id="ai-chat-input" placeholder="AI ga savol yoki dars mavzusini yozing..." autocomplete="off">
              <button type="submit" class="btn btn-primary">
                <span>Yuborish ✈</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    `;

    this.scrollToBottom();
  },

  handleUserInput() {
    const input = document.getElementById('ai-chat-input');
    if (!input || !input.value.trim()) return;

    const query = input.value.trim();
    input.value = '';
    this.sendPrompt(query);
  },

  sendPrompt(promptText) {
    this.messages.push({ sender: 'user', text: promptText });
    this.render();
    window.speechEngine.playFx('click');

    // Simulate AI thinking and smart response
    setTimeout(() => {
      let aiReply = '';
      const lower = promptText.toLowerCase();

      if (lower.includes('animal') || lower.includes('hayvon')) {
        aiReply = `
          <strong>🦁 3-sinf uchun "Animals" dars rejasi tayyorlandi:</strong><br><br>
          📖 <strong>1. Yangi so‘zlar:</strong> Cat (mushuk), Dog (it), Lion (sher), Tiger (yo‘lbars), Elephant (fil), Monkey (maymun).<br>
          🔊 <strong>2. Talaffuz mashqi:</strong> [ˈtaɪ.ɡər], [ˈel.ɪ.fənt], [ˈlaɪ.ən] fonetikasi.<br>
          ✍️ <strong>3. Yozish mashqi:</strong> C _ T, T _ G _ R, E L _ P H _ N T.<br>
          🧠 <strong>4. Qaytarish:</strong> So‘z va rasmlarni birlashtirish.<br>
          📝 <strong>5. Kunlik test:</strong> 10 ta savol va o‘zlashtirish tahlili.<br><br>
          <button class="btn btn-sm btn-primary" onclick="window.LessonCreatorModule.render({topic: 'Animals', subject: 'English', grade: '3-sinf'})">
            ⚡ Ushbu darsni konstruktorda ochish →
          </button>
        `;
      } else if (lower.includes('present simple') || lower.includes('davom')) {
        aiReply = `
          <strong>⏰ "Present Simple" darsining moslashtirilgan davomi:</strong><br><br>
          Oldingi dars natijalariga ko‘ra, o‘quvchilar <em>He/She/It</em> bilan fe'l qo‘shimchasida (48% xato) qiynalgan. Shuning uchun dars quyidagicha tuzildi:<br><br>
          • <strong>Yangi mashqlar:</strong> He plays, She reads, It runs.<br>
          • <strong>Interaktiv o‘yin:</strong> To‘g‘ri fe'l shaklini tanlash.<br>
          • <strong>Mustahkamlash testi:</strong> 10 ta tanlov savoli.<br><br>
          <button class="btn btn-sm btn-primary" onclick="window.LessonCreatorModule.render({topic: 'Present Simple (Kun tartibi)', subject: 'English', grade: '4-sinf'})">
            ⚡ Moslashtirilgan darsni yuklash →
          </button>
        `;
      } else {
        aiReply = `
          <strong>✨ "${promptText}" mavzusi bo‘yicha dars tuzilmasi:</strong><br><br>
          1. Yangi lug‘at va rasmlar to‘plami<br>
          2. Audio talaffuz va eshitish mashqi<br>
          3. Yozma bo‘shliqlarni to‘ldirish topshiriqlari<br>
          4. Juftliklarni topish xotira o‘yini<br>
          5. 10 ta yakuniy baholash testi.<br><br>
          <button class="btn btn-sm btn-primary" onclick="window.LessonCreatorModule.render({topic: '${promptText}', subject: 'English', grade: '3-sinf'})">
            ⚡ Ushbu darsni yaratishga o‘tish →
          </button>
        `;
      }

      this.messages.push({ sender: 'ai', text: aiReply });
      this.render();
      window.speechEngine.playFx('correct');
    }, 700);
  },

  scrollToBottom() {
    const chatBox = document.getElementById('chat-messages-container');
    if (chatBox) {
      chatBox.scrollTop = chatBox.scrollHeight;
    }
  }
};
