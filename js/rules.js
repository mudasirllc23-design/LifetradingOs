/**
 * TRADING PLAYBOOK MODULE
 * ============================================
 * New unified concept: there is no separate "checklist" and "rules list".
 * Every rule the person writes IS a daily check-in item. Each rule card has
 * two buttons — "Followed" and "Broke it" — tapped once per day per rule.
 * The Discipline Score is simply: rules followed today / total rules today.
 *
 * Why this replaces the old 3-part design (rules + checklist + break log):
 * that asked the person to keep two lists in sync manually (a "rule" and a
 * matching "checklist item" that meant the same thing). One list removes
 * that duplication and the daily action is obvious from the rule itself.
 * ============================================
 */

const Rules = (() => {

  let rules        = [];
  let breaks       = [];
  let editingId     = null;
  let deleteTarget  = null;
  let breakTarget   = null; // rule id currently being logged as broken
  let activeCat     = 'all';

  const CAT_CONFIG = {
    entry:      { emoji:'📈', color:'#3b82f6', label:'Entry'   },
    exit:       { emoji:'📉', color:'#ef4444', label:'Exit'    },
    risk:       { emoji:'⚖️', color:'#f59e0b', label:'Risk'    },
    psychology: { emoji:'🧠', color:'#8b5cf6', label:'Mind'    },
    general:    { emoji:'⚡', color:'#10b981', label:'General' },
  };

  const PRIORITY_COLOR = { critical:'#ef4444', high:'#f59e0b', medium:'#10b981' };

  // One-click starter set so a brand-new user isn't staring at a blank page
  const STARTER_RULES = [
    { title:'Never enter a trade without a Stop Loss',        category:'risk',       priority:'critical', desc:'Every trade gets a Stop Loss before it gets an entry. No exceptions.' },
    { title:'Risk no more than 1-2% per trade',                category:'risk',       priority:'critical', desc:'Position size is calculated from account balance, not gut feeling.' },
    { title:'Wait for the Higher Timeframe trend to confirm',  category:'entry',      priority:'high',     desc:'Daily/H4 direction must agree with the trade before taking an entry.' },
    { title:'No trading 30 minutes around high-impact news',  category:'entry',      priority:'high',     desc:'Spreads widen and price whips violently around news releases.' },
    { title:'Stop trading for the day after 2 losses',        category:'psychology', priority:'critical', desc:'Two losses in a row means today’s read on the market is probably off.' },
  ];

  // ---------- INIT ----------
  function init() {
    rules  = Storage.get('trading_rules', []);
    breaks = Storage.get('rule_breaks', []);
    migrateOldShape();
    bindModalEvents();
    bindCategoryPills();
    bindEmptyStateActions();
    renderAll();
  }

  // Earlier builds stored rules without a `checkins` map. Add it on the fly
  // so people who already created rules don't lose them on upgrade.
  function migrateOldShape() {
    let changed = false;
    rules.forEach(r => {
      if (!r.checkins) { r.checkins = {}; changed = true; }
    });
    if (changed) Storage.set('trading_rules', rules);
  }

  // ---------- RENDER ALL ----------
  function renderAll() {
    renderDisciplineHero();
    renderPlaybookList();
    renderBreaksHistory();
  }

  // ---------- DISCIPLINE HERO ----------
  function renderDisciplineHero() {
    const today = todayKey();
    const total = rules.length;

    const followedToday = rules.filter(r => r.checkins[today] === 'followed').length;
    const brokenToday    = rules.filter(r => r.checkins[today] === 'broken').length;
    const pct = total > 0 ? Math.round((followedToday / total) * 100) : null;

    setText('dh_total',    total);
    setText('dh_followed', followedToday);
    setText('dh_broken',   brokenToday);
    setText('dh_streak',   calcCleanStreak());

    const titleEl = document.getElementById('dhTitle');
    if (titleEl) {
      if (total === 0) {
        titleEl.textContent = 'Add your first rule to get started';
      } else if (followedToday + brokenToday === 0) {
        titleEl.textContent = "Check in below once you've traded today";
      } else if (pct === 100) {
        titleEl.textContent = 'Perfect discipline today 🎯';
      } else if (brokenToday > 0) {
        titleEl.textContent = `${brokenToday} slip-up${brokenToday>1?'s':''} today — be honest with yourself`;
      } else {
        titleEl.textContent = 'Keep checking in as you trade today';
      }
    }

    const ring    = document.getElementById('dhRingFill');
    const ringPct = document.getElementById('dhRingPct');
    if (ring) {
      const circumference = 314.16;
      const safePct = pct === null ? 0 : pct;
      ring.style.strokeDashoffset = circumference - (safePct/100) * circumference;
      ring.style.stroke = pct === null ? 'var(--border2)' : pct === 100 ? 'var(--green)' : pct >= 60 ? 'var(--accent)' : 'var(--red)';
    }
    if (ringPct) ringPct.textContent = pct === null ? '—' : pct + '%';
  }

  function calcCleanStreak() {
    // Count consecutive days going backward from today where every rule
    // that had a check-in was "followed" and at least one check-in happened.
    if (rules.length === 0) return 0;
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = dateKey(d);
      const dayCheckins = rules.map(r => r.checkins[key]).filter(Boolean);
      if (dayCheckins.length === 0) {
        if (i === 0) continue; // today might just not have check-ins yet — don't break the streak for that
        break;
      }
      if (dayCheckins.some(c => c === 'broken')) break;
      streak++;
    }
    return streak;
  }

  // ---------- PLAYBOOK LIST ----------
  function renderPlaybookList() {
    const list     = document.getElementById('playbookList');
    const emptyEl  = document.getElementById('playbookEmpty');
    const pillsWrap= document.getElementById('rulesCatPillsWrap');
    if (!list) return;

    if (rules.length === 0) {
      list.innerHTML = '';
      if (emptyEl)   emptyEl.style.display = 'flex';
      if (pillsWrap) pillsWrap.style.display = 'none';
      return;
    }
    if (emptyEl)   emptyEl.style.display = 'none';
    if (pillsWrap) pillsWrap.style.display = 'flex';

    let filtered = activeCat === 'all' ? rules : rules.filter(r => r.category === activeCat);

    if (filtered.length === 0) {
      list.innerHTML = `<div class="no-filter-result">No rules in this category.</div>`;
      return;
    }

    const order = { critical:0, high:1, medium:2 };
    filtered = [...filtered].sort((a,b) => (order[a.priority]??2) - (order[b.priority]??2));

    const today = todayKey();
    list.innerHTML = filtered.map(r => renderRuleCard(r, today)).join('');
    bindRuleCardEvents();
  }

  function renderRuleCard(r, today) {
    const cfg    = CAT_CONFIG[r.category] || CAT_CONFIG.general;
    const pColor = PRIORITY_COLOR[r.priority] || PRIORITY_COLOR.medium;
    const state  = r.checkins[today]; // undefined | 'followed' | 'broken'
    const totalBreaks = Object.values(r.checkins).filter(c => c === 'broken').length;

    return `
    <div class="playbook-card state-${state || 'pending'}" data-id="${r.id}" style="--rule-color:${cfg.color}">
      <div class="pbc-left" style="background:${cfg.color}18;color:${cfg.color}">${cfg.emoji}</div>
      <div class="pbc-body">
        <div class="pbc-top">
          <div class="pbc-tags">
            <span class="src-cat" style="color:${cfg.color}">${cfg.label}</span>
            <span class="src-priority" style="color:${pColor};background:${pColor}18">${capitalize(r.priority)}</span>
            ${totalBreaks > 0 ? `<span class="src-breaks">⚠️ ${totalBreaks}x lifetime</span>` : `<span class="src-clean">✅ Never broken</span>`}
          </div>
          <div class="pbc-actions">
            <button class="icon-btn" data-action="edit-rule" data-id="${r.id}" title="Edit">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="icon-btn danger" data-action="delete-rule" data-id="${r.id}" title="Delete">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
            </button>
          </div>
        </div>
        <p class="pbc-title">${escHtml(r.title)}</p>
        ${r.desc ? `<p class="pbc-desc">${escHtml(r.desc)}</p>` : ''}

        <div class="pbc-checkin">
          <button class="pbc-btn pbc-followed ${state==='followed'?'active':''}" data-action="mark-followed" data-id="${r.id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            Followed
          </button>
          <button class="pbc-btn pbc-broken ${state==='broken'?'active':''}" data-action="mark-broken" data-id="${r.id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            Broke it
          </button>
        </div>
      </div>
    </div>`;
  }

  function bindRuleCardEvents() {
    document.querySelectorAll('[data-action="edit-rule"]').forEach(btn =>
      btn.addEventListener('click', e => openEditRuleModal(e.currentTarget.dataset.id)));
    document.querySelectorAll('[data-action="delete-rule"]').forEach(btn =>
      btn.addEventListener('click', e => openDeleteRuleModal(e.currentTarget.dataset.id)));
    document.querySelectorAll('[data-action="mark-followed"]').forEach(btn =>
      btn.addEventListener('click', e => checkIn(e.currentTarget.dataset.id, 'followed')));
    document.querySelectorAll('[data-action="mark-broken"]').forEach(btn =>
      btn.addEventListener('click', e => openRuleBreakModal(e.currentTarget.dataset.id)));
  }

  // ---------- CHECK-IN ----------
  function checkIn(ruleId, state) {
    const r = rules.find(r => r.id === ruleId);
    if (!r) return;
    const today = todayKey();
    const wasAlready = r.checkins[today] === state;

    if (wasAlready) {
      // Tapping the same state again un-marks it (lets you correct a mis-tap)
      delete r.checkins[today];
    } else {
      r.checkins[today] = state;
      if (state === 'followed') {
        Storage.addActivity({ icon:'✅', text:`Followed rule: ${r.title}`, color:'#10b981' });
      }
    }
    Storage.set('trading_rules', rules);
    renderAll();
  }

  // ---------- BREAK MODAL (triggered from a specific rule's "Broke it") ----------
  function openRuleBreakModal(ruleId) {
    const r = rules.find(r => r.id === ruleId);
    if (!r) return;
    breakTarget = ruleId;

    setText('breakRuleName', r.title);
    setVal('breakRuleSelect', ruleId);
    setVal('breakDate', dateKey(new Date()));
    ['breakDescription','breakEmotion','breakLesson'].forEach(id => setVal(id, ''));
    document.getElementById('ruleBreakModalOverlay')?.classList.add('active');
  }

  function closeRuleBreakModal() {
    breakTarget = null;
    document.getElementById('ruleBreakModalOverlay')?.classList.remove('active');
  }

  function saveRuleBreak() {
    if (!breakTarget) return;
    const r = rules.find(r => r.id === breakTarget);
    if (!r) return;

    const today = getVal('breakDate') || dateKey(new Date());
    r.checkins[today] = 'broken';
    Storage.set('trading_rules', rules);

    const entry = {
      id: uid(),
      ruleId: r.id,
      ruleName: r.title,
      date: today,
      description: getVal('breakDescription').trim(),
      emotion: getVal('breakEmotion'),
      lesson: getVal('breakLesson').trim(),
      createdAt: new Date().toISOString(),
    };
    breaks.push(entry);
    Storage.set('rule_breaks', breaks);
    Storage.addActivity({ icon:'⚠️', text:`Slipped on: ${r.title}`, color:'#ef4444' });

    closeRuleBreakModal();
    renderAll();
    showToast('⚠️ Logged. Tomorrow is a clean slate.');
  }

  // ---------- BREAKS HISTORY ----------
  function renderBreaksHistory() {
    const histEl = document.getElementById('breaksHistory');
    const list   = document.getElementById('breaksList');
    if (!list || !histEl) return;

    if (breaks.length === 0) { histEl.style.display = 'none'; return; }
    histEl.style.display = 'block';

    const sorted = [...breaks].sort((a,b) => new Date(b.date) - new Date(a.date));
    list.innerHTML = sorted.slice(0, 6).map(b => {
      const rule = rules.find(r => r.id === b.ruleId);
      const cfg  = rule ? (CAT_CONFIG[rule.category] || CAT_CONFIG.general) : { emoji:'⚠️', color:'#ef4444' };
      return `
        <div class="break-item">
          <div class="break-item-icon" style="background:${cfg.color}18;color:${cfg.color}">${cfg.emoji}</div>
          <div class="break-item-body">
            <div class="break-item-rule">${escHtml(b.ruleName || 'Unknown Rule')}</div>
            <div class="break-item-date">${formatDate(b.date)}</div>
            ${b.description ? `<p class="break-item-desc">${escHtml(b.description)}</p>` : ''}
            ${b.emotion ? `<span class="break-item-emotion">${escHtml(b.emotion)}</span>` : ''}
            ${b.lesson ? `<p class="break-item-lesson">💡 ${escHtml(b.lesson)}</p>` : ''}
          </div>
          <button class="icon-btn danger" data-action="del-break" data-id="${b.id}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>`;
    }).join('');

    document.querySelectorAll('[data-action="del-break"]').forEach(btn => {
      btn.addEventListener('click', e => {
        breaks = breaks.filter(b => b.id !== e.currentTarget.dataset.id);
        Storage.set('rule_breaks', breaks);
        renderAll();
      });
    });
  }

  // ---------- ADD / EDIT / DELETE RULE MODAL ----------
  function bindModalEvents() {
    document.getElementById('openAddRuleModal')?.addEventListener('click', openAddRuleModal);
    ['closeRuleModal','cancelRuleModal'].forEach(id => document.getElementById(id)?.addEventListener('click', closeRuleModal));
    document.getElementById('ruleModalOverlay')?.addEventListener('click', e => { if (e.target.id === 'ruleModalOverlay') closeRuleModal(); });
    document.getElementById('saveRuleBtn')?.addEventListener('click', saveRule);
    document.getElementById('ruleTitle')?.addEventListener('keydown', e => { if (e.key === 'Enter') saveRule(); });

    document.getElementById('closeDeleteRuleModal')?.addEventListener('click', closeDeleteRuleModal);
    document.getElementById('cancelDeleteRuleModal')?.addEventListener('click', closeDeleteRuleModal);
    document.getElementById('confirmDeleteRuleBtn')?.addEventListener('click', confirmDeleteRule);
    document.getElementById('deleteRuleModalOverlay')?.addEventListener('click', e => { if (e.target.id === 'deleteRuleModalOverlay') closeDeleteRuleModal(); });

    ['closeRuleBreakModal','cancelRuleBreakModal'].forEach(id => document.getElementById(id)?.addEventListener('click', closeRuleBreakModal));
    document.getElementById('ruleBreakModalOverlay')?.addEventListener('click', e => { if (e.target.id === 'ruleBreakModalOverlay') closeRuleBreakModal(); });
    document.getElementById('saveRuleBreakBtn')?.addEventListener('click', saveRuleBreak);
  }

  function openAddRuleModal() {
    editingId = null;
    setText('ruleModalTitle', 'Add a Rule');
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
      category: getVal('ruleCategory'),
      priority: getVal('rulePriority'),
      desc: getVal('ruleDesc').trim(),
      consequence: getVal('ruleConsequence').trim(),
      active: true,
    };

    if (editingId) {
      const idx = rules.findIndex(r => r.id === editingId);
      if (idx !== -1) rules[idx] = { ...rules[idx], ...data };
    } else {
      rules.push({ id: uid(), ...data, checkins: {}, createdAt: new Date().toISOString() });
      Storage.addActivity({ icon:'📋', text:`Added rule: ${title}`, color:'#3b82f6' });
    }
    closeRuleModal();
    Storage.set('trading_rules', rules);
    renderAll();
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
    Storage.set('trading_rules', rules);
    renderAll();
  }

  // ---------- EMPTY STATE ACTIONS ----------
  function bindEmptyStateActions() {
    document.getElementById('emptyAddRuleBtn')?.addEventListener('click', openAddRuleModal);
    document.getElementById('useStarterRulesBtn')?.addEventListener('click', addStarterRules);
  }

  function addStarterRules() {
    const added = STARTER_RULES.map(r => ({
      id: uid(),
      ...r,
      active: true,
      checkins: {},
      createdAt: new Date().toISOString(),
    }));
    rules = rules.concat(added);
    Storage.set('trading_rules', rules);
    Storage.addActivity({ icon:'⚡', text:`Added ${added.length} starter trading rules`, color:'#3b82f6' });
    renderAll();
    showToast('⚡ 5 starter rules added — edit or delete any of them anytime.');
  }

  // ---------- CATEGORY PILLS ----------
  function bindCategoryPills() {
    document.querySelectorAll('[data-rcat]').forEach(btn => {
      btn.addEventListener('click', e => {
        document.querySelectorAll('[data-rcat]').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        activeCat = e.currentTarget.dataset.rcat;
        renderPlaybookList();
      });
    });
  }

  // ---------- HELPERS ----------
  function showToast(msg) {
    let t = document.getElementById('saveToast');
    if (!t) { t = document.createElement('div'); t.id = 'saveToast'; t.className = 'save-toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
  }

  function todayKey() { return dateKey(new Date()); }
  function dateKey(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
  function formatDate(s) { if (!s) return ''; const d = new Date(s + 'T00:00:00'); return d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }); }
  function uid() { return 'r_' + Date.now() + '_' + Math.random().toString(36).slice(2,7); }
  function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
  function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function setText(id, v) { const e = document.getElementById(id); if (e) e.textContent = v; }
  function getVal(id) { const e = document.getElementById(id); return e ? e.value : ''; }
  function setVal(id, v) { const e = document.getElementById(id); if (e) e.value = v; }
  function shake(el) { if (!el) return; el.classList.add('shake'); setTimeout(() => el.classList.remove('shake'), 400); }

  return { init };
})();
