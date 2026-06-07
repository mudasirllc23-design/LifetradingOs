/**
 * TRADING RULES MODULE
 * Rules, Pre-Trade Checklist, Rule Break Tracker
 */

const Rules = (() => {

  let rules        = [];
  let breaks       = [];
  let checklist    = [];
  let editingId    = null;
  let deleteTarget = null;
  let activeCat    = 'all';
  let activeTab    = 'rules';

  const CAT_CONFIG = {
    entry:      { emoji:'📈', color:'#3b82f6' },
    exit:       { emoji:'📉', color:'#ef4444' },
    risk:       { emoji:'⚖️', color:'#f59e0b' },
    psychology: { emoji:'🧠', color:'#8b5cf6' },
    general:    { emoji:'⚡', color:'#10b981' },
  };

  const PRIORITY_CONFIG = {
    critical: { label:'Critical', color:'#ef4444' },
    high:     { label:'High',     color:'#f59e0b' },
    medium:   { label:'Medium',   color:'#10b981' },
  };

  const DEFAULT_CHECKLIST = [
    { id:'cl1', text:'HTF trend confirmed (Daily/H4)?',        checked: false },
    { id:'cl2', text:'Valid support/resistance level?',        checked: false },
    { id:'cl3', text:'Stop Loss clearly defined?',             checked: false },
    { id:'cl4', text:'Risk calculated (max 1-2%)?',            checked: false },
    { id:'cl5', text:'No high-impact news in next 30 mins?',   checked: false },
    { id:'cl6', text:'Entry signal confirmed on lower TF?',    checked: false },
    { id:'cl7', text:'Risk:Reward minimum 1:2?',               checked: false },
    { id:'cl8', text:'Am I calm and focused right now?',       checked: false },
  ];

  // ---------- INIT ----------
  function init() {
    rules     = Storage.get('trading_rules', []);
    breaks    = Storage.get('rule_breaks', []);
    checklist = Storage.get('pretrade_checklist', null);
    if (!checklist || checklist.length === 0) {
      checklist = DEFAULT_CHECKLIST.map(i => ({ ...i }));
    }
    bindModalEvents();
    bindTabs();
    bindCategoryFilter();
    renderAll();
  }

  // ---------- RENDER ALL ----------
  function renderAll() {
    updateStatsStrip();
    renderRulesList();
    renderChecklist();
    renderBreaks();
    updateNavBadge();
  }

  // ---------- STATS ----------
  function updateStatsStrip() {
    const total      = rules.length;
    const active     = rules.filter(r => r.active !== false).length;
    const totalBreaks= breaks.length;
    const now        = new Date();
    const weekStart  = new Date(now); weekStart.setDate(now.getDate() - now.getDay());
    const thisWeek   = breaks.filter(b => new Date(b.date) >= weekStart).length;

    // Discipline rate: days without breaks in last 30
    const days30 = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      days30.push(dateKey(d));
    }
    const daysWithBreaks = new Set(breaks.filter(b => days30.includes(b.date)).map(b => b.date)).size;
    const discRate = days30.length > 0 ? Math.round(((30 - daysWithBreaks) / 30) * 100) : 100;

    setText('rs_total',      total);
    setText('rs_active',     active);
    setText('rs_breaks',     totalBreaks);
    setText('rs_this_week',  thisWeek);
    setText('rs_discipline', discRate + '%');

    // Color discipline
    const discEl = document.getElementById('rs_discipline');
    if (discEl) {
      discEl.className = 'rstat-val ' + (discRate >= 90 ? 'green' : discRate >= 70 ? 'accent' : 'red');
    }
  }

  function updateNavBadge() {
    const badge = document.getElementById('ruleBreakBadge');
    if (!badge) return;
    const now = new Date();
    const todayKey_ = dateKey(now);
    const todayBreaks = breaks.filter(b => b.date === todayKey_).length;
    if (todayBreaks > 0) {
      badge.textContent = todayBreaks;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }

  // ---------- RULES LIST ----------
  function renderRulesList() {
    const list   = document.getElementById('rulesList');
    const emptyEl = document.getElementById('rulesEmpty');
    if (!list) return;

    let filtered = rules;
    if (activeCat !== 'all') filtered = filtered.filter(r => r.category === activeCat);

    if (rules.length === 0) {
      list.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'flex';
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';

    if (filtered.length === 0) {
      list.innerHTML = `<div class="no-filter-result">No rules in this category.</div>`;
      return;
    }

    // Sort: critical first
    const order = { critical:0, high:1, medium:2 };
    filtered.sort((a,b) => (order[a.priority]||2) - (order[b.priority]||2));

    list.innerHTML = filtered.map(r => renderRuleCard(r)).join('');
    bindRuleCardEvents();
  }

  function renderRuleCard(r) {
    const cfg   = CAT_CONFIG[r.category]   || { emoji:'⚡', color:'#10b981' };
    const pcfg  = PRIORITY_CONFIG[r.priority] || PRIORITY_CONFIG.medium;
    const ruleBreaks = breaks.filter(b => b.ruleId === r.id).length;
    const isActive   = r.active !== false;

    return `
    <div class="rule-card ${!isActive ? 'rule-inactive' : ''}" data-id="${r.id}" style="--rule-color:${cfg.color}">
      <div class="rule-card-left">
        <div class="rule-cat-icon" style="background:${cfg.color}22;color:${cfg.color}">${cfg.emoji}</div>
      </div>
      <div class="rule-card-body">
        <div class="rule-card-top">
          <div class="rule-info">
            <div class="rule-meta-row">
              <span class="rule-cat-tag" style="color:${cfg.color}">${cfg.emoji} ${capitalize(r.category)}</span>
              <span class="rule-priority-tag" style="color:${pcfg.color};background:${pcfg.color}18">${pcfg.label}</span>
              ${ruleBreaks > 0 ? `<span class="rule-break-count">⚠️ Broken ${ruleBreaks}x</span>` : '<span class="rule-clean">✅ Never broken</span>'}
            </div>
            <h4 class="rule-title ${!isActive ? 'rule-title-inactive' : ''}">${escHtml(r.title)}</h4>
            ${r.desc ? `<p class="rule-desc">${escHtml(r.desc)}</p>` : ''}
            ${r.consequence ? `<p class="rule-consequence">⚡ ${escHtml(r.consequence)}</p>` : ''}
          </div>
          <div class="rule-card-actions">
            <button class="icon-btn" data-action="toggle-rule" data-id="${r.id}" title="${isActive ? 'Disable' : 'Enable'}">
              ${isActive
                ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`
                : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`}
            </button>
            <button class="icon-btn" data-action="edit-rule" data-id="${r.id}" title="Edit">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="icon-btn danger" data-action="delete-rule" data-id="${r.id}" title="Delete">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
            </button>
          </div>
        </div>
      </div>
      <div class="rule-color-bar" style="background:${cfg.color}"></div>
    </div>`;
  }

  function bindRuleCardEvents() {
    document.querySelectorAll('[data-action="edit-rule"]').forEach(btn =>
      btn.addEventListener('click', e => openEditRuleModal(e.currentTarget.dataset.id)));
    document.querySelectorAll('[data-action="delete-rule"]').forEach(btn =>
      btn.addEventListener('click', e => openDeleteRuleModal(e.currentTarget.dataset.id)));
    document.querySelectorAll('[data-action="toggle-rule"]').forEach(btn =>
      btn.addEventListener('click', e => toggleRule(e.currentTarget.dataset.id)));
  }

  function toggleRule(id) {
    const r = rules.find(r => r.id === id);
    if (!r) return;
    r.active = r.active === false ? true : false;
    saveAndRefresh();
  }

  // ---------- CHECKLIST ----------
  function renderChecklist() {
    const list = document.getElementById('pretradeList');
    if (!list) return;

    list.innerHTML = checklist.map((item, idx) => `
      <label class="pretrade-item ${item.checked ? 'pretrade-checked' : ''}">
        <input type="checkbox" ${item.checked ? 'checked' : ''} data-idx="${idx}" class="pretrade-checkbox"/>
        <span class="check-box"></span>
        <span class="pretrade-item-text">${escHtml(item.text)}</span>
        <button class="icon-btn danger pretrade-del-btn" data-action="del-checklist" data-idx="${idx}" title="Remove">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </label>`).join('');

    updatePretradeProgress();
    bindChecklistEvents();
  }

  function bindChecklistEvents() {
    document.querySelectorAll('.pretrade-checkbox').forEach(cb => {
      cb.addEventListener('change', e => {
        const idx = parseInt(e.target.dataset.idx);
        checklist[idx].checked = e.target.checked;
        Storage.set('pretrade_checklist', checklist);
        renderChecklist();
      });
    });

    document.querySelectorAll('[data-action="del-checklist"]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        const idx = parseInt(e.currentTarget.dataset.idx);
        checklist.splice(idx, 1);
        Storage.set('pretrade_checklist', checklist);
        renderChecklist();
      });
    });
  }

  function updatePretradeProgress() {
    const total   = checklist.length;
    const checked = checklist.filter(i => i.checked).length;
    const pct     = total > 0 ? Math.round((checked / total) * 100) : 0;

    const fill    = document.getElementById('pretradeProgressFill');
    const pctEl   = document.getElementById('pretradeProgressPct');
    const result  = document.getElementById('pretradeResult');
    const icon    = document.getElementById('ptrIcon');
    const text    = document.getElementById('ptrText');

    if (fill)  fill.style.width = pct + '%';
    if (pctEl) pctEl.textContent = pct + '%';

    if (fill) {
      fill.style.background = pct === 100 ? 'var(--green)' : pct >= 70 ? 'var(--accent)' : 'var(--accent4)';
    }

    if (result) {
      if (pct === 100) {
        result.style.display = 'flex';
        if (icon) icon.textContent = '✅';
        if (text) text.textContent = 'All checks passed! You may enter the trade.';
        result.className = 'pretrade-result ptr-pass';
      } else if (pct >= 70) {
        result.style.display = 'flex';
        if (icon) icon.textContent = '⚠️';
        if (text) text.textContent = `${total - checked} check(s) remaining. Review before trading.`;
        result.className = 'pretrade-result ptr-warn';
      } else {
        result.style.display = 'none';
      }
    }
  }

  // ---------- BREAKS ----------
  function renderBreaks() {
    const list    = document.getElementById('breaksList');
    const emptyEl = document.getElementById('breaksEmpty');
    const summary = document.getElementById('breaksSummary');
    if (!list) return;

    if (breaks.length === 0) {
      list.innerHTML = '';
      if (emptyEl)  emptyEl.style.display  = 'flex';
      if (summary)  summary.innerHTML = '';
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';

    // Summary by rule
    const breakMap = {};
    breaks.forEach(b => {
      const rule = rules.find(r => r.id === b.ruleId);
      const name = rule ? rule.title : b.ruleName || 'Unknown Rule';
      if (!breakMap[name]) breakMap[name] = 0;
      breakMap[name]++;
    });

    const maxBreaks = Math.max(...Object.values(breakMap), 1);
    if (summary) {
      summary.innerHTML = `
        <div class="breaks-summary-card">
          <h4 class="section-title" style="margin-bottom:14px">Most Broken Rules</h4>
          ${Object.entries(breakMap).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name, count]) => `
            <div class="break-summary-row">
              <span class="bsr-name">${escHtml(name.slice(0,40))}${name.length>40?'…':''}</span>
              <div class="bsr-bar-wrap">
                <div class="metric-bar"><div class="metric-fill" style="width:${Math.round(count/maxBreaks*100)}%;background:var(--red)"></div></div>
              </div>
              <span class="bsr-count">${count}x</span>
            </div>`).join('')}
        </div>`;
    }

    const sorted = [...breaks].sort((a,b) => new Date(b.date) - new Date(a.date));
    list.innerHTML = sorted.map(b => {
      const rule = rules.find(r => r.id === b.ruleId);
      const cfg  = rule ? (CAT_CONFIG[rule.category] || { emoji:'⚡', color:'#ef4444' }) : { emoji:'⚠️', color:'#ef4444' };
      return `
        <div class="break-item">
          <div class="break-item-icon" style="background:${cfg.color}22;color:${cfg.color}">${cfg.emoji}</div>
          <div class="break-item-body">
            <div class="break-item-rule">${escHtml(b.ruleName || (rule ? rule.title : 'Unknown Rule'))}</div>
            <div class="break-item-date">${formatDate(b.date)}</div>
            ${b.description ? `<p class="break-item-desc">${escHtml(b.description)}</p>` : ''}
            ${b.emotion     ? `<span class="break-item-emotion">${escHtml(b.emotion)}</span>` : ''}
            ${b.lesson      ? `<p class="break-item-lesson">💡 ${escHtml(b.lesson)}</p>` : ''}
          </div>
          <button class="icon-btn danger" data-action="del-break" data-id="${b.id}" title="Delete">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
          </button>
        </div>`;
    }).join('');

    document.querySelectorAll('[data-action="del-break"]').forEach(btn => {
      btn.addEventListener('click', e => {
        const id = e.currentTarget.dataset.id;
        breaks = breaks.filter(b => b.id !== id);
        Storage.set('rule_breaks', breaks);
        renderAll();
      });
    });
  }

  // ---------- MODALS ----------
  function bindModalEvents() {
    // Add Rule
    document.getElementById('openAddRuleModal')?.addEventListener('click', openAddRuleModal);
    ['closeRuleModal','cancelRuleModal'].forEach(id => document.getElementById(id)?.addEventListener('click', closeRuleModal));
    document.getElementById('ruleModalOverlay')?.addEventListener('click', e => { if(e.target.id==='ruleModalOverlay') closeRuleModal(); });
    document.getElementById('saveRuleBtn')?.addEventListener('click', saveRule);

    // Delete Rule
    document.getElementById('closeDeleteRuleModal')?.addEventListener('click', closeDeleteRuleModal);
    document.getElementById('cancelDeleteRuleModal')?.addEventListener('click', closeDeleteRuleModal);
    document.getElementById('confirmDeleteRuleBtn')?.addEventListener('click', confirmDeleteRule);
    document.getElementById('deleteRuleModalOverlay')?.addEventListener('click', e => { if(e.target.id==='deleteRuleModalOverlay') closeDeleteRuleModal(); });

    // Rule Break
    document.getElementById('openRuleBreakModal')?.addEventListener('click', openRuleBreakModal);
    ['closeRuleBreakModal','cancelRuleBreakModal'].forEach(id => document.getElementById(id)?.addEventListener('click', closeRuleBreakModal));
    document.getElementById('ruleBreakModalOverlay')?.addEventListener('click', e => { if(e.target.id==='ruleBreakModalOverlay') closeRuleBreakModal(); });
    document.getElementById('saveRuleBreakBtn')?.addEventListener('click', saveRuleBreak);

    // Checklist item
    document.getElementById('addChecklistItemBtn')?.addEventListener('click', () => {
      document.getElementById('checklistItemModalOverlay')?.classList.add('active');
      setTimeout(() => document.getElementById('checklistItemText')?.focus(), 100);
    });
    ['closeChecklistItemModal','cancelChecklistItemModal'].forEach(id => document.getElementById(id)?.addEventListener('click', () => {
      document.getElementById('checklistItemModalOverlay')?.classList.remove('active');
      setVal('checklistItemText', '');
    }));
    document.getElementById('saveChecklistItemBtn')?.addEventListener('click', addChecklistItem);
    document.getElementById('checklistItemText')?.addEventListener('keydown', e => { if(e.key==='Enter') addChecklistItem(); });

    // Reset checklist
    document.getElementById('resetChecklistBtn')?.addEventListener('click', () => {
      checklist = checklist.map(i => ({ ...i, checked: false }));
      Storage.set('pretrade_checklist', checklist);
      renderChecklist();
    });

    // Enter key on rule title
    document.getElementById('ruleTitle')?.addEventListener('keydown', e => { if(e.key==='Enter') saveRule(); });
  }

  function openAddRuleModal() {
    editingId = null;
    setText('ruleModalTitle', 'Add Trading Rule');
    setVal('ruleTitle', ''); setVal('ruleDesc', ''); setVal('ruleConsequence', '');
    setVal('ruleCategory', 'entry'); setVal('rulePriority', 'medium');
    document.getElementById('ruleModalOverlay')?.classList.add('active');
    setTimeout(() => document.getElementById('ruleTitle')?.focus(), 100);
  }

  function openEditRuleModal(id) {
    const r = rules.find(r => r.id === id);
    if (!r) return;
    editingId = id;
    setText('ruleModalTitle', 'Edit Rule');
    setVal('ruleTitle', r.title);
    setVal('ruleCategory', r.category);
    setVal('rulePriority', r.priority);
    setVal('ruleDesc', r.desc || '');
    setVal('ruleConsequence', r.consequence || '');
    document.getElementById('ruleModalOverlay')?.classList.add('active');
  }

  function closeRuleModal() {
    editingId = null;
    document.getElementById('ruleModalOverlay')?.classList.remove('active');
  }

  function saveRule() {
    const title = getVal('ruleTitle').trim();
    if (!title) { shake(document.getElementById('ruleTitle')); return; }

    const data = {
      title,
      category:    getVal('ruleCategory'),
      priority:    getVal('rulePriority'),
      desc:        getVal('ruleDesc').trim(),
      consequence: getVal('ruleConsequence').trim(),
      active:      true,
    };

    if (editingId) {
      const idx = rules.findIndex(r => r.id === editingId);
      if (idx !== -1) rules[idx] = { ...rules[idx], ...data, updatedAt: new Date().toISOString() };
    } else {
      rules.push({ id: uid(), ...data, createdAt: new Date().toISOString() });
      Storage.addActivity({ icon:'📋', text:`Added rule: ${title}`, color:'#3b82f6' });
    }
    closeRuleModal();
    saveAndRefresh();
  }

  function openDeleteRuleModal(id) {
    deleteTarget = id;
    const r = rules.find(r => r.id === id);
    if (r) setText('deleteRuleName', r.title);
    document.getElementById('deleteRuleModalOverlay')?.classList.add('active');
  }

  function closeDeleteRuleModal() {
    deleteTarget = null;
    document.getElementById('deleteRuleModalOverlay')?.classList.remove('active');
  }

  function confirmDeleteRule() {
    if (!deleteTarget) return;
    rules = rules.filter(r => r.id !== deleteTarget);
    deleteTarget = null;
    closeDeleteRuleModal();
    saveAndRefresh();
  }

  function openRuleBreakModal() {
    // Populate rule select
    const sel = document.getElementById('breakRuleSelect');
    if (sel) {
      sel.innerHTML = '<option value="">Select a rule...</option>' +
        rules.filter(r => r.active !== false).map(r =>
          `<option value="${r.id}">${escHtml(r.title)}</option>`).join('');
    }
    // Set today's date
    setVal('breakDate', dateKey(new Date()));
    setVal('breakDescription', '');
    setVal('breakEmotion', '');
    setVal('breakLesson', '');
    document.getElementById('ruleBreakModalOverlay')?.classList.add('active');
  }

  function closeRuleBreakModal() {
    document.getElementById('ruleBreakModalOverlay')?.classList.remove('active');
  }

  function saveRuleBreak() {
    const ruleId = getVal('breakRuleSelect');
    if (!ruleId) { shake(document.getElementById('breakRuleSelect')); return; }

    const rule = rules.find(r => r.id === ruleId);
    const entry = {
      id:          uid(),
      ruleId,
      ruleName:    rule ? rule.title : 'Unknown',
      date:        getVal('breakDate') || dateKey(new Date()),
      description: getVal('breakDescription').trim(),
      emotion:     getVal('breakEmotion'),
      lesson:      getVal('breakLesson').trim(),
      createdAt:   new Date().toISOString(),
    };

    breaks.push(entry);
    Storage.set('rule_breaks', breaks);
    Storage.addActivity({ icon:'⚠️', text:`Rule break: ${entry.ruleName}`, color:'#ef4444' });
    closeRuleBreakModal();
    renderAll();
    showToast('⚠️ Rule break logged. Learn from it!');
    if (typeof Dashboard !== 'undefined') Dashboard.renderActivity();
  }

  function addChecklistItem() {
    const text = getVal('checklistItemText').trim();
    if (!text) { shake(document.getElementById('checklistItemText')); return; }
    checklist.push({ id: uid(), text, checked: false });
    Storage.set('pretrade_checklist', checklist);
    document.getElementById('checklistItemModalOverlay')?.classList.remove('active');
    setVal('checklistItemText', '');
    renderChecklist();
  }

  // ---------- TABS ----------
  function bindTabs() {
    document.querySelectorAll('.rules-tab').forEach(btn => {
      btn.addEventListener('click', e => {
        const tab = e.currentTarget.dataset.rtab;
        document.querySelectorAll('.rules-tab').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.rules-tab-content').forEach(c => c.classList.remove('active'));
        e.currentTarget.classList.add('active');
        document.getElementById('rtab-' + tab)?.classList.add('active');
        activeTab = tab;
      });
    });
  }

  function bindCategoryFilter() {
    document.querySelectorAll('[data-rcat]').forEach(btn => {
      btn.addEventListener('click', e => {
        document.querySelectorAll('[data-rcat]').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        activeCat = e.currentTarget.dataset.rcat;
        renderRulesList();
      });
    });
  }

  // ---------- HELPERS ----------
  function saveAndRefresh() {
    Storage.set('trading_rules', rules);
    renderAll();
  }

  function showToast(msg) {
    let toast = document.getElementById('saveToast');
    if (!toast) { toast = document.createElement('div'); toast.id='saveToast'; toast.className='save-toast'; document.body.appendChild(toast); }
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  }

  function dateKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function formatDate(str) {
    if (!str) return '';
    const d = new Date(str + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric', year:'numeric' });
  }

  function uid()        { return 'r_' + Date.now() + '_' + Math.random().toString(36).slice(2,7); }
  function capitalize(s){ return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
  function escHtml(s)   { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function setText(id,v){ const e=document.getElementById(id); if(e) e.textContent=v; }
  function getVal(id)   { const e=document.getElementById(id); return e?e.value:''; }
  function setVal(id,v) { const e=document.getElementById(id); if(e) e.value=v; }
  function shake(el)    { if(!el) return; el.classList.add('shake'); setTimeout(()=>el.classList.remove('shake'),400); }

  return { init };

})();
