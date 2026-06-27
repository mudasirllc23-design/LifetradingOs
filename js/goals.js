/**
 * GOALS MODULE
 * Complete Goals System + Daily Reflection + Mood Tracker
 * Day 4: Self Improvement Module
 */

const Goals = (() => {

  // ---------- STATE ----------
  let goals = [];
  let editingId = null;
  let deleteTargetId = null;
  let activePeriod = 'all';
  let activeType = 'all';

  const TYPE_CONFIG = {
    trading:  { emoji: '📈', color: '#4f9eff' },
    study:    { emoji: '📚', color: '#a78bfa' },
    health:   { emoji: '🏥', color: '#34d399' },
    personal: { emoji: '💫', color: '#fb923c' },
    finance:  { emoji: '💰', color: '#fbbf24' },
  };

  const PERIOD_LABEL = { daily:'Daily', weekly:'Weekly', monthly:'Monthly', yearly:'Yearly' };
  const PRIORITY_CONFIG = { high: { label:'High', color:'#f87171' }, medium: { label:'Medium', color:'#fbbf24' }, low: { label:'Low', color:'#34d399' } };

  // ---------- INIT ----------
  function init() {
    goals = Storage.getGoals();
    bindModalEvents();
    bindPeriodTabs();
    bindTypeTabs();
    renderAll();
  }

  // ---------- RENDER ----------
  function renderAll() {
    updateStatsRow();
    renderGoalsList();
    if (typeof Dashboard !== 'undefined') {
      Dashboard.updateGoalsSummary();
      Dashboard.updateMetrics();
    }
  }

  function updateStatsRow() {
    const total     = goals.length;
    const completed = goals.filter(g => g.progress >= 100).length;
    const inProg    = goals.filter(g => g.progress > 0 && g.progress < 100).length;
    const avgProg   = total > 0 ? Math.round(goals.reduce((s,g)=>s+(g.progress||0),0)/total) : 0;

    setText('gs_total', total);
    setText('gs_completed', completed);
    setText('gs_inprogress', inProg);
    setText('gs_avgprogress', avgProg + '%');
  }

  function renderGoalsList() {
    const container = document.getElementById('goalsContainer');
    const emptyEl   = document.getElementById('goalsEmpty');
    if (!container) return;

    let filtered = goals;
    if (activePeriod !== 'all') filtered = filtered.filter(g => g.period === activePeriod);
    if (activeType   !== 'all') filtered = filtered.filter(g => g.type   === activeType);

    if (goals.length === 0) {
      container.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'flex';
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';

    if (filtered.length === 0) {
      container.innerHTML = `<div class="no-filter-result">No goals match this filter. <button class="link-btn" id="clearGoalFilter">Show all →</button></div>`;
      document.getElementById('clearGoalFilter')?.addEventListener('click', () => {
        activePeriod = 'all'; activeType = 'all';
        document.querySelectorAll('.goal-tab, .gtype-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.goal-tab[data-period="all"]')?.classList.add('active');
        document.querySelector('.gtype-btn[data-type="all"]')?.classList.add('active');
        renderGoalsList();
      });
      return;
    }

    // Sort by priority then progress
    const priorityOrder = { high:0, medium:1, low:2 };
    filtered.sort((a,b) => (priorityOrder[a.priority]||1) - (priorityOrder[b.priority]||1));

    // Group by period
    const groups = {};
    filtered.forEach(g => {
      const key = g.period || 'monthly';
      if (!groups[key]) groups[key] = [];
      groups[key].push(g);
    });

    const periodOrder = ['daily','weekly','monthly','yearly'];
    let html = '';
    periodOrder.forEach(period => {
      if (!groups[period]) return;
      if (activePeriod === 'all') {
        html += `<div class="goals-group-label">${PERIOD_LABEL[period]} Goals</div>`;
      }
      html += `<div class="goals-cards-grid">`;
      html += groups[period].map(g => renderGoalCard(g)).join('');
      html += `</div>`;
    });

    container.innerHTML = html;
    bindGoalCardEvents();
  }

  function renderGoalCard(g) {
    const cfg  = TYPE_CONFIG[g.type]  || { emoji:'🎯', color:'#4f9eff' };
    const pcfg = PRIORITY_CONFIG[g.priority] || PRIORITY_CONFIG.medium;
    const prog = Math.min(100, Math.max(0, g.progress || 0));
    const isDone = prog >= 100;
    const daysLeft = g.deadline ? calcDaysLeft(g.deadline) : null;

    return `
    <div class="goal-card ${isDone ? 'goal-done' : ''}" data-id="${g.id}" style="--goal-color:${cfg.color}">
      <div class="goal-card-top">
        <div class="goal-card-meta">
          <span class="goal-type-tag" style="color:${cfg.color}">${cfg.emoji} ${capitalize(g.type)}</span>
          <span class="goal-period-tag">${PERIOD_LABEL[g.period]}</span>
        </div>
        <div class="goal-card-actions">
          <button class="icon-btn" data-action="edit-goal" data-id="${g.id}" title="Edit">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="icon-btn danger" data-action="delete-goal" data-id="${g.id}" title="Delete">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
          </button>
        </div>
      </div>

      <h4 class="goal-title-text ${isDone ? 'strikethrough' : ''}">${escHtml(g.title)}</h4>
      ${g.desc ? `<p class="goal-desc-text">${escHtml(g.desc)}</p>` : ''}

      <div class="goal-progress-section">
        <div class="goal-prog-header">
          <span class="goal-prog-label">Progress</span>
          <div class="goal-prog-controls">
            <button class="prog-btn minus" data-action="decrement" data-id="${g.id}" title="-1%">−</button>
            <input type="number" class="goal-prog-input" data-action="set-progress" data-id="${g.id}" value="${prog}" min="0" max="100" style="color:${cfg.color}"/>
            <span class="goal-prog-pct-sign">%</span>
            <button class="prog-btn plus" data-action="increment" data-id="${g.id}" title="+1%">+</button>
          </div>
        </div>
        <div class="goal-prog-bar">
          <div class="goal-prog-fill" style="width:${prog}%;background:${cfg.color}"></div>
        </div>
        <div class="goal-prog-quick">
          <button class="prog-quick-btn" data-action="quick-add" data-id="${g.id}" data-val="5">+5%</button>
          <button class="prog-quick-btn" data-action="quick-add" data-id="${g.id}" data-val="10">+10%</button>
          <button class="prog-quick-btn" data-action="quick-add" data-id="${g.id}" data-val="15">+15%</button>
          <button class="prog-quick-btn" data-action="quick-add" data-id="${g.id}" data-val="20">+20%</button>
        </div>
      </div>

      <div class="goal-card-footer">
        <span class="priority-tag" style="color:${pcfg.color};background:${pcfg.color}22">${pcfg.label} Priority</span>
        ${daysLeft !== null ? `<span class="deadline-tag ${daysLeft < 0 ? 'overdue' : daysLeft <= 3 ? 'urgent' : ''}">${daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? 'Due today' : `${daysLeft}d left`}</span>` : ''}
        ${isDone ? '<span class="done-tag">✅ Complete</span>' : ''}
      </div>
    </div>`;
  }

  function bindGoalCardEvents() {
    document.querySelectorAll('[data-action="edit-goal"]').forEach(btn =>
      btn.addEventListener('click', e => openEditModal(e.currentTarget.dataset.id)));
    document.querySelectorAll('[data-action="delete-goal"]').forEach(btn =>
      btn.addEventListener('click', e => openDeleteModal(e.currentTarget.dataset.id)));
    document.querySelectorAll('[data-action="increment"]').forEach(btn =>
      btn.addEventListener('click', e => adjustProgress(e.currentTarget.dataset.id, 1)));
    document.querySelectorAll('[data-action="decrement"]').forEach(btn =>
      btn.addEventListener('click', e => adjustProgress(e.currentTarget.dataset.id, -1)));

    // Direct % input — type any exact number (1%, 2%, 37%, etc.)
    document.querySelectorAll('[data-action="set-progress"]').forEach(input => {
      input.addEventListener('change', e => {
        const val = parseInt(e.target.value, 10);
        setProgress(e.target.dataset.id, isNaN(val) ? 0 : val);
      });
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') e.target.blur();
      });
      // Prevent the click on the input from doing anything weird
      input.addEventListener('click', e => e.stopPropagation());
    });

    // Quick-add buttons — +5%, +10%, +15%, +20% (relative, added to current progress)
    document.querySelectorAll('[data-action="quick-add"]').forEach(btn => {
      btn.addEventListener('click', e => {
        const delta = parseInt(e.currentTarget.dataset.val, 10);
        adjustProgress(e.currentTarget.dataset.id, delta);
      });
    });
  }

  function adjustProgress(id, delta) {
    const g = goals.find(g => g.id === id);
    if (!g) return;
    g.progress = Math.min(100, Math.max(0, (g.progress || 0) + delta));
    if (g.progress === 100) {
      Storage.addActivity({ icon: '🏆', text: `Goal completed: ${g.title}`, color: '#34d399' });
    }
    saveAndRefresh();
  }

  function setProgress(id, value) {
    const g = goals.find(g => g.id === id);
    if (!g) return;
    const clamped = Math.min(100, Math.max(0, value));
    const wasIncomplete = (g.progress || 0) < 100;
    g.progress = clamped;
    if (clamped === 100 && wasIncomplete) {
      Storage.addActivity({ icon: '🏆', text: `Goal completed: ${g.title}`, color: '#34d399' });
    }
    saveAndRefresh();
  }

  // ---------- MODAL ----------
  function bindModalEvents() {
    ['openAddGoalModal','openAddGoalModal2'].forEach(id => {
      document.getElementById(id)?.addEventListener('click', openAddModal);
    });
    ['closeGoalModal','cancelGoalModal'].forEach(id => {
      document.getElementById(id)?.addEventListener('click', closeModal);
    });
    document.getElementById('goalModalOverlay')?.addEventListener('click', e => { if (e.target.id === 'goalModalOverlay') closeModal(); });
    document.getElementById('saveGoalBtn')?.addEventListener('click', saveGoal);

    document.getElementById('closeDeleteGoalModal')?.addEventListener('click', closeDeleteModal);
    document.getElementById('cancelDeleteGoalModal')?.addEventListener('click', closeDeleteModal);
    document.getElementById('confirmDeleteGoalBtn')?.addEventListener('click', confirmDelete);
    document.getElementById('deleteGoalModalOverlay')?.addEventListener('click', e => { if (e.target.id === 'deleteGoalModalOverlay') closeDeleteModal(); });

    // Slider display
    const slider = document.getElementById('goalProgress');
    const sliderVal = document.getElementById('goalProgressVal');
    slider?.addEventListener('input', () => { if (sliderVal) sliderVal.textContent = slider.value + '%'; });
  }

  function openAddModal() {
    editingId = null;
    setText('goalModalTitle', 'Add New Goal');
    clearForm();
    document.getElementById('goalModalOverlay').classList.add('active');
    setTimeout(() => document.getElementById('goalTitle')?.focus(), 100);
  }

  function openEditModal(id) {
    const g = goals.find(g => g.id === id);
    if (!g) return;
    editingId = id;
    setText('goalModalTitle', 'Edit Goal');
    setVal('goalTitle', g.title);
    setVal('goalPeriod', g.period || 'monthly');
    setVal('goalType', g.type || 'trading');
    setVal('goalDesc', g.desc || '');
    setVal('goalDeadline', g.deadline || '');
    setVal('goalPriority', g.priority || 'medium');
    setVal('goalProgress', g.progress || 0);
    setText('goalProgressVal', (g.progress || 0) + '%');
    document.getElementById('goalModalOverlay').classList.add('active');
  }

  function openDeleteModal(id) {
    deleteTargetId = id;
    const g = goals.find(g => g.id === id);
    if (g) setText('deleteGoalName', g.title);
    document.getElementById('deleteGoalModalOverlay').classList.add('active');
  }

  function closeModal() {
    editingId = null;
    clearForm();
    document.getElementById('goalModalOverlay').classList.remove('active');
  }

  function closeDeleteModal() {
    deleteTargetId = null;
    document.getElementById('deleteGoalModalOverlay').classList.remove('active');
  }

  function confirmDelete() {
    if (!deleteTargetId) return;
    const g = goals.find(g => g.id === deleteTargetId);
    goals = goals.filter(g => g.id !== deleteTargetId);
    if (g) Storage.addActivity({ icon: '🗑️', text: `Deleted goal: ${g.title}`, color: '#f87171' });
    deleteTargetId = null;
    closeDeleteModal();
    saveAndRefresh();
  }

  function saveGoal() {
    const title = getVal('goalTitle').trim();
    if (!title) { shake(document.getElementById('goalTitle')); return; }

    const data = {
      title,
      period:   getVal('goalPeriod'),
      type:     getVal('goalType'),
      desc:     getVal('goalDesc').trim(),
      deadline: getVal('goalDeadline'),
      priority: getVal('goalPriority'),
      progress: parseInt(getVal('goalProgress')) || 0,
    };

    if (editingId) {
      const idx = goals.findIndex(g => g.id === editingId);
      if (idx !== -1) goals[idx] = { ...goals[idx], ...data, updatedAt: new Date().toISOString() };
      Storage.addActivity({ icon: '✏️', text: `Updated goal: ${title}`, color: '#a78bfa' });
    } else {
      goals.push({ id: uid(), ...data, createdAt: new Date().toISOString() });
      Storage.addActivity({ icon: '🎯', text: `Added goal: ${title}`, color: '#4f9eff' });
    }
    closeModal();
    saveAndRefresh();
  }

  function clearForm() {
    setVal('goalTitle', ''); setVal('goalDesc', ''); setVal('goalDeadline', '');
    setVal('goalPeriod', 'monthly'); setVal('goalType', 'trading');
    setVal('goalPriority', 'medium'); setVal('goalProgress', 0);
    setText('goalProgressVal', '0%');
  }

  // ---------- TABS ----------
  function bindPeriodTabs() {
    document.querySelectorAll('.goal-tab').forEach(btn => {
      btn.addEventListener('click', e => {
        document.querySelectorAll('.goal-tab').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        activePeriod = e.currentTarget.dataset.period;
        renderGoalsList();
      });
    });
  }

  function bindTypeTabs() {
    document.querySelectorAll('.gtype-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        document.querySelectorAll('.gtype-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        activeType = e.currentTarget.dataset.type;
        renderGoalsList();
      });
    });
  }

  // ---------- HELPERS ----------
  function calcDaysLeft(dateStr) {
    const target = new Date(dateStr + 'T00:00:00');
    const today  = new Date(); today.setHours(0,0,0,0);
    return Math.round((target - today) / 86400000);
  }

  function saveAndRefresh() {
    Storage.saveGoals(goals);
    renderAll();
  }

  function uid() { return 'g_' + Date.now() + '_' + Math.random().toString(36).slice(2,7); }
  function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
  function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
  function getVal(id) { const el = document.getElementById(id); return el ? el.value : ''; }
  function setVal(id, val) { const el = document.getElementById(id); if (el) el.value = val; }
  function shake(el) { if (!el) return; el.classList.add('shake'); setTimeout(()=>el.classList.remove('shake'),400); }

  return { init };
})();

// ============================================================
// REFLECTION MODULE
// ============================================================
const Reflection = (() => {

  function init() {
    loadTodayReflection();
    bindStarRatings();
    bindSaveButton();
    renderPastReflections();
    updateDateBadge();
  }

  function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function updateDateBadge() {
    const el = document.getElementById('reflectionDateBadge');
    if (!el) return;
    const d = new Date();
    el.textContent = d.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });
  }

  function loadTodayReflection() {
    const reflections = Storage.getReflections();
    const today = todayKey();
    const r = reflections.find(r => r.date === today);
    if (!r) return;
    setVal('rf_went_well',   r.wentWell   || '');
    setVal('rf_went_wrong',  r.wentWrong  || '');
    setVal('rf_lessons',     r.lessons    || '');
    setVal('rf_improvements',r.improvements || '');
    setVal('rf_gratitude',   r.gratitude  || '');
    if (r.ratings) {
      Object.entries(r.ratings).forEach(([field, val]) => {
        setVal(field, val);
        updateStars(field, val);
      });
    }
  }

  function bindSaveButton() {
    document.getElementById('saveReflectionBtn')?.addEventListener('click', saveReflection);
  }

  function saveReflection() {
    const today = todayKey();
    const reflections = Storage.getReflections();
    const existing = reflections.findIndex(r => r.date === today);

    const ratings = {};
    ['rf_overall','rf_productivity','rf_trading','rf_discipline'].forEach(f => {
      ratings[f] = parseInt(getVal(f)) || 0;
    });

    const entry = {
      date:         today,
      wentWell:     getVal('rf_went_well').trim(),
      wentWrong:    getVal('rf_went_wrong').trim(),
      lessons:      getVal('rf_lessons').trim(),
      improvements: getVal('rf_improvements').trim(),
      gratitude:    getVal('rf_gratitude').trim(),
      ratings,
      savedAt: new Date().toISOString()
    };

    if (existing !== -1) reflections[existing] = entry;
    else reflections.unshift(entry);

    Storage.saveReflections(reflections);
    Storage.addActivity({ icon:'📝', text:'Saved daily reflection', color:'#a78bfa' });

    showSaveToast('Reflection saved! ✅');
    renderPastReflections();
    if (typeof Dashboard !== 'undefined') Dashboard.renderActivity();
  }

  function bindStarRatings() {
    document.querySelectorAll('.rating-stars').forEach(container => {
      const field = container.dataset.field;
      container.querySelectorAll('.star-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const val = parseInt(btn.dataset.val);
          setVal(field, val);
          updateStars(field, val);
        });
      });
    });
  }

  function updateStars(field, val) {
    const container = document.querySelector(`.rating-stars[data-field="${field}"]`);
    if (!container) return;
    container.querySelectorAll('.star-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.val) <= parseInt(val));
    });
  }

  function renderPastReflections() {
    const list = document.getElementById('pastReflectionsList');
    if (!list) return;
    const reflections = Storage.getReflections().slice(0, 10);
    if (reflections.length === 0) {
      list.innerHTML = '<p style="color:var(--text3);font-size:13px;font-style:italic">No past reflections yet. Save today\'s reflection to get started.</p>';
      return;
    }
    list.innerHTML = reflections.map(r => {
      const d = new Date(r.date + 'T00:00:00');
      const label = d.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' });
      const avgRating = r.ratings
        ? Math.round(Object.values(r.ratings).reduce((s,v)=>s+v,0) / Object.values(r.ratings).length)
        : 0;
      const stars = '★'.repeat(avgRating) + '☆'.repeat(5-avgRating);
      return `
      <div class="past-ref-card">
        <div class="past-ref-date">${label}</div>
        <div class="past-ref-body">
          ${r.wentWell ? `<div class="past-ref-section"><span class="past-ref-label">✅ Went Well</span><p>${escHtml(r.wentWell.slice(0,120))}${r.wentWell.length>120?'…':''}</p></div>` : ''}
          ${r.lessons  ? `<div class="past-ref-section"><span class="past-ref-label">💡 Lessons</span><p>${escHtml(r.lessons.slice(0,120))}${r.lessons.length>120?'…':''}</p></div>` : ''}
        </div>
        ${avgRating > 0 ? `<div class="past-ref-stars" title="Avg rating">${stars}</div>` : ''}
      </div>`;
    }).join('');
  }

  function showSaveToast(msg) {
    let toast = document.getElementById('saveToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'saveToast';
      toast.className = 'save-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  }

  function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function getVal(id) { const el = document.getElementById(id); return el ? el.value : ''; }
  function setVal(id, val) { const el = document.getElementById(id); if (el) el.value = val; }

  return { init };
})();

// ============================================================
// MOOD MODULE
// ============================================================
const Mood = (() => {

  const MOOD_EMOJI = { 5:'😄', 4:'😊', 3:'😐', 2:'😟', 1:'😢' };
  const MOOD_LABEL = { 5:'Amazing', 4:'Good', 3:'Neutral', 2:'Bad', 1:'Terrible' };
  const MOOD_COLOR = { 5:'#34d399', 4:'#4f9eff', 3:'#fbbf24', 2:'#fb923c', 1:'#f87171' };

  function init() {
    bindMoodSelector();
    bindSliders();
    bindSaveButton();
    loadTodayMood();
    renderWeekChart();
    renderMoodLog();
  }

  function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function bindMoodSelector() {
    document.querySelectorAll('.mood-face').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mood-face').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        setVal('moodValue', btn.dataset.mood);
      });
    });
  }

  function bindSliders() {
    const pairs = [
      ['moodEnergy', 'energyVal'],
      ['moodStress', 'stressVal'],
      ['moodMotivation', 'motivationVal'],
      ['moodFocus', 'focusVal'],
    ];
    pairs.forEach(([sliderId, valId]) => {
      const slider = document.getElementById(sliderId);
      const valEl  = document.getElementById(valId);
      if (slider && valEl) {
        slider.addEventListener('input', () => { valEl.textContent = slider.value; });
      }
    });
  }

  function bindSaveButton() {
    document.getElementById('saveMoodBtn')?.addEventListener('click', saveMood);
  }

  function loadTodayMood() {
    const moods = Storage.getMoods();
    const today = todayKey();
    const m = moods.find(m => m.date === today);
    if (!m) return;

    setVal('moodValue', m.mood);
    setVal('moodEnergy', m.energy || 5);
    setVal('moodStress', m.stress || 5);
    setVal('moodMotivation', m.motivation || 5);
    setVal('moodFocus', m.focus || 5);
    setVal('moodWater', m.water || 0);
    setVal('moodSleep', m.sleep || 0);
    setVal('moodExercise', m.exercise || 0);
    setVal('moodStudy', m.study || 0);
    setVal('moodNote', m.note || '');

    setText('energyVal', m.energy || 5);
    setText('stressVal', m.stress || 5);
    setText('motivationVal', m.motivation || 5);
    setText('focusVal', m.focus || 5);

    // Activate selected mood face
    if (m.mood) {
      document.querySelectorAll('.mood-face').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mood == m.mood);
      });
    }
  }

  function saveMood() {
    const mood = parseInt(getVal('moodValue')) || 0;
    if (!mood) {
      alert('Please select a mood emoji first!');
      return;
    }
    const today = todayKey();
    const moods = Storage.getMoods();
    const existing = moods.findIndex(m => m.date === today);

    const entry = {
      date: today,
      mood,
      energy:     parseInt(getVal('moodEnergy')) || 5,
      stress:     parseInt(getVal('moodStress')) || 5,
      motivation: parseInt(getVal('moodMotivation')) || 5,
      focus:      parseInt(getVal('moodFocus')) || 5,
      water:      parseFloat(getVal('moodWater')) || 0,
      sleep:      parseFloat(getVal('moodSleep')) || 0,
      exercise:   parseInt(getVal('moodExercise')) || 0,
      study:      parseFloat(getVal('moodStudy')) || 0,
      note:       getVal('moodNote').trim(),
      savedAt: new Date().toISOString()
    };

    if (existing !== -1) moods[existing] = entry;
    else moods.unshift(entry);

    Storage.saveMoods(moods);

    // Update study hours for dashboard
    Storage.set('study_hours_today', entry.study);

    Storage.addActivity({ icon: MOOD_EMOJI[mood], text: `Logged mood: ${MOOD_LABEL[mood]} — Energy ${entry.energy}/10`, color: MOOD_COLOR[mood] });

    showSaveToast('Mood saved! ' + MOOD_EMOJI[mood]);
    renderWeekChart();
    renderMoodLog();

    if (typeof Dashboard !== 'undefined') {
      Dashboard.renderActivity();
      Dashboard.updateMetrics();
      const moodScore = document.getElementById('moodScore');
      if (moodScore) moodScore.textContent = MOOD_EMOJI[mood] + ' ' + MOOD_LABEL[mood];
    }
  }

  function renderWeekChart() {
    const el = document.getElementById('moodWeekChart');
    if (!el) return;
    const moods = Storage.getMoods();
    const today = new Date();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const m = moods.find(m => m.date === key);
      days.push({ key, date: d, mood: m });
    }

    el.innerHTML = days.map(({ date, mood: m }) => {
      const dayLabel = date.toLocaleDateString('en-US', { weekday:'short' });
      const dateNum  = date.getDate();
      const isToday  = date.toDateString() === today.toDateString();
      return `
      <div class="mood-week-day ${isToday ? 'today' : ''}">
        <div class="mood-week-emoji">${m ? MOOD_EMOJI[m.mood] : '·'}</div>
        <div class="mood-week-bar-wrap">
          <div class="mood-week-bar ${m ? '' : 'empty'}" style="height:${m ? (m.mood/5)*60 : 4}px;background:${m ? MOOD_COLOR[m.mood] : 'var(--border)'}"></div>
        </div>
        <div class="mood-week-label">${dayLabel}</div>
        <div class="mood-week-date">${dateNum}</div>
        ${m ? `<div class="mood-week-meta">E:${m.energy} S:${m.stress}</div>` : ''}
      </div>`;
    }).join('');
  }

  function renderMoodLog() {
    const el = document.getElementById('moodLogList');
    if (!el) return;
    const moods = Storage.getMoods().slice(0, 14);
    if (moods.length === 0) {
      el.innerHTML = '<p style="color:var(--text3);font-size:13px;font-style:italic">No mood entries yet.</p>';
      return;
    }
    el.innerHTML = moods.map(m => {
      const d = new Date(m.date + 'T00:00:00');
      const label = d.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' });
      return `
      <div class="mood-log-item">
        <div class="mood-log-emoji" style="background:${MOOD_COLOR[m.mood]}22">${MOOD_EMOJI[m.mood]}</div>
        <div class="mood-log-info">
          <div class="mood-log-date">${label}</div>
          <div class="mood-log-label" style="color:${MOOD_COLOR[m.mood]}">${MOOD_LABEL[m.mood]}</div>
          ${m.note ? `<div class="mood-log-note">${escHtml(m.note.slice(0,80))}${m.note.length>80?'…':''}</div>` : ''}
        </div>
        <div class="mood-log-stats">
          <span title="Energy">⚡${m.energy}</span>
          <span title="Stress">😤${m.stress}</span>
          <span title="Motivation">🔥${m.motivation}</span>
          <span title="Focus">🎯${m.focus}</span>
        </div>
        <div class="mood-log-health">
          ${m.water > 0 ? `<span>💧${m.water}gl</span>` : ''}
          ${m.sleep > 0 ? `<span>😴${m.sleep}h</span>` : ''}
          ${m.exercise > 0 ? `<span>🏃${m.exercise}m</span>` : ''}
          ${m.study > 0 ? `<span>📚${m.study}h</span>` : ''}
        </div>
      </div>`;
    }).join('');
  }

  function showSaveToast(msg) {
    let toast = document.getElementById('saveToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'saveToast';
      toast.className = 'save-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  }

  function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function getVal(id) { const el = document.getElementById(id); return el ? el.value : ''; }
  function setVal(id, val) { const el = document.getElementById(id); if (el) el.value = val; }
  function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }

  return { init };
})();
