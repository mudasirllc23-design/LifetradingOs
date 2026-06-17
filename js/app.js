/**
 * APP.JS — Main Application Controller
 * Life & Trading Performance OS — Clean Version
 */

const App = (() => {

  let currentPage = 'dashboard';

  const PAGE_TITLES = {
    dashboard: 'Dashboard',
    habits:    'Habit Tracker',
    goals:     'Goals',
    forex:     'Forex Journal',
    rules:     'Trading Rules',
    analytics: 'Analytics',
    reports:   'Reports',
    backup:    'Backup Center'
  };

  // ---------- INIT ----------
  function init() {
    applyTheme(Storage.getTheme());
    setupNavigation();
    setupThemeToggle();
    setupHamburger();
    updateDateDisplay();
    Dashboard.init();
    setInterval(updateDateDisplay, 60000);
  }

  // ---------- NAVIGATION ----------
  function setupNavigation() {
    document.addEventListener('click', e => {
      const link = e.target.closest('[data-page]');
      if (!link) return;
      e.preventDefault();
      navigateTo(link.dataset.page);
      closeSidebar();
    });
  }

  function navigateTo(page) {
    // Skip removed pages
    const removed = ['reflection', 'mood', 'notes'];
    if (removed.includes(page)) return;

    if (!document.getElementById('page-' + page)) return;

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    document.getElementById('page-' + page).classList.add('active');
    const navItem = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (navItem) navItem.classList.add('active');

    const titleEl = document.getElementById('pageTitle');
    if (titleEl) titleEl.textContent = PAGE_TITLES[page] || page;

    currentPage = page;

    // Init modules
    if (page === 'dashboard')  Dashboard.init();
    if (page === 'habits'   && typeof Habits    !== 'undefined') Habits.init();
    if (page === 'goals'    && typeof Goals     !== 'undefined') Goals.init();
    if (page === 'forex'    && typeof Forex     !== 'undefined') Forex.init();
    if (page === 'rules'    && typeof Rules     !== 'undefined') Rules.init();
    if (page === 'analytics'&& typeof Analytics !== 'undefined') Analytics.init();
    if (page === 'reports'  && typeof Reports   !== 'undefined') Reports.init();
    if (page === 'backup'   && typeof Backup    !== 'undefined') Backup.init();
  }

  // ---------- THEME ----------
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    Storage.setTheme(theme);
  }

  function setupThemeToggle() {
    document.getElementById('themeToggle')?.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });
  }

  // ---------- SIDEBAR ----------
  function setupHamburger() {
    document.getElementById('hamburger')?.addEventListener('click', toggleSidebar);
    document.getElementById('sidebarOverlay')?.addEventListener('click', closeSidebar);
  }

  function toggleSidebar() {
    document.getElementById('sidebar')?.classList.toggle('open');
    document.getElementById('sidebarOverlay')?.classList.toggle('active');
  }

  function closeSidebar() {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebarOverlay')?.classList.remove('active');
  }

  // ---------- DATE ----------
  function updateDateDisplay() {
    const now = new Date();
    const short = now.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
    const full  = now.toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
    const el1 = document.getElementById('headerDate');
    const el2 = document.getElementById('sidebarDate');
    if (el1) el1.textContent = short;
    if (el2) el2.textContent = full;
  }

  return { init, navigateTo, currentPage: () => currentPage };

})();

document.addEventListener('DOMContentLoaded', () => App.init());
