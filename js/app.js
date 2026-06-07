/**
 * APP.JS — Main Application Controller
 * Life & Trading Performance OS
 * Day 1: Foundation
 */

const App = (() => {

  // ---------- STATE ----------

  let currentPage = 'dashboard';

  const PAGE_TITLES = {
    dashboard:  'Dashboard',
    habits:     'Habit Tracker',
    forex:      'Forex Journal',
    rules:      'Trading Rules',
    goals:      'Goals System',
    reflection: 'Daily Reflection',
    mood:       'Mood Tracker',
    notes:      'Notes',
    analytics:  'Analytics',
    reports:    'Reports',
    backup:     'Backup Center'
  };

  // ---------- INIT ----------

  function init() {
    applyTheme(Storage.getTheme());
    setupNavigation();
    setupThemeToggle();
    setupHamburger();
    updateDateDisplay();
    setTimeGreeting();
    Dashboard.init();

    // Refresh every minute for relative times
    setInterval(() => {
      updateDateDisplay();
    }, 60000);
  }

  // ---------- NAVIGATION ----------

  function setupNavigation() {
    // All nav items + any dash-card links
    document.addEventListener('click', e => {
      const link = e.target.closest('[data-page]');
      if (!link) return;
      e.preventDefault();
      navigateTo(link.dataset.page);
      closeSidebar();
    });
  }

  function navigateTo(page) {
    if (!document.getElementById('page-' + page)) return;

    // Deactivate old page
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    // Activate new page
    document.getElementById('page-' + page).classList.add('active');
    const navItem = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (navItem) navItem.classList.add('active');

    // Update header title
    const titleEl = document.getElementById('pageTitle');
    if (titleEl) titleEl.textContent = PAGE_TITLES[page] || page;

    currentPage = page;

    // Re-render dashboard when returning to it
    if (page === 'dashboard') {
      Dashboard.init();
    }

    // Init habits
    if (page === 'habits' && typeof Habits !== 'undefined') {
      Habits.init();
    }

    // Init rules
    if (page === 'rules' && typeof Rules !== 'undefined') {
      Rules.init();
    }

    // Init forex on first visit
    if (page === 'forex' && typeof Forex !== 'undefined') {
      Forex.init();
    }

    // Init goals
    if (page === 'goals' && typeof Goals !== 'undefined') {
      Goals.init();
    }

    // Init reflection
    if (page === 'reflection' && typeof Reflection !== 'undefined') {
      Reflection.init();
    }

    // Init mood
    if (page === 'mood' && typeof Mood !== 'undefined') {
      Mood.init();
    }

    // Init notes
    if (page === 'notes' && typeof Notes !== 'undefined') {
      Notes.init();
    }

    // Init analytics
    if (page === 'analytics' && typeof Analytics !== 'undefined') {
      Analytics.init();
    }

    // Init reports
    if (page === 'reports' && typeof Reports !== 'undefined') {
      Reports.init();
    }

    // Init backup
    if (page === 'backup' && typeof Backup !== 'undefined') {
      Backup.init();
    }
  }

  // ---------- THEME ----------

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    Storage.setTheme(theme);
  }

  function setupThemeToggle() {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
    });
  }

  // ---------- HAMBURGER / MOBILE SIDEBAR ----------

  function setupHamburger() {
    const btn = document.getElementById('hamburger');
    const overlay = document.getElementById('sidebarOverlay');

    if (btn) btn.addEventListener('click', toggleSidebar);
    if (overlay) overlay.addEventListener('click', closeSidebar);
  }

  function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
  }

  function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
  }

  // ---------- DATE & TIME ----------

  function updateDateDisplay() {
    const now = new Date();

    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const fullDate = now.toLocaleDateString('en-US', options);

    const shortOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    const shortDate = now.toLocaleDateString('en-US', shortOptions);

    const headerDate = document.getElementById('headerDate');
    const sidebarDate = document.getElementById('sidebarDate');
    const todayFull = document.getElementById('todayFull');

    if (headerDate) headerDate.textContent = shortDate;
    if (sidebarDate) sidebarDate.textContent = fullDate;
    if (todayFull) todayFull.textContent = fullDate;
  }

  function setTimeGreeting() {
    const hour = new Date().getHours();
    const greetingEl = document.getElementById('timeGreeting');
    if (!greetingEl) return;

    if (hour < 12) greetingEl.textContent = 'Morning';
    else if (hour < 17) greetingEl.textContent = 'Afternoon';
    else greetingEl.textContent = 'Evening';
  }

  // ---------- PUBLIC ----------

  return { init, navigateTo, currentPage: () => currentPage };

})();

// ---------- BOOT ----------

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
