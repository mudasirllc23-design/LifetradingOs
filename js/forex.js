/**
 * FOREX MODULE
 * Complete Forex Trading Journal System
 * Day 3: Trade Entry, History, Psychology, Pair Analysis
 */

const Forex = (() => {

  // ---------- STATE ----------
  let trades = [];
  let editingId = null;
  let deleteTargetId = null;
  let viewingId = null;
  let activeTab = 'history';
  let selectedDir = 'buy';
  let filters = { pair: '', result: '', tf: '', dir: '' };
  let filterVisible = false;

  // ---------- INIT ----------
  function init() {
    trades = Storage.getTrades();
    setDefaultDate();
    bindModalEvents();
    bindTabEvents();
    bindFilterEvents();
    bindDirToggle();
    bindRRAutoCalc();
    bindDisciplineSlider();
    renderAll();
  }

  // ---------- RENDER ALL ----------
  function renderAll() {
    updateStatsStrip();
    renderTradeHistory();
    renderPsychology();
    renderPairAnalysis();
    if (typeof Dashboard !== 'undefined') {
      Dashboard.updateTradingSummary();
    }
  }

  // ---------- STATS STRIP ----------
  function updateStatsStrip() {
    const total = trades.length;
    const wins   = trades.filter(t => parseFloat(t.pnl) > 0).length;
    const losses = trades.filter(t => parseFloat(t.pnl) < 0).length;
    const be     = trades.filter(t => parseFloat(t.pnl) === 0).length;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
    const netPnL  = trades.reduce((s, t) => s + parseFloat(t.pnl || 0), 0);

    const rrVals = trades.filter(t => t.rr && parseFloat(t.rr) > 0).map(t => parseFloat(t.rr));
    const avgRR  = rrVals.length > 0 ? (rrVals.reduce((a,b)=>a+b,0)/rrVals.length).toFixed(2) : '0.00';

    setText('ts_total',   total);
    setText('ts_winrate', winRate + '%');
    setText('ts_pnl',     formatPnL(netPnL));
    setText('ts_rr',      '1:' + avgRR);
    setText('ts_wins',    wins);
    setText('ts_losses',  losses);

    // Color P&L
    const pnlEl = document.getElementById('ts_pnl');
    if (pnlEl) pnlEl.className = 'tstrip-val ' + (netPnL > 0 ? 'green' : netPnL < 0 ? 'red' : '');
    const wrEl = document.getElementById('ts_winrate');
    if (wrEl) wrEl.className = 'tstrip-val ' + (winRate >= 50 ? 'green' : 'red');
  }

  // ---------- TRADE HISTORY TABLE ----------
  function renderTradeHistory() {
    const tbody = document.getElementById('tradesTableBody');
    const emptyEl = document.getElementById('tradesEmpty');
    if (!tbody) return;

    const filtered = applyFilters(trades);

    if (filtered.length === 0) {
      tbody.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'flex';
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';

    // Sort newest first
    const sorted = [...filtered].sort((a,b) => new Date(b.date) - new Date(a.date));

    tbody.innerHTML = sorted.map(t => {
      const pnl = parseFloat(t.pnl || 0);
      const result = pnl > 0 ? 'win' : pnl < 0 ? 'loss' : 'be';
      const resultLabel = { win: '✅ Win', loss: '❌ Loss', be: '➖ B/E' }[result];
      const resultClass = { win: 'result-win', loss: 'result-loss', be: 'result-be' }[result];
      const dirIcon = t.direction === 'buy' ? '🟢' : '🔴';
      const checkScore = calcChecklistScore(t);

      return `<tr class="trade-row" data-id="${t.id}">
        <td class="td-date">${formatDate(t.date)}</td>
        <td class="td-pair"><strong>${escHtml(t.pair)}</strong></td>
        <td class="td-dir">${dirIcon} ${capitalize(t.direction||'')}</td>
        <td class="td-tf"><span class="tf-badge">${escHtml(t.timeframe||'—')}</span></td>
        <td class="td-num">${t.entry || '—'}</td>
        <td class="td-num">${t.exit || '—'}</td>
        <td class="td-num red">${t.sl || '—'}</td>
        <td class="td-num green">${t.tp || '—'}</td>
        <td class="td-num"><span class="rr-tag">${t.rr ? '1:'+parseFloat(t.rr).toFixed(1) : '—'}</span></td>
        <td class="td-pnl ${pnl > 0 ? 'green' : pnl < 0 ? 'red' : ''}">${formatPnL(pnl)}</td>
        <td><span class="result-badge ${resultClass}">${resultLabel}</span></td>
        <td class="td-actions">
          <button class="icon-btn" data-action="view" data-id="${t.id}" title="View">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
          <button class="icon-btn" data-action="edit-trade" data-id="${t.id}" title="Edit">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="icon-btn danger" data-action="delete-trade" data-id="${t.id}" title="Delete">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
          </button>
        </td>
      </tr>`;
    }).join('');

    bindTableEvents();
  }

  function applyFilters(list) {
    return list.filter(t => {
      if (filters.pair && t.pair !== filters.pair) return false;
      if (filters.tf && t.timeframe !== filters.tf) return false;
      if (filters.dir && t.direction !== filters.dir) return false;
      if (filters.result) {
        const pnl = parseFloat(t.pnl || 0);
        if (filters.result === 'win' && pnl <= 0) return false;
        if (filters.result === 'loss' && pnl >= 0) return false;
        if (filters.result === 'be' && pnl !== 0) return false;
      }
      return true;
    });
  }

  function bindTableEvents() {
    document.querySelectorAll('[data-action="view"]').forEach(btn => {
      btn.addEventListener('click', e => openViewModal(e.currentTarget.dataset.id));
    });
    document.querySelectorAll('[data-action="edit-trade"]').forEach(btn => {
      btn.addEventListener('click', e => openEditModal(e.currentTarget.dataset.id));
    });
    document.querySelectorAll('[data-action="delete-trade"]').forEach(btn => {
      btn.addEventListener('click', e => openDeleteModal(e.currentTarget.dataset.id));
    });
  }

  // ---------- PSYCHOLOGY TAB ----------
  function renderPsychology() {
    renderMistakeList();
    renderEmotionChart();
    renderPsychScores();
  }

  function renderMistakeList() {
    const el = document.getElementById('mistakeList');
    if (!el) return;
    const mistakeCounts = {};
    trades.forEach(t => {
      if (t.mistake) {
        mistakeCounts[t.mistake] = (mistakeCounts[t.mistake] || 0) + 1;
      }
    });
    const sorted = Object.entries(mistakeCounts).sort((a,b) => b[1]-a[1]);
    if (sorted.length === 0) {
      el.innerHTML = '<p class="psych-empty">No mistakes logged yet — great discipline!</p>';
      return;
    }
    const max = sorted[0][1];
    el.innerHTML = sorted.map(([mistake, count]) => `
      <div class="mistake-item">
        <div class="mistake-info">
          <span class="mistake-name">${escHtml(mistake)}</span>
          <span class="mistake-count">${count}x</span>
        </div>
        <div class="metric-bar">
          <div class="metric-fill" style="width:${(count/max)*100}%;background:var(--red)"></div>
        </div>
      </div>`).join('');
  }

  function renderEmotionChart() {
    const el = document.getElementById('emotionChart');
    if (!el) return;
    const emotionData = {};
    trades.forEach(t => {
      if (t.emotion) {
        emotionData[t.emotion] = (emotionData[t.emotion] || 0) + 1;
      }
    });
    const sorted = Object.entries(emotionData).sort((a,b) => b[1]-a[1]);
    if (sorted.length === 0) {
      el.innerHTML = '<p class="psych-empty">No emotional states logged yet.</p>';
      return;
    }
    const max = sorted[0][1];
    el.innerHTML = sorted.slice(0,6).map(([emotion, count]) => `
      <div class="emotion-item">
        <div class="emotion-label">${escHtml(emotion)}</div>
        <div class="emotion-bar-wrap">
          <div class="metric-bar">
            <div class="metric-fill accent2" style="width:${(count/max)*100}%"></div>
          </div>
          <span class="emotion-count">${count}</span>
        </div>
      </div>`).join('');
  }

  function renderPsychScores() {
    const el = document.getElementById('psychScores');
    if (!el) return;
    if (trades.length === 0) {
      el.innerHTML = '<p class="psych-empty">Log trades to see psychology scores.</p>';
      return;
    }

    const withDiscipline = trades.filter(t => t.discipline);
    const avgDisc = withDiscipline.length > 0
      ? Math.round(withDiscipline.reduce((s,t) => s + parseInt(t.discipline||5), 0) / withDiscipline.length * 10)
      : 0;

    const withChecklist = trades.filter(t => t.checklist);
    const avgPlan = withChecklist.length > 0
      ? Math.round(withChecklist.reduce((s,t) => s + calcChecklistScore(t), 0) / withChecklist.length)
      : 0;

    const total = trades.length;
    const wins = trades.filter(t => parseFloat(t.pnl||0) > 0).length;
    const noMistake = trades.filter(t => !t.mistake || t.mistake === 'None').length;
    const consistency = total > 0 ? Math.round((noMistake / total) * 100) : 0;
    const winRate = total > 0 ? Math.round((wins/total)*100) : 0;

    const metrics = [
      { label: 'Avg Discipline Score', val: avgDisc, suffix: '%', color: 'var(--accent)' },
      { label: 'Plan Adherence', val: avgPlan, suffix: '%', color: 'var(--accent3)' },
      { label: 'Mistake-Free Rate', val: consistency, suffix: '%', color: 'var(--accent2)' },
      { label: 'Win Rate', val: winRate, suffix: '%', color: 'var(--accent4)' },
    ];

    el.innerHTML = metrics.map(m => `
      <div class="psych-score-item">
        <div class="psych-score-label">${m.label}</div>
        <div class="psych-score-bar-wrap">
          <div class="metric-bar" style="height:8px">
            <div class="metric-fill" style="width:${m.val}%;background:${m.color}"></div>
          </div>
          <span class="psych-score-val" style="color:${m.color}">${m.val}${m.suffix}</span>
        </div>
      </div>`).join('');
  }

  // ---------- PAIR ANALYSIS TAB ----------
  function renderPairAnalysis() {
    const el = document.getElementById('pairsGrid');
    if (!el) return;
    if (trades.length === 0) {
      el.innerHTML = '<div class="psych-empty" style="padding:40px;text-align:center;color:var(--text3)">No trades yet — log trades to see pair analysis.</div>';
      return;
    }

    const pairMap = {};
    trades.forEach(t => {
      const p = t.pair;
      if (!pairMap[p]) pairMap[p] = { trades: [], wins: 0, losses: 0, pnl: 0 };
      pairMap[p].trades.push(t);
      const pnl = parseFloat(t.pnl || 0);
      pairMap[p].pnl += pnl;
      if (pnl > 0) pairMap[p].wins++;
      else if (pnl < 0) pairMap[p].losses++;
    });

    const sorted = Object.entries(pairMap).sort((a,b) => b[1].trades.length - a[1].trades.length);

    el.innerHTML = sorted.map(([pair, data]) => {
      const total = data.trades.length;
      const wr = Math.round((data.wins / total) * 100);
      const pnl = data.pnl;
      return `
        <div class="pair-card">
          <div class="pair-card-header">
            <span class="pair-name">${escHtml(pair)}</span>
            <span class="pair-count">${total} trades</span>
          </div>
          <div class="pair-stats">
            <div class="pair-stat">
              <div class="pair-stat-val ${wr >= 50 ? 'green' : 'red'}">${wr}%</div>
              <div class="pair-stat-label">Win Rate</div>
            </div>
            <div class="pair-stat">
              <div class="pair-stat-val ${pnl >= 0 ? 'green' : 'red'}">${formatPnL(pnl)}</div>
              <div class="pair-stat-label">Net P&L</div>
            </div>
            <div class="pair-stat">
              <div class="pair-stat-val green">${data.wins}</div>
              <div class="pair-stat-label">Wins</div>
            </div>
            <div class="pair-stat">
              <div class="pair-stat-val red">${data.losses}</div>
              <div class="pair-stat-label">Losses</div>
            </div>
          </div>
          <div class="pair-win-bar">
            <div class="pair-win-fill" style="width:${wr}%"></div>
          </div>
        </div>`;
    }).join('');
  }

  // ---------- VIEW TRADE MODAL ----------
  function openViewModal(id) {
    const t = trades.find(t => t.id === id);
    if (!t) return;
    viewingId = id;
    const pnl = parseFloat(t.pnl || 0);
    const result = pnl > 0 ? 'Win ✅' : pnl < 0 ? 'Loss ❌' : 'Break Even ➖';
    const chk = t.checklist || {};
    const checkItems = [
      ['Monthly Analysis', 'chk_monthly'], ['Weekly Analysis', 'chk_weekly'],
      ['Daily Analysis', 'chk_daily'], ['H4 Analysis', 'chk_h4'],
      ['H1 Refinement', 'chk_h1'], ['M15 Entry', 'chk_m15'],
      ['Risk Calculated', 'chk_risk'], ['News Checked', 'chk_news']
    ];

    setText('viewTradeTitle', `${t.pair} — ${capitalize(t.direction||'')} — ${formatDate(t.date)}`);
    const body = document.getElementById('viewTradeBody');
    if (!body) return;

    body.innerHTML = `
      <div class="view-trade-grid">
        <div class="view-section">
          <h4 class="view-section-title">Trade Details</h4>
          <div class="view-row"><span>Pair</span><strong>${escHtml(t.pair)}</strong></div>
          <div class="view-row"><span>Direction</span><strong>${t.direction === 'buy' ? '🟢 Buy' : '🔴 Sell'}</strong></div>
          <div class="view-row"><span>Timeframe</span><strong>${escHtml(t.timeframe||'—')}</strong></div>
          <div class="view-row"><span>Session</span><strong>${escHtml(t.session||'—')}</strong></div>
          <div class="view-row"><span>Date</span><strong>${formatDate(t.date)}</strong></div>
          <div class="view-row"><span>Lot Size</span><strong>${t.lot||'—'}</strong></div>
        </div>
        <div class="view-section">
          <h4 class="view-section-title">Price Levels</h4>
          <div class="view-row"><span>Entry</span><strong>${t.entry||'—'}</strong></div>
          <div class="view-row"><span>Exit</span><strong>${t.exit||'—'}</strong></div>
          <div class="view-row"><span>Stop Loss</span><strong class="red">${t.sl||'—'}</strong></div>
          <div class="view-row"><span>Take Profit</span><strong class="green">${t.tp||'—'}</strong></div>
          <div class="view-row"><span>Risk:Reward</span><strong>${t.rr ? '1:'+parseFloat(t.rr).toFixed(2) : '—'}</strong></div>
          <div class="view-row"><span>Result</span><strong>${result}</strong></div>
          <div class="view-row"><span>P&L</span><strong class="${pnl>0?'green':pnl<0?'red':''}">${formatPnL(pnl)}</strong></div>
        </div>
        <div class="view-section">
          <h4 class="view-section-title">Psychology</h4>
          <div class="view-row"><span>Emotion</span><strong>${escHtml(t.emotion||'—')}</strong></div>
          <div class="view-row"><span>Mistake</span><strong class="${t.mistake&&t.mistake!=='None'?'red':''}">${escHtml(t.mistake||'None')}</strong></div>
          <div class="view-row"><span>Discipline</span><strong>${t.discipline||'—'}/10</strong></div>
        </div>
        <div class="view-section">
          <h4 class="view-section-title">Analysis Checklist</h4>
          ${checkItems.map(([label, key]) => `
            <div class="view-row">
              <span>${label}</span>
              <strong>${chk[key] ? '✅' : '❌'}</strong>
            </div>`).join('')}
        </div>
      </div>
      ${t.entryReason ? `<div class="view-notes-section"><h4 class="view-section-title">Entry Reason</h4><p>${escHtml(t.entryReason)}</p></div>` : ''}
      ${t.exitReason  ? `<div class="view-notes-section"><h4 class="view-section-title">Exit Reason</h4><p>${escHtml(t.exitReason)}</p></div>`  : ''}
      ${t.notes       ? `<div class="view-notes-section"><h4 class="view-section-title">Notes</h4><p>${escHtml(t.notes)}</p></div>`               : ''}
      ${t.screenshot  ? `<div class="view-notes-section"><h4 class="view-section-title">Screenshot</h4><a href="${escHtml(t.screenshot)}" target="_blank" class="screenshot-link">📸 View Chart Screenshot →</a></div>` : ''}
    `;

    document.getElementById('viewTradeModalOverlay').classList.add('active');
  }

  // ---------- MODAL — ADD / EDIT TRADE ----------
  function bindModalEvents() {
    const openBtn = document.getElementById('openAddTradeModal');
    if (openBtn) openBtn.addEventListener('click', openAddModal);

    ['closeTradeModal','cancelTradeModal'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', closeTradeModal);
    });

    const overlay = document.getElementById('tradeModalOverlay');
    if (overlay) overlay.addEventListener('click', e => { if (e.target === overlay) closeTradeModal(); });

    const saveBtn = document.getElementById('saveTradeBtn');
    if (saveBtn) saveBtn.addEventListener('click', saveTrade);

    // Delete modal
    const closeDel = document.getElementById('closeDeleteTradeModal');
    const cancelDel = document.getElementById('cancelDeleteTradeModal');
    const confirmDel = document.getElementById('confirmDeleteTradeBtn');
    const delOverlay = document.getElementById('deleteTradeModalOverlay');
    if (closeDel)   closeDel.addEventListener('click', closeDeleteModal);
    if (cancelDel)  cancelDel.addEventListener('click', closeDeleteModal);
    if (confirmDel) confirmDel.addEventListener('click', confirmDelete);
    if (delOverlay) delOverlay.addEventListener('click', e => { if (e.target === delOverlay) closeDeleteModal(); });

    // View modal
    const closeView = document.getElementById('closeViewTradeModal');
    const closeViewBtn = document.getElementById('closeViewTradeBtn');
    const editFromView = document.getElementById('editFromViewBtn');
    const viewOverlay = document.getElementById('viewTradeModalOverlay');
    if (closeView)    closeView.addEventListener('click', closeViewModal);
    if (closeViewBtn) closeViewBtn.addEventListener('click', closeViewModal);
    if (editFromView) editFromView.addEventListener('click', () => { closeViewModal(); openEditModal(viewingId); });
    if (viewOverlay)  viewOverlay.addEventListener('click', e => { if (e.target === viewOverlay) closeViewModal(); });

    // Custom pair toggle
    const pairSel = document.getElementById('tradePair');
    if (pairSel) pairSel.addEventListener('change', () => {
      const customGroup = document.getElementById('customPairGroup');
      if (customGroup) customGroup.style.display = pairSel.value === 'CUSTOM' ? 'block' : 'none';
    });
  }

  function openAddModal() {
    editingId = null;
    selectedDir = 'buy';
    setText('tradeModalTitle', 'Log New Trade');
    clearTradeForm();
    setDefaultDate();
    document.getElementById('tradeModalOverlay').classList.add('active');
  }

  function openEditModal(id) {
    const t = trades.find(t => t.id === id);
    if (!t) return;
    editingId = id;
    selectedDir = t.direction || 'buy';
    setText('tradeModalTitle', 'Edit Trade');
    fillTradeForm(t);
    document.getElementById('tradeModalOverlay').classList.add('active');
  }

  function openDeleteModal(id) {
    deleteTargetId = id;
    const t = trades.find(t => t.id === id);
    if (!t) return;
    setText('deleteTradeLabel', `${t.pair} on ${formatDate(t.date)}`);
    document.getElementById('deleteTradeModalOverlay').classList.add('active');
  }

  function closeDeleteModal() {
    deleteTargetId = null;
    document.getElementById('deleteTradeModalOverlay').classList.remove('active');
  }

  function closeViewModal() {
    viewingId = null;
    document.getElementById('viewTradeModalOverlay').classList.remove('active');
  }

  function confirmDelete() {
    if (!deleteTargetId) return;
    const t = trades.find(t => t.id === deleteTargetId);
    trades = trades.filter(t => t.id !== deleteTargetId);
    if (t) Storage.addActivity({ icon: '🗑️', text: `Deleted trade: ${t.pair}`, color: '#f87171' });
    deleteTargetId = null;
    closeDeleteModal();
    saveAndRefresh();
  }

  function closeTradeModal() {
    document.getElementById('tradeModalOverlay').classList.remove('active');
    editingId = null;
    clearTradeForm();
  }

  function saveTrade() {
    const pairSel = getVal('tradePair');
    const pair = pairSel === 'CUSTOM' ? getVal('tradeCustomPair').trim() : pairSel;
    const entry = getVal('tradeEntry');
    const pnl   = getVal('tradePnL');
    const date  = getVal('tradeDate');

    if (!pair) { shake(document.getElementById('tradePair')); return; }
    if (!entry) { shake(document.getElementById('tradeEntry')); return; }
    if (!pnl && pnl !== '0') { shake(document.getElementById('tradePnL')); return; }
    if (!date) { shake(document.getElementById('tradeDate')); return; }

    const checklist = {
      chk_monthly: document.getElementById('chk_monthly')?.checked || false,
      chk_weekly:  document.getElementById('chk_weekly')?.checked  || false,
      chk_daily:   document.getElementById('chk_daily')?.checked   || false,
      chk_h4:      document.getElementById('chk_h4')?.checked      || false,
      chk_h1:      document.getElementById('chk_h1')?.checked      || false,
      chk_m15:     document.getElementById('chk_m15')?.checked     || false,
      chk_risk:    document.getElementById('chk_risk')?.checked    || false,
      chk_news:    document.getElementById('chk_news')?.checked    || false,
    };

    const tradeData = {
      pair,
      direction:   selectedDir,
      timeframe:   getVal('tradeTF'),
      date,
      entry:       getVal('tradeEntry'),
      exit:        getVal('tradeExit'),
      sl:          getVal('tradeSL'),
      tp:          getVal('tradeTP'),
      lot:         getVal('tradeLot'),
      rr:          getVal('tradeRR'),
      pnl:         parseFloat(getVal('tradePnL')),
      session:     getVal('tradeSession'),
      emotion:     getVal('tradeEmotion'),
      mistake:     getVal('tradeMistake'),
      entryReason: getVal('tradeEntryReason').trim(),
      exitReason:  getVal('tradeExitReason').trim(),
      notes:       getVal('tradeNotes').trim(),
      screenshot:  getVal('tradeScreenshot').trim(),
      discipline:  getVal('tradeDiscipline'),
      checklist,
    };

    if (editingId) {
      const idx = trades.findIndex(t => t.id === editingId);
      if (idx !== -1) trades[idx] = { ...trades[idx], ...tradeData, updatedAt: new Date().toISOString() };
      Storage.addActivity({ icon: '✏️', text: `Edited trade: ${pair}`, color: '#a78bfa' });
    } else {
      trades.push({ id: uid(), ...tradeData, createdAt: new Date().toISOString() });
      const pnlNum = parseFloat(getVal('tradePnL'));
      Storage.addActivity({
        icon: pnlNum >= 0 ? '📈' : '📉',
        text: `Logged trade: ${pair} ${selectedDir.toUpperCase()} — ${formatPnL(pnlNum)}`,
        color: pnlNum >= 0 ? '#34d399' : '#f87171'
      });
    }

    closeTradeModal();
    saveAndRefresh();
  }

  function fillTradeForm(t) {
    setVal('tradePair',        t.pair || '');
    setVal('tradeTF',          t.timeframe || 'Daily');
    setVal('tradeDate',        t.date || '');
    setVal('tradeEntry',       t.entry || '');
    setVal('tradeExit',        t.exit || '');
    setVal('tradeSL',          t.sl || '');
    setVal('tradeTP',          t.tp || '');
    setVal('tradeLot',         t.lot || '');
    setVal('tradeRR',          t.rr || '');
    setVal('tradePnL',         t.pnl || '');
    setVal('tradeSession',     t.session || '');
    setVal('tradeEmotion',     t.emotion || '');
    setVal('tradeMistake',     t.mistake || '');
    setVal('tradeEntryReason', t.entryReason || '');
    setVal('tradeExitReason',  t.exitReason || '');
    setVal('tradeNotes',       t.notes || '');
    setVal('tradeScreenshot',  t.screenshot || '');
    setVal('tradeDiscipline',  t.discipline || 7);
    setText('tradeDisciplineVal', t.discipline || 7);

    // Direction toggle
    updateDirToggle(t.direction || 'buy');

    // Checklist
    const chk = t.checklist || {};
    ['chk_monthly','chk_weekly','chk_daily','chk_h4','chk_h1','chk_m15','chk_risk','chk_news'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.checked = chk[id] || false;
    });
  }

  function clearTradeForm() {
    ['tradeEntry','tradeExit','tradeSL','tradeTP','tradeLot','tradeRR','tradePnL',
     'tradeEntryReason','tradeExitReason','tradeNotes','tradeScreenshot','tradeCustomPair'].forEach(id => setVal(id, ''));
    setVal('tradePair', '');
    setVal('tradeTF', 'Daily');
    setVal('tradeSession', '');
    setVal('tradeEmotion', '');
    setVal('tradeMistake', '');
    setVal('tradeDiscipline', 7);
    setText('tradeDisciplineVal', 7);
    updateDirToggle('buy');
    const cg = document.getElementById('customPairGroup');
    if (cg) cg.style.display = 'none';
    ['chk_monthly','chk_weekly','chk_daily','chk_h4','chk_h1','chk_m15','chk_risk','chk_news'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.checked = false;
    });
  }

  // ---------- DIRECTION TOGGLE ----------
  function bindDirToggle() {
    document.querySelectorAll('.dir-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        selectedDir = e.currentTarget.dataset.dir;
        updateDirToggle(selectedDir);
      });
    });
  }

  function updateDirToggle(dir) {
    selectedDir = dir;
    document.querySelectorAll('.dir-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.dir === dir);
    });
  }

  // ---------- AUTO R:R CALC ----------
  function bindRRAutoCalc() {
    ['tradeEntry','tradeSL','tradeTP'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', autoCalcRR);
    });
  }

  function autoCalcRR() {
    const entry = parseFloat(getVal('tradeEntry'));
    const sl    = parseFloat(getVal('tradeSL'));
    const tp    = parseFloat(getVal('tradeTP'));
    if (entry && sl && tp) {
      const risk   = Math.abs(entry - sl);
      const reward = Math.abs(tp - entry);
      if (risk > 0) {
        const rr = (reward / risk).toFixed(2);
        setVal('tradeRR', rr);
      }
    }
  }

  // ---------- DISCIPLINE SLIDER ----------
  function bindDisciplineSlider() {
    const slider = document.getElementById('tradeDiscipline');
    const valEl  = document.getElementById('tradeDisciplineVal');
    if (slider && valEl) {
      slider.addEventListener('input', () => { valEl.textContent = slider.value; });
    }
  }

  // ---------- TABS ----------
  function bindTabEvents() {
    document.querySelectorAll('.trade-tab').forEach(btn => {
      btn.addEventListener('click', e => {
        const tab = e.currentTarget.dataset.tab;
        document.querySelectorAll('.trade-tab').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.trade-tab-content').forEach(c => c.classList.remove('active'));
        e.currentTarget.classList.add('active');
        const content = document.getElementById('tab-' + tab);
        if (content) content.classList.add('active');
        activeTab = tab;
        if (tab === 'psychology') renderPsychology();
        if (tab === 'pairs') renderPairAnalysis();
      });
    });
  }

  // ---------- FILTERS ----------
  function bindFilterEvents() {
    const filterBtn = document.getElementById('forexFilterBtn');
    if (filterBtn) filterBtn.addEventListener('click', () => {
      filterVisible = !filterVisible;
      const bar = document.getElementById('tradeFilterBar');
      if (bar) bar.style.display = filterVisible ? 'flex' : 'none';
    });

    ['filterPair','filterResult','filterTF','filterDir'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', () => {
        filters[id.replace('filter','').toLowerCase()] = el.value;
        renderTradeHistory();
      });
    });

    const clearBtn = document.getElementById('clearFiltersBtn');
    if (clearBtn) clearBtn.addEventListener('click', () => {
      filters = { pair: '', result: '', tf: '', dir: '' };
      ['filterPair','filterResult','filterTF','filterDir'].forEach(id => setVal(id, ''));
      renderTradeHistory();
    });
  }

  // ---------- HELPERS ----------
  function calcChecklistScore(t) {
    if (!t.checklist) return 0;
    const keys = ['chk_monthly','chk_weekly','chk_daily','chk_h4','chk_h1','chk_m15','chk_risk','chk_news'];
    const done = keys.filter(k => t.checklist[k]).length;
    return Math.round((done / keys.length) * 100);
  }

  function setDefaultDate() {
    const d = new Date();
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    setVal('tradeDate', key);
  }

  function formatDate(str) {
    if (!str) return '—';
    const d = new Date(str + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatPnL(pnl) {
    const n = parseFloat(pnl || 0);
    return (n >= 0 ? '+$' : '-$') + Math.abs(n).toFixed(2);
  }

  function saveAndRefresh() {
    Storage.saveTrades(trades);
    renderAll();
    if (typeof Dashboard !== 'undefined') {
      Dashboard.updateTradingSummary();
      Dashboard.renderActivity();
    }
  }

  function uid() { return 'tr_' + Date.now() + '_' + Math.random().toString(36).slice(2,7); }

  function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

  function escHtml(s) {
    if (!s && s !== 0) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
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
