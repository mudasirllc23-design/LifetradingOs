/**
 * HABITS MODULE
 * Complete Habit Tracking System
 * Day 2: Habits, Categories, Streaks, Local Storage
 */

const Habits = (() => {

  // ---------- STATE ----------
  let habits = [];
  let activeCategory = 'all';
  let editingId = null;
  let deleteTargetId = null;
  let selectedColor = '#4f9eff';

  const CATEGORY_EMOJI = {
    health: '🏥', study: '📚', forex: '📈',
    fitness: '💪', religion: '🤲', reading: '📖', custom: '⚡'
  };

  // ---------- INIT ----------
  function init() {
    habits = Storage.getHabits();
    buildWeekHeader();
    renderAll();
    bindModalEvents();
    bindCategoryFilter();
    buildHeatmap();
    updateStatsStrip();
  }

  // ---------- WEEK HEADER ----------
  function buildWeekHeader() {
    const container = document.getElementById('weekDaysHeader');
    if (!container) return;
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const today = new Date();
    const dow = today.getDay(); // 0=Sun
    // Show current week Sun→Sat
    let html = '';
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - dow + i);
      const isToday = i === dow;
      const key = dateKey(d);
      html += `<div class="week-day-col ${isToday ? 'today' : ''}">
        <div class="week-day-name">${days[i]}</div>
        <div class="week-day-num" data-date="${key}">${d.getDate()}</div>
      </div>`;
    }
    container.innerHTML = html;
  }

  // ---------- RENDER ALL ----------
  function renderAll() {
    const list = document.getElementById('habitsList');
    const emptyEl = document.getElementById('habitPageEmpty');
    const heatmapSection = document.getElementById('heatmapSection');
    if (!list) return;

    const filtered = activeCategory === 'all'
      ? habits
      : habits.filter(h => h.category === activeCategory);

    if (habits.length === 0) {
      list.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'flex';
      if (heatmapSection) heatmapSection.style.display = 'none';
      return;
    }

    if (emptyEl) emptyEl.style.display = 'none';
    if (heatmapSection) heatmapSection.style.display = 'block';

    if (filtered.length === 0) {
      list.innerHTML = `<div class="no-filter-result">No habits in this category. <button class="link-btn" onclick="document.querySelector('[data-cat=all]').click()">Show all</button></div>`;
      return;
    }

    list.innerHTML = filtered.map(h => renderHabitCard(h)).join('');
    bindHabitCardEvents();
  }

  // ---------- RENDER SINGLE HABIT CARD ----------
  function renderHabitCard(h) {
    const today = todayKey();
    const completions = h.completions || [];
    const doneToday = completions.includes(today);
    const streak = calcStreak(h);
    const longestStreak = h.longestStreak || 0;
    const successRate = calcSuccessRate(h);
    const weekDots = renderWeekDots(h);
    const color = h.color || '#4f9eff';
    const emoji = CATEGORY_EMOJI[h.category] || '⚡';

    return `
    <div class="habit-card ${doneToday ? 'done' : ''}" data-id="${h.id}" style="--habit-color:${color}">
      <div class="habit-card-left">
        <button class="habit-check-btn ${doneToday ? 'checked' : ''}" data-action="toggle" data-id="${h.id}" title="${doneToday ? 'Mark incomplete' : 'Mark complete'}">
          ${doneToday
            ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
            : ''}
        </button>
      </div>

      <div class="habit-card-body">
        <div class="habit-card-top">
          <div class="habit-card-info">
            <span class="habit-category-tag">${emoji} ${h.category}</span>
            <h4 class="habit-name ${doneToday ? 'strikethrough' : ''}">${escapeHtml(h.name)}</h4>
            ${h.desc ? `<p class="habit-desc">${escapeHtml(h.desc)}</p>` : ''}
          </div>
          <div class="habit-card-actions">
            <button class="icon-btn" data-action="edit" data-id="${h.id}" title="Edit">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="icon-btn danger" data-action="delete" data-id="${h.id}" title="Delete">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
            </button>
          </div>
        </div>

        <div class="habit-week-row">
          ${weekDots}
        </div>

        <div class="habit-card-footer">
          <div class="habit-stat-chip">
            <span class="chip-val">${streak}</span>
            <span class="chip-label">streak</span>
          </div>
          <div class="habit-stat-chip">
            <span class="chip-val">${longestStreak}</span>
            <span class="chip-label">best</span>
          </div>
          <div class="habit-stat-chip">
            <span class="chip-val">${successRate}%</span>
            <span class="chip-label">30-day rate</span>
          </div>
          <div class="habit-stat-chip">
            <span class="chip-val">${completions.length}</span>
            <span class="chip-label">total done</span>
          </div>
        </div>
      </div>

      <div class="habit-color-bar" style="background:${color}"></div>
    </div>`;
  }

  // ---------- WEEK DOTS ----------
  function renderWeekDots(h) {
    const today = new Date();
    const dow = today.getDay();
    const completions = h.completions || [];
    const days = ['S','M','T','W','T','F','S'];
    let html = '';
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - dow + i);
      const key = dateKey(d);
      const done = completions.includes(key);
      const isToday = i === dow;
      const isFuture = d > today && !isToday;
      html += `<div class="week-dot ${done ? 'done' : ''} ${isToday ? 'today' : ''} ${isFuture ? 'future' : ''}" title="${key}">
        <span class="week-dot-day">${days[i]}</span>
        <span class="week-dot-circle">${done ? '✓' : ''}</span>
      </div>`;
    }
    return html;
  }

  // ---------- BIND CARD EVENTS ----------
  function bindHabitCardEvents() {
    document.querySelectorAll('[data-action="toggle"]').forEach(btn => {
      btn.addEventListener('click', e => {
        const id = e.currentTarget.dataset.id;
        toggleHabit(id);
      });
    });

    document.querySelectorAll('[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', e => {
        const id = e.currentTarget.dataset.id;
        openEditModal(id);
      });
    });

    document.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', e => {
        const id = e.currentTarget.dataset.id;
        openDeleteModal(id);
      });
    });
  }

  // ---------- TOGGLE COMPLETION ----------
  function toggleHabit(id) {
    const habit = habits.find(h => h.id === id);
    if (!habit) return;
    const today = todayKey();
    if (!habit.completions) habit.completions = [];

    const idx = habit.completions.indexOf(today);
    if (idx === -1) {
      habit.completions.push(today);
      // Update streak
      habit.streak = calcStreak(habit);
      if (habit.streak > (habit.longestStreak || 0)) {
        habit.longestStreak = habit.streak;
      }
      Storage.addActivity({
        icon: '✅',
        text: `Completed habit: ${habit.name}`,
        color: habit.color || '#34d399'
      });
    } else {
      habit.completions.splice(idx, 1);
      habit.streak = calcStreak(habit);
    }

    habit.updatedAt = new Date().toISOString();
    saveAndRefresh();
  }

  // ---------- STREAK CALCULATION ----------
  function calcStreak(h) {
    const completions = h.completions || [];
    if (completions.length === 0) return 0;

    const sorted = [...completions].sort().reverse();
    const today = todayKey();
    let streak = 0;
    let checkDate = new Date();

    // Allow today or yesterday as start
    const latestDone = sorted[0];
    if (latestDone !== today) {
      // Check if yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (latestDone !== dateKey(yesterday)) return 0;
      checkDate = yesterday;
    }

    while (true) {
      const key = dateKey(checkDate);
      if (!completions.includes(key)) break;
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    return streak;
  }

  // ---------- SUCCESS RATE ----------
  function calcSuccessRate(h) {
    const completions = h.completions || [];
    if (completions.length === 0) return 0;
    const d = new Date();
    const days30 = [];
    for (let i = 0; i < 30; i++) {
      days30.push(dateKey(d));
      d.setDate(d.getDate() - 1);
    }
    const done = days30.filter(k => completions.includes(k)).length;
    // Count only days since habit was created
    const created = new Date(h.createdAt || Date.now());
    const daysSinceCreation = Math.min(30, Math.ceil((Date.now() - created) / 86400000) + 1);
    return daysSinceCreation > 0 ? Math.round((done / daysSinceCreation) * 100) : 0;
  }

  // ---------- STATS STRIP ----------
  function updateStatsStrip() {
    const today = todayKey();
    const completedToday = habits.filter(h => (h.completions||[]).includes(today)).length;
    const bestStreak = habits.reduce((m, h) => Math.max(m, h.longestStreak || 0), 0);
    const rate7 = calc7DayRate();
    const rateMonthly = calcMonthlyRate();

    setText('hs_total', habits.length);
    setText('hs_today', completedToday);
    setText('hs_streak', bestStreak);
    setText('hs_rate', rate7 + '%');
    setText('hs_monthly', rateMonthly + '%');

    // Update nav badge
    const badge = document.getElementById('habitBadge');
    if (badge) badge.textContent = completedToday;
  }

  function calc7DayRate() {
    if (habits.length === 0) return 0;
    let total = 0, done = 0;
    const d = new Date();
    for (let i = 0; i < 7; i++) {
      const key = dateKey(d);
      total += habits.length;
      done += habits.filter(h => (h.completions||[]).includes(key)).length;
      d.setDate(d.getDate() - 1);
    }
    return total > 0 ? Math.round((done / total) * 100) : 0;
  }

  function calcMonthlyRate() {
    if (habits.length === 0) return 0;
    let total = 0, done = 0;
    const d = new Date();
    for (let i = 0; i < 30; i++) {
      const key = dateKey(d);
      total += habits.length;
      done += habits.filter(h => (h.completions||[]).includes(key)).length;
      d.setDate(d.getDate() - 1);
    }
    return total > 0 ? Math.round((done / total) * 100) : 0;
  }

  // ---------- HEATMAP ----------
  function buildHeatmap() {
    const wrap = document.getElementById('heatmapWrap');
    if (!wrap || habits.length === 0) return;

    const today = new Date();
    const days = 84; // 12 weeks
    const cells = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = dateKey(d);
      const count = habits.filter(h => (h.completions||[]).includes(key)).length;
      const level = habits.length === 0 ? 0 : Math.min(4, Math.floor((count / habits.length) * 4));
      cells.push({ key, count, level, d });
    }

    const weeks = [];
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7));
    }

    wrap.innerHTML = `
      <div class="heatmap-grid">
        ${weeks.map(week => `
          <div class="heatmap-col">
            ${week.map(c => `
              <div class="heatmap-cell level-${c.level}" title="${c.key}: ${c.count}/${habits.length} habits"></div>
            `).join('')}
          </div>
        `).join('')}
      </div>
      <div class="heatmap-legend">
        <span>Less</span>
        <div class="heatmap-cell level-0"></div>
        <div class="heatmap-cell level-1"></div>
        <div class="heatmap-cell level-2"></div>
        <div class="heatmap-cell level-3"></div>
        <div class="heatmap-cell level-4"></div>
        <span>More</span>
      </div>`;
  }

  // ---------- MODAL — ADD / EDIT ----------
  function bindModalEvents() {
    // Open add
    ['openAddHabitModal', 'openAddHabitModal2'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', () => openAddModal());
    });

    // Close
    ['closeHabitModal', 'cancelHabitModal'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', closeModal);
    });

    // Save
    const saveBtn = document.getElementById('saveHabitBtn');
    if (saveBtn) saveBtn.addEventListener('click', saveHabit);

    // Overlay click close
    const overlay = document.getElementById('habitModalOverlay');
    if (overlay) overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal();
    });

    // Color picker
    document.querySelectorAll('.color-opt').forEach(btn => {
      btn.addEventListener('click', e => {
        document.querySelectorAll('.color-opt').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        selectedColor = e.currentTarget.dataset.color;
      });
    });

    // Delete modal
    const closeDelBtn = document.getElementById('closeDeleteModal');
    const cancelDelBtn = document.getElementById('cancelDeleteModal');
    const confirmDelBtn = document.getElementById('confirmDeleteBtn');
    const delOverlay = document.getElementById('deleteModalOverlay');

    if (closeDelBtn) closeDelBtn.addEventListener('click', closeDeleteModal);
    if (cancelDelBtn) cancelDelBtn.addEventListener('click', closeDeleteModal);
    if (confirmDelBtn) confirmDelBtn.addEventListener('click', confirmDelete);
    if (delOverlay) delOverlay.addEventListener('click', e => {
      if (e.target === delOverlay) closeDeleteModal();
    });

    // Enter key on name field
    const nameInput = document.getElementById('habitName');
    if (nameInput) nameInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') saveHabit();
    });
  }

  function openAddModal() {
    editingId = null;
    selectedColor = '#4f9eff';
    setText('habitModalTitle', 'Add New Habit');
    clearModalForm();
    showModal();
  }

  function openEditModal(id) {
    const h = habits.find(h => h.id === id);
    if (!h) return;
    editingId = id;
    selectedColor = h.color || '#4f9eff';

    setText('habitModalTitle', 'Edit Habit');
    setVal('habitName', h.name);
    setVal('habitCategory', h.category);
    setVal('habitTarget', h.target || 1);
    setVal('habitDesc', h.desc || '');
    setVal('habitReminder', h.reminder || '');

    // Set color picker
    document.querySelectorAll('.color-opt').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.color === h.color);
    });

    showModal();
  }

  function saveHabit() {
    const name = getVal('habitName').trim();
    if (!name) {
      shake(document.getElementById('habitName'));
      return;
    }

    if (editingId) {
      const idx = habits.findIndex(h => h.id === editingId);
      if (idx !== -1) {
        habits[idx] = {
          ...habits[idx],
          name,
          category: getVal('habitCategory'),
          target: parseInt(getVal('habitTarget')) || 1,
          desc: getVal('habitDesc').trim(),
          reminder: getVal('habitReminder').trim(),
          color: selectedColor,
          updatedAt: new Date().toISOString()
        };
      }
      Storage.addActivity({ icon: '✏️', text: `Edited habit: ${name}`, color: selectedColor });
    } else {
      const newHabit = {
        id: uid(),
        name,
        category: getVal('habitCategory'),
        target: parseInt(getVal('habitTarget')) || 1,
        desc: getVal('habitDesc').trim(),
        reminder: getVal('habitReminder').trim(),
        color: selectedColor,
        completions: [],
        streak: 0,
        longestStreak: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      habits.push(newHabit);
      Storage.addActivity({ icon: '➕', text: `Added habit: ${name}`, color: selectedColor });
    }

    saveAndRefresh();
    closeModal();
  }

  function openDeleteModal(id) {
    deleteTargetId = id;
    const h = habits.find(h => h.id === id);
    if (!h) return;
    setText('deleteHabitName', h.name);
    document.getElementById('deleteModalOverlay').classList.add('active');
  }

  function closeDeleteModal() {
    deleteTargetId = null;
    document.getElementById('deleteModalOverlay').classList.remove('active');
  }

  function confirmDelete() {
    if (!deleteTargetId) return;
    const h = habits.find(h => h.id === deleteTargetId);
    habits = habits.filter(h => h.id !== deleteTargetId);
    if (h) Storage.addActivity({ icon: '🗑️', text: `Deleted habit: ${h.name}`, color: '#f87171' });
    deleteTargetId = null;
    closeDeleteModal();
    saveAndRefresh();
  }

  // ---------- CATEGORY FILTER ----------
  function bindCategoryFilter() {
    document.querySelectorAll('.cat-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        activeCategory = e.currentTarget.dataset.cat;
        renderAll();
      });
    });
  }

  // ---------- MODAL HELPERS ----------
  function showModal() {
    document.getElementById('habitModalOverlay').classList.add('active');
    setTimeout(() => document.getElementById('habitName').focus(), 100);
  }

  function closeModal() {
    document.getElementById('habitModalOverlay').classList.remove('active');
    editingId = null;
    clearModalForm();
  }

  function clearModalForm() {
    ['habitName','habitDesc','habitReminder'].forEach(id => setVal(id, ''));
    setVal('habitCategory', 'health');
    setVal('habitTarget', '1');
    selectedColor = '#4f9eff';
    document.querySelectorAll('.color-opt').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.color === '#4f9eff');
    });
    setVal('habitEditId', '');
  }

  // ---------- SAVE & REFRESH ----------
  function saveAndRefresh() {
    Storage.saveHabits(habits);
    renderAll();
    buildWeekHeader();
    buildHeatmap();
    updateStatsStrip();
    // Refresh dashboard if visible
    if (typeof Dashboard !== 'undefined') {
      Dashboard.updateHabitSummary();
      Dashboard.updateMetrics();
      Dashboard.renderActivity();
    }
  }

  // ---------- UTILS ----------
  function uid() {
    return 'h_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  }

  function todayKey() { return dateKey(new Date()); }

  function dateKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function getVal(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
  }

  function setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
  }

  function shake(el) {
    if (!el) return;
    el.classList.add('shake');
    setTimeout(() => el.classList.remove('shake'), 400);
  }

  // Public
  return { init };

})();
