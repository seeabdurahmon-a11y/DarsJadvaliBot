/* =========================================================
   MADAD TA'LIM — Core App Router & Event Coordinator
   ========================================================= */

window.AppRouter = {
  currentRoute: 'dashboard',

  init() {
    // Restore theme
    const savedTheme = localStorage.getItem('madad_talim_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Setup global navigation
    this.navigate('dashboard');

    // Attach search box handler
    const topSearch = document.getElementById('topbar-search-input');
    if (topSearch) {
      topSearch.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const q = topSearch.value.trim();
          if (q) {
            this.navigate('lessons');
            setTimeout(() => {
              window.LessonsListModule.onSearch(q);
            }, 100);
          }
        }
      });
    }
  },

  navigate(route, params = null) {
    this.currentRoute = route;
    window.speechEngine.playFx('click');

    // Update active state in sidebar
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      if (item.getAttribute('data-route') === route) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Update topbar title
    const topbarTitle = document.getElementById('topbar-title');
    const topbarSubtitle = document.getElementById('topbar-subtitle');

    switch (route) {
      case 'dashboard':
        if (topbarTitle) topbarTitle.innerText = "Bosh Sahifa";
        if (topbarSubtitle) topbarSubtitle.innerText = "Ustoz boshqaruv markazi va bugungi darslar";
        window.DashboardModule.render();
        break;
      case 'lessons':
        if (topbarTitle) topbarTitle.innerText = "Darslar Kutubxonasi";
        if (topbarSubtitle) topbarSubtitle.innerText = "Barcha fanlar va sinflar dars rejalari";
        window.LessonsListModule.render();
        break;
      case 'groups':
        if (topbarTitle) topbarTitle.innerText = "Guruhlar & O‘quvchilar";
        if (topbarSubtitle) topbarSubtitle.innerText = "Sinflar tarkibi va o‘quvchilar ko‘rsatkichlari";
        window.GroupsModule.render();
        break;
      case 'ai-chat':
        if (topbarTitle) topbarTitle.innerText = "AI Ustoz Yordamchisi";
        if (topbarSubtitle) topbarSubtitle.innerText = "Sun'iy intellekt orqali interaktiv metodik yordam";
        window.AiAssistantModule.render();
        break;
      case 'analytics':
        if (topbarTitle) topbarTitle.innerText = "Natijalar & Zaif Joylar Tahlili";
        if (topbarSubtitle) topbarSubtitle.innerText = "Xatolar tahlili va avtomatik moslashuvchan darslar";
        window.AnalyticsModule.render();
        break;
      case 'new-lesson':
        if (topbarTitle) topbarTitle.innerText = "Yangi Dars Yaratish";
        if (topbarSubtitle) topbarSubtitle.innerText = "AI va Internet materiallari orqali dars tuzish";
        window.LessonCreatorModule.render(params);
        break;
      case 'settings':
        if (topbarTitle) topbarTitle.innerText = "Tizim Sozlamalari";
        if (topbarSubtitle) topbarSubtitle.innerText = "Audio, dizayn va profil sozlamalari";
        window.SettingsModule.render();
        break;
      default:
        window.DashboardModule.render();
        break;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('madad_talim_theme', next);
    window.speechEngine.playFx('click');
    if (this.currentRoute === 'settings') {
      window.SettingsModule.render();
    }
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  },

  closeGenericModal() {
    const modal = document.getElementById('generic-modal');
    if (modal) modal.classList.remove('active');
  }
};

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.AppRouter.init();
});
