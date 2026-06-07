/**
 * BACKUP MODULE
 * Complete Backup & Restore System
 * Day 6: Production — Import/Export/Portability
 */

const Backup = (() => {

  let importData    = null;
  let importMode    = 'merge';
  let importedFile  = null;

  // ---------- INIT ----------
  function init() {
    updateStorageSize();
    updateExportStats();
    renderDataOverview();
    updateLastBackupInfo();
    bindExport();
    bindImport();
    bindQuickActions();
    bindClearData();
  }

  // ---------- STORAGE SIZE ----------
  function updateStorageSize() {
    const size = Storage.getStorageSize();
    setText('storageSize', `Storage used: ${size}`);
  }

  function updateLastBackupInfo() {
    const last = Storage.get('last_backup_date');
    const el   = document.getElementById('lastBackupInfo');
    if (!el) return;
    if (last) {
      const d = new Date(last);
      el.textContent = `Last backup: ${d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })} at ${d.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' })}`;
      el.style.color = 'var(--green)';
    } else {
      el.textContent = 'No backup created yet — export one now!';
      el.style.color = 'var(--accent4)';
    }
  }

  // ---------- EXPORT STATS ----------
  function updateExportStats() {
    const el = document.getElementById('exportStats');
    if (!el) return;
    const habits      = Storage.getHabits();
    const trades      = Storage.getTrades();
    const goals       = Storage.getGoals();
    const notes       = Storage.getNotes();
    const reflections = Storage.getReflections();
    const moods       = Storage.getMoods();

    el.innerHTML = `
      <div class="export-stat"><span>${habits.length}</span> Habits</div>
      <div class="export-stat"><span>${trades.length}</span> Trades</div>
      <div class="export-stat"><span>${goals.length}</span> Goals</div>
      <div class="export-stat"><span>${notes.length}</span> Notes</div>
      <div class="export-stat"><span>${reflections.length}</span> Reflections</div>
      <div class="export-stat"><span>${moods.length}</span> Mood Logs</div>`;
  }

  // ---------- DATA OVERVIEW ----------
  function renderDataOverview() {
    const el = document.getElementById('dataOverviewGrid');
    if (!el) return;

    const habits      = Storage.getHabits();
    const trades      = Storage.getTrades();
    const goals       = Storage.getGoals();
    const notes       = Storage.getNotes();
    const reflections = Storage.getReflections();
    const moods       = Storage.getMoods();

    const today = todayKey();
    const wins  = trades.filter(t => parseFloat(t.pnl||0) > 0).length;
    const wr    = trades.length > 0 ? Math.round((wins/trades.length)*100) : 0;
    const todayHabits = habits.filter(h => (h.completions||[]).includes(today)).length;
    const netPnL = trades.reduce((s,t)=>s+parseFloat(t.pnl||0),0);
    const avgGoal = goals.length > 0 ? Math.round(goals.reduce((s,g)=>s+(g.progress||0),0)/goals.length) : 0;

    const sections = [
      {
        title: '✅ Habits',
        color: 'var(--accent)',
        items: [
          { label: 'Total habits', val: habits.length },
          { label: 'Done today', val: `${todayHabits}/${habits.length}` },
          { label: 'Best streak', val: habits.reduce((m,h)=>Math.max(m,h.longestStreak||0),0) + ' days' },
          { label: 'Total completions', val: habits.reduce((s,h)=>s+(h.completions||[]).length,0) },
        ]
      },
      {
        title: '📈 Trading',
        color: 'var(--green)',
        items: [
          { label: 'Total trades', val: trades.length },
          { label: 'Win rate', val: wr + '%' },
          { label: 'Net P&L', val: fmtPnL(netPnL) },
          { label: 'Pairs traded', val: [...new Set(trades.map(t=>t.pair))].length },
        ]
      },
      {
        title: '🎯 Goals',
        color: 'var(--accent4)',
        items: [
          { label: 'Total goals', val: goals.length },
          { label: 'Completed', val: goals.filter(g=>g.progress>=100).length },
          { label: 'Avg progress', val: avgGoal + '%' },
          { label: 'In progress', val: goals.filter(g=>g.progress>0&&g.progress<100).length },
        ]
      },
      {
        title: '📓 Notes & Journal',
        color: 'var(--accent2)',
        items: [
          { label: 'Total notes', val: notes.length },
          { label: 'Reflections', val: reflections.length },
          { label: 'Mood logs', val: moods.length },
          { label: 'Total words (notes)', val: notes.reduce((s,n)=>s+n.content.split(/\s+/).filter(Boolean).length,0).toLocaleString() },
        ]
      },
    ];

    el.innerHTML = sections.map(s => `
      <div class="data-ov-card" style="border-top:3px solid ${s.color}">
        <h4 class="data-ov-title">${s.title}</h4>
        ${s.items.map(item => `
          <div class="data-ov-row">
            <span>${item.label}</span>
            <strong>${item.val}</strong>
          </div>`).join('')}
      </div>`).join('');
  }

  // ---------- EXPORT ----------
  function bindExport() {
    document.getElementById('exportDataBtn')?.addEventListener('click', exportAll);
  }

  function exportAll() {
    const options = {
      habits:      document.getElementById('exportHabits')?.checked      ?? true,
      trades:      document.getElementById('exportTrades')?.checked      ?? true,
      goals:       document.getElementById('exportGoals')?.checked       ?? true,
      notes:       document.getElementById('exportNotes')?.checked       ?? true,
      reflections: document.getElementById('exportReflections')?.checked ?? true,
      moods:       document.getElementById('exportMoods')?.checked       ?? true,
    };

    const data = {
      version:    '1.0',
      exportDate: new Date().toISOString(),
      appName:    'Life & Trading Performance OS',
      data: {}
    };

    if (options.habits)      data.data.habits      = Storage.getHabits();
    if (options.trades)      data.data.trades      = Storage.getTrades();
    if (options.goals)       data.data.goals       = Storage.getGoals();
    if (options.notes)       data.data.notes       = Storage.getNotes();
    if (options.reflections) data.data.reflections = Storage.getReflections();
    if (options.moods)       data.data.moods       = Storage.getMoods();
    data.data.settings = { theme: Storage.getTheme() };

    downloadJSON(data, generateFilename('lifeos-backup'));

    // Record backup time
    Storage.set('last_backup_date', new Date().toISOString());
    updateLastBackupInfo();

    Storage.addActivity({ icon: '💾', text: 'Exported data backup', color: 'var(--accent)' });
    showToast('✅ Backup downloaded successfully!', 'success');
  }

  function exportPartial(key, label) {
    const getters = {
      habits:      Storage.getHabits,
      trades:      Storage.getTrades,
      notes:       Storage.getNotes,
    };
    const data = {
      version:    '1.0',
      exportDate: new Date().toISOString(),
      appName:    'Life & Trading Performance OS',
      data: { [key]: getters[key]() }
    };
    downloadJSON(data, generateFilename(`lifeos-${key}`));
    showToast(`✅ ${label} exported!`, 'success');
  }

  function downloadJSON(data, filename) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function generateFilename(base) {
    const d = new Date();
    const stamp = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}_${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}`;
    return `${base}_${stamp}.json`;
  }

  // ---------- IMPORT ----------
  function bindImport() {
    const fileInput  = document.getElementById('importFileInput');
    const dropZone   = document.getElementById('importDropZone');
    const modeBtns   = document.querySelectorAll('.imode-btn');
    const confirmBtn = document.getElementById('confirmImportBtn');

    // File input
    fileInput?.addEventListener('change', e => {
      if (e.target.files[0]) processFile(e.target.files[0]);
    });

    // Drag and drop
    dropZone?.addEventListener('dragover', e => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });
    dropZone?.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone?.addEventListener('drop', e => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith('.json')) processFile(file);
      else showToast('❌ Please drop a .json backup file', 'error');
    });

    // Mode toggle
    modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        modeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        importMode = btn.dataset.mode;
        const desc = document.getElementById('importModeDesc');
        if (desc) {
          desc.textContent = importMode === 'merge'
            ? 'Merge adds new data without removing existing entries.'
            : 'Replace All will overwrite your current data completely.';
        }
      });
    });

    // Confirm import
    confirmBtn?.addEventListener('click', performImport);
  }

  function processFile(file) {
    importedFile = file;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!parsed.version || !parsed.data) {
          showToast('❌ Invalid backup file format', 'error');
          return;
        }
        importData = parsed;
        showImportPreview(file.name, parsed);
      } catch (err) {
        showToast('❌ Could not parse file. Make sure it\'s a valid LifeOS backup.', 'error');
      }
    };
    reader.readAsText(file);
  }

  function showImportPreview(filename, data) {
    const dropZone = document.getElementById('importDropZone');
    const preview  = document.getElementById('importPreview');
    const nameEl   = document.getElementById('importFileName');
    const statsEl  = document.getElementById('importPreviewStats');

    if (dropZone) dropZone.style.display = 'none';
    if (preview)  preview.style.display  = 'block';
    if (nameEl)   nameEl.textContent = filename;

    const exportDate = data.exportDate
      ? new Date(data.exportDate).toLocaleDateString('en-US', { dateStyle: 'full' })
      : 'Unknown date';

    const d = data.data || {};
    if (statsEl) {
      statsEl.innerHTML = `
        <div class="import-preview-date">📅 Exported: ${exportDate}</div>
        <div class="import-preview-counts">
          ${d.habits      ? `<span>✅ ${d.habits.length} Habits</span>`           : ''}
          ${d.trades      ? `<span>📈 ${d.trades.length} Trades</span>`           : ''}
          ${d.goals       ? `<span>🎯 ${d.goals.length} Goals</span>`             : ''}
          ${d.notes       ? `<span>📓 ${d.notes.length} Notes</span>`             : ''}
          ${d.reflections ? `<span>💭 ${d.reflections.length} Reflections</span>` : ''}
          ${d.moods       ? `<span>😊 ${d.moods.length} Mood Logs</span>`         : ''}
        </div>`;
    }
  }

  function performImport() {
    if (!importData) return;

    const d = importData.data || importData; // support both formats

    if (importMode === 'replace') {
      // Full replace
      if (d.habits)      Storage.saveHabits(d.habits);
      if (d.trades)      Storage.saveTrades(d.trades);
      if (d.goals)       Storage.saveGoals(d.goals);
      if (d.notes)       Storage.saveNotes(d.notes);
      if (d.reflections) Storage.saveReflections(d.reflections);
      if (d.moods)       Storage.saveMoods(d.moods);
      if (d.settings?.theme) Storage.setTheme(d.settings.theme);
      showToast('✅ Data replaced successfully! Reloading...', 'success');
    } else {
      // Merge — add only new IDs
      if (d.habits)      mergeById('habits', d.habits, Storage.getHabits, Storage.saveHabits);
      if (d.trades)      mergeById('trades', d.trades, Storage.getTrades, Storage.saveTrades);
      if (d.goals)       mergeById('goals',  d.goals,  Storage.getGoals,  Storage.saveGoals);
      if (d.notes)       mergeById('notes',  d.notes,  Storage.getNotes,  Storage.saveNotes);
      if (d.reflections) mergeByDate('reflections', d.reflections, Storage.getReflections, Storage.saveReflections);
      if (d.moods)       mergeByDate('moods',       d.moods,       Storage.getMoods,       Storage.saveMoods);
      showToast('✅ Data merged successfully! Reloading...', 'success');
    }

    Storage.addActivity({ icon: '📥', text: `Imported backup (${importMode} mode)`, color: 'var(--green)' });

    setTimeout(() => {
      window.location.reload();
    }, 1500);
  }

  function mergeById(name, incoming, getter, saver) {
    const existing = getter();
    const existingIds = new Set(existing.map(x => x.id));
    const merged = [...existing, ...incoming.filter(x => !existingIds.has(x.id))];
    saver(merged);
  }

  function mergeByDate(name, incoming, getter, saver) {
    const existing = getter();
    const existingDates = new Set(existing.map(x => x.date));
    const merged = [...existing, ...incoming.filter(x => !existingDates.has(x.date))];
    saver(merged);
  }

  // ---------- QUICK ACTIONS ----------
  function bindQuickActions() {
    document.getElementById('exportHabitsOnly')?.addEventListener('click', () => exportPartial('habits', 'Habits'));
    document.getElementById('exportTradesOnly')?.addEventListener('click', () => exportPartial('trades', 'Trades'));
    document.getElementById('exportNotesOnly')?.addEventListener('click',  () => exportPartial('notes',  'Notes'));
    document.getElementById('clearAllDataBtn')?.addEventListener('click',  () => {
      document.getElementById('clearDataModalOverlay')?.classList.add('active');
    });
  }

  // ---------- CLEAR ALL DATA ----------
  function bindClearData() {
    const closeBtns = ['closeClearDataModal', 'cancelClearDataModal'];
    closeBtns.forEach(id => {
      document.getElementById(id)?.addEventListener('click', () => {
        document.getElementById('clearDataModalOverlay')?.classList.remove('active');
        setVal('clearDataConfirmInput', '');
      });
    });

    document.getElementById('clearDataModalOverlay')?.addEventListener('click', e => {
      if (e.target.id === 'clearDataModalOverlay') {
        document.getElementById('clearDataModalOverlay').classList.remove('active');
        setVal('clearDataConfirmInput', '');
      }
    });

    document.getElementById('confirmClearDataBtn')?.addEventListener('click', () => {
      const input = getVal('clearDataConfirmInput');
      if (input !== 'DELETE') {
        shake(document.getElementById('clearDataConfirmInput'));
        return;
      }
      Storage.clear();
      showToast('🗑️ All data cleared. Reloading...', 'error');
      setTimeout(() => window.location.reload(), 1500);
    });
  }

  // ---------- TOAST ----------
  function showToast(msg, type = 'success') {
    let toast = document.getElementById('saveToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'saveToast';
      toast.className = 'save-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.borderColor = type === 'error' ? 'var(--red)' : type === 'success' ? 'var(--green)' : 'var(--border)';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  }

  // ---------- HELPERS ----------
  function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function fmtPnL(n) {
    n = parseFloat(n||0);
    return (n>=0?'+$':'-$') + Math.abs(n).toFixed(2);
  }

  function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
  function getVal(id)  { const el = document.getElementById(id); return el ? el.value : ''; }
  function setVal(id, val) { const el = document.getElementById(id); if (el) el.value = val; }
  function shake(el) {
    if (!el) return;
    el.classList.add('shake');
    setTimeout(() => el.classList.remove('shake'), 400);
  }

  return { init };

})();
