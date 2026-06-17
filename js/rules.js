/**
 * TRADING RULES MODULE — SIMPLIFIED
 * Clean rules list + pre-trade checklist + break tracker
 */

const Rules = (() => {

  let rules        = [];
  let breaks       = [];
  let checklist    = [];
  let editingId    = null;
  let deleteTarget = null;
  let activeCat    = 'all';

  const CAT_CONFIG = {
    entry:      { emoji:'📈', color:'#3b82f6', label:'Entry'     },
    exit:       { emoji:'📉', color:'#ef4444', label:'Exit'      },
    risk:       { emoji:'⚖️', color:'#f59e0b', label:'Risk'      },
    psychology: { emoji:'🧠', color:'#8b5cf6', label:'Mind'      },
    general:    { emoji:'⚡', color:'#10b981', label:'General'   },
  };

  const PRIORITY_COLOR = { critical:'#ef4444', high:'#f59e0b', medium:'#10b981' };

  const DEFAULT_CHECKLIST = [
    { id:'cl1', text:'HTF trend confirmed?',           checked:false },
    { id:'cl2', text:'Valid S&R level?',               checked:false },
    { id:'cl3', text:'Stop Loss clearly defined?',     checked:false },
    { id:'cl4', text:'Risk max 1-2% of account?',      checked:false },
    { id:'cl5', text:'No big news in next 30 mins?',   checked:false },
    { id:'cl6', text:'Entry signal confirmed?',        checked:false },
    { id:'cl7', text:'R:R minimum 1:2?',               checked:false },
    { id:'cl8', text:'Am I calm and focused?',         checked:false },
  ];

  // ---------- INIT ----------
  function init() {
    rules     = Storage.get('trading_rules', []);
    breaks    = Storage.get('rule_breaks', []);
    checklist = Storage.get('pretrade_checklist', null) || DEFAULT_CHECKLIST.map(i=>({...i}));
    bindModalEvents();
    bindCategoryPills();
    renderAll();
  }

  // ---------- RENDER ALL ----------
  function renderAll() {
    updateStats();
    renderRulesList();
    renderChecklist();
    renderBreaksHistory();
  }

  // ---------- STATS ----------
  function updateStats() {
    const total     = rules.length;
    const totalBreaks = breaks.length;
    const days30 = getDays30();
    const daysWithBreaks = new Set(breaks.filter(b=>days30.includes(b.date)).map(b=>b.date)).size;
    const discRate = Math.round(((30 - daysWithBreaks) / 30) * 100);

    setText('rs_total',      total);
    setText('rs_breaks',     totalBreaks);
    setText('rs_discipline', discRate + '%');

    const discEl = document.getElementById('rs_discipline');
    if (discEl) {
      discEl.className = 'srs-val ' + (discRate >= 90 ? 'color-green' : discRate >= 70 ? 'color-blue' : 'color-red');
    }
  }

  // ---------- RULES LIST ----------
  function renderRulesList() {
    const list    = document.getElementById('rulesList');
    const emptyEl = document.getElementById('rulesEmpty');
    if (!list) return;

    let filtered = activeCat === 'all' ? rules : rules.filter(r => r.category === activeCat);

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

    // Sort critical first
    const order = { critical:0, high:1, medium:2 };
    filtered.sort((a,b) => (order[a.priority]||2) - (order[b.priority]||2));

    list.innerHTML = filtered.map(r => renderRuleCard(r)).join('');
    bindRuleCardEvents();
  }

  function renderRuleCard(r) {
    const cfg   = CAT_CONFIG[r.category] || { emoji:'⚡', color:'#10b981', label:'General' };
    const pColor = PRIORITY_COLOR[r.priority] || '#10b981';
    const ruleBreaks = breaks.filter(b => b.ruleId === r.id).length;
    const isActive   = r.active !== false;

    return `
    <div class="simple-rule-card ${!isActive ? 'rule-inactive' : ''}" data-id="${r.id}">
      <div class="src-left" style="background:${cfg.color}18">
        <span class="src-emoji">${cfg.emoji}</span>
      </div>
      <div class="src-body">
        <div class="src-top">
          <div class="src-tags">
            <span class="src-cat" style="color:${cfg.color}">${cfg.label}</span>
            <span class="src-priority" style="color:${pColor};background:${pColor}18">${capitalize(r.priority)}</span>
            ${ruleBreaks > 0
              ? `<span class="src-breaks">⚠️ ${ruleBreaks}x broken</span>`
              : `<span class="src-clean">✅ Never broken</span>`}
          </div>
          <div class="src-actions">
            <button class="icon-btn" data-action="edit-rule" data-id="${r.id}" title="Edit">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="icon-btn danger" data-action="delete-rule" data-id="${r.id}" title="Delete">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
            </button>
          </div>
        </div>
        <p class="src-title">${escHtml(r.title)}</p>
        ${r.desc ? `<p class="src-desc">${escHtml(r.desc)}</p>` : ''}
        ${r.consequence ? `<p class="src-consequence">⚡ If broken: ${escHtml(r.consequence)}</p>` : ''}
      </div>
    </div>`;
  }

  function bindRuleCardEvents() {
    document.querySelectorAll('[data-action="edit-rule"]').forEach(btn =>
      btn.addEventListener('click', e => openEditRuleModal(e.currentTarget.dataset.id)));
    document.querySelectorAll('[data-action="delete-rule"]').forEach(btn =>
      btn.addEventListener('click', e => openDeleteRuleModal(e.currentTarget.dataset.id)));
  }

  // ---------- CHECKLIST ----------
  function renderChecklist() {
    const list = document.getElementById('pretradeList');
    if (!list) return;

    list.innerHTML = checklist.map((item, idx) => `
      <label class="pretrade-item ${item.checked ? 'pretrade-checked' : ''}">
        <input type="checkbox" ${item.checked ? 'checked' : ''} data-idx="${idx}" class="pretrade-checkbox"/>
        <span class="check-box-new">
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><polyline points="2 6 5 9 10 3"/></svg>
        </span>
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
        checklist[parseInt(e.target.dataset.idx)].checked = e.target.checked;
        Storage.set('pretrade_checklist', checklist);
        renderChecklist();
      });
    });
    document.querySelectorAll('[data-action="del-checklist"]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        checklist.splice(parseInt(e.currentTarget.dataset.idx), 1);
        Storage.set('pretrade_checklist', checklist);
        renderChecklist();
      });
    });
  }

  function updatePretradeProgress() {
    const total   = checklist.length;
    const checked = checklist.filter(i => i.checked).length;
    const pct     = total > 0 ? Math.round((checked/total)*100) : 0;

    const fill  = document.getElementById('pretradeProgressFill');
    const pctEl = document.getElementById('pretradeProgressPct');
    const result= document.getElementById('pretradeResult');
    const icon  = document.getElementById('ptrIcon');
    const text  = document.getElementById('ptrText');

    if (fill)  { fill.style.width = pct+'%'; fill.style.background = pct===100?'var(--green)':'linear-gradient(90deg,var(--accent),var(--accent2))'; }
    if (pctEl) pctEl.textContent = pct+'%';

    if (result) {
      if (pct===100) {
        result.style.display='flex'; result.className='pretrade-result ptr-pass';
        if (icon) icon.textContent='✅';
        if (text) text.textContent='All checks passed! You may enter the trade.';
      } else if (pct>=70) {
        result.style.display='flex'; result.className='pretrade-result ptr-warn';
        if (icon) icon.textContent='⚠️';
        if (text) text.textContent=`${total-checked} check(s) remaining. Review before trading.`;
      } else {
        result.style.display='none';
      }
    }
  }

  // ---------- BREAKS HISTORY ----------
  function renderBreaksHistory() {
    const histEl  = document.getElementById('breaksHistory');
    const list    = document.getElementById('breaksList');
    if (!list || !histEl) return;

    if (breaks.length === 0) { histEl.style.display='none'; return; }
    histEl.style.display = 'block';

    const sorted = [...breaks].sort((a,b)=>new Date(b.date)-new Date(a.date));
    list.innerHTML = sorted.slice(0,5).map(b => {
      const rule = rules.find(r=>r.id===b.ruleId);
      const cfg  = rule ? (CAT_CONFIG[rule.category]||{emoji:'⚠️',color:'#ef4444'}) : {emoji:'⚠️',color:'#ef4444'};
      return `
        <div class="break-item">
          <div class="break-item-icon" style="background:${cfg.color}18;color:${cfg.color}">${cfg.emoji}</div>
          <div class="break-item-body">
            <div class="break-item-rule">${escHtml(b.ruleName||'Unknown Rule')}</div>
            <div class="break-item-date">${formatDate(b.date)}</div>
            ${b.lesson ? `<p class="break-item-lesson">💡 ${escHtml(b.lesson)}</p>` : ''}
          </div>
          <button class="icon-btn danger" data-action="del-break" data-id="${b.id}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>`;
    }).join('');

    document.querySelectorAll('[data-action="del-break"]').forEach(btn => {
      btn.addEventListener('click', e => {
        breaks = breaks.filter(b=>b.id!==e.currentTarget.dataset.id);
        Storage.set('rule_breaks', breaks);
        renderAll();
      });
    });
  }

  // ---------- MODAL EVENTS ----------
  function bindModalEvents() {
    document.getElementById('openAddRuleModal')?.addEventListener('click', openAddRuleModal);
    ['closeRuleModal','cancelRuleModal'].forEach(id => document.getElementById(id)?.addEventListener('click', closeRuleModal));
    document.getElementById('ruleModalOverlay')?.addEventListener('click', e => { if(e.target.id==='ruleModalOverlay') closeRuleModal(); });
    document.getElementById('saveRuleBtn')?.addEventListener('click', saveRule);

    document.getElementById('closeDeleteRuleModal')?.addEventListener('click', closeDeleteRuleModal);
    document.getElementById('cancelDeleteRuleModal')?.addEventListener('click', closeDeleteRuleModal);
    document.getElementById('confirmDeleteRuleBtn')?.addEventListener('click', confirmDeleteRule);
    document.getElementById('deleteRuleModalOverlay')?.addEventListener('click', e => { if(e.target.id==='deleteRuleModalOverlay') closeDeleteRuleModal(); });

    document.getElementById('openRuleBreakModal')?.addEventListener('click', openRuleBreakModal);
    ['closeRuleBreakModal','cancelRuleBreakModal'].forEach(id => document.getElementById(id)?.addEventListener('click', closeRuleBreakModal));
    document.getElementById('ruleBreakModalOverlay')?.addEventListener('click', e => { if(e.target.id==='ruleBreakModalOverlay') closeRuleBreakModal(); });
    document.getElementById('saveRuleBreakBtn')?.addEventListener('click', saveRuleBreak);

    document.getElementById('addChecklistItemBtn')?.addEventListener('click', () => {
      document.getElementById('checklistItemModalOverlay')?.classList.add('active');
      setTimeout(()=>document.getElementById('checklistItemText')?.focus(),100);
    });
    ['closeChecklistItemModal','cancelChecklistItemModal'].forEach(id => {
      document.getElementById(id)?.addEventListener('click', () => {
        document.getElementById('checklistItemModalOverlay')?.classList.remove('active');
        setVal('checklistItemText','');
      });
    });
    document.getElementById('saveChecklistItemBtn')?.addEventListener('click', addChecklistItem);
    document.getElementById('checklistItemText')?.addEventListener('keydown', e => { if(e.key==='Enter') addChecklistItem(); });

    document.getElementById('resetChecklistBtn')?.addEventListener('click', () => {
      checklist = checklist.map(i=>({...i,checked:false}));
      Storage.set('pretrade_checklist', checklist);
      renderChecklist();
    });

    document.getElementById('ruleTitle')?.addEventListener('keydown', e => { if(e.key==='Enter') saveRule(); });
  }

  function openAddRuleModal() {
    editingId = null;
    setText('ruleModalTitle','Add Trading Rule');
    ['ruleTitle','ruleDesc','ruleConsequence'].forEach(id=>setVal(id,''));
    setVal('ruleCategory','entry'); setVal('rulePriority','medium');
    document.getElementById('ruleModalOverlay')?.classList.add('active');
    setTimeout(()=>document.getElementById('ruleTitle')?.focus(),100);
  }

  function openEditRuleModal(id) {
    const r = rules.find(r=>r.id===id); if(!r) return;
    editingId = id;
    setText('ruleModalTitle','Edit Rule');
    setVal('ruleTitle',r.title); setVal('ruleCategory',r.category);
    setVal('rulePriority',r.priority); setVal('ruleDesc',r.desc||'');
    setVal('ruleConsequence',r.consequence||'');
    document.getElementById('ruleModalOverlay')?.classList.add('active');
  }

  function closeRuleModal() {
    editingId=null;
    document.getElementById('ruleModalOverlay')?.classList.remove('active');
  }

  function saveRule() {
    const title=getVal('ruleTitle').trim();
    if(!title){shake(document.getElementById('ruleTitle'));return;}
    const data={title,category:getVal('ruleCategory'),priority:getVal('rulePriority'),desc:getVal('ruleDesc').trim(),consequence:getVal('ruleConsequence').trim(),active:true};
    if(editingId){
      const idx=rules.findIndex(r=>r.id===editingId);
      if(idx!==-1) rules[idx]={...rules[idx],...data};
    } else {
      rules.push({id:uid(),...data,createdAt:new Date().toISOString()});
      Storage.addActivity({icon:'📋',text:`Added rule: ${title}`,color:'#3b82f6'});
    }
    closeRuleModal();
    saveAndRefresh();
  }

  function openDeleteRuleModal(id) {
    deleteTarget=id;
    const r=rules.find(r=>r.id===id);
    if(r) setText('deleteRuleName',r.title);
    document.getElementById('deleteRuleModalOverlay')?.classList.add('active');
  }

  function closeDeleteRuleModal() {
    deleteTarget=null;
    document.getElementById('deleteRuleModalOverlay')?.classList.remove('active');
  }

  function confirmDeleteRule() {
    if(!deleteTarget) return;
    rules=rules.filter(r=>r.id!==deleteTarget);
    deleteTarget=null;
    closeDeleteRuleModal();
    saveAndRefresh();
  }

  function openRuleBreakModal() {
    const sel=document.getElementById('breakRuleSelect');
    if(sel) sel.innerHTML='<option value="">Select a rule...</option>'+rules.map(r=>`<option value="${r.id}">${escHtml(r.title)}</option>`).join('');
    setVal('breakDate',dateKey(new Date()));
    ['breakDescription','breakEmotion','breakLesson'].forEach(id=>setVal(id,''));
    document.getElementById('ruleBreakModalOverlay')?.classList.add('active');
  }

  function closeRuleBreakModal() {
    document.getElementById('ruleBreakModalOverlay')?.classList.remove('active');
  }

  function saveRuleBreak() {
    const ruleId=getVal('breakRuleSelect');
    if(!ruleId){shake(document.getElementById('breakRuleSelect'));return;}
    const rule=rules.find(r=>r.id===ruleId);
    const entry={id:uid(),ruleId,ruleName:rule?rule.title:'Unknown',date:getVal('breakDate')||dateKey(new Date()),description:getVal('breakDescription').trim(),emotion:getVal('breakEmotion'),lesson:getVal('breakLesson').trim(),createdAt:new Date().toISOString()};
    breaks.push(entry);
    Storage.set('rule_breaks',breaks);
    Storage.addActivity({icon:'⚠️',text:`Rule break: ${entry.ruleName}`,color:'#ef4444'});
    closeRuleBreakModal();
    renderAll();
    showToast('⚠️ Rule break logged. Learn from it!');
  }

  function addChecklistItem() {
    const text=getVal('checklistItemText').trim();
    if(!text){shake(document.getElementById('checklistItemText'));return;}
    checklist.push({id:uid(),text,checked:false});
    Storage.set('pretrade_checklist',checklist);
    document.getElementById('checklistItemModalOverlay')?.classList.remove('active');
    setVal('checklistItemText','');
    renderChecklist();
  }

  // ---------- CATEGORY PILLS ----------
  function bindCategoryPills() {
    document.querySelectorAll('[data-rcat]').forEach(btn => {
      btn.addEventListener('click', e => {
        document.querySelectorAll('[data-rcat]').forEach(b=>b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        activeCat = e.currentTarget.dataset.rcat;
        renderRulesList();
      });
    });
  }

  // ---------- HELPERS ----------
  function saveAndRefresh() { Storage.set('trading_rules',rules); renderAll(); }

  function getDays30() {
    const days=[],today=new Date();
    for(let i=0;i<30;i++){const d=new Date(today);d.setDate(today.getDate()-i);days.push(dateKey(d));}
    return days;
  }

  function showToast(msg) {
    let t=document.getElementById('saveToast');
    if(!t){t=document.createElement('div');t.id='saveToast';t.className='save-toast';document.body.appendChild(t);}
    t.textContent=msg; t.classList.add('show');
    setTimeout(()=>t.classList.remove('show'),2500);
  }

  function dateKey(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
  function formatDate(s) { if(!s)return''; const d=new Date(s+'T00:00:00'); return d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}); }
  function uid()        { return 'r_'+Date.now()+'_'+Math.random().toString(36).slice(2,7); }
  function capitalize(s){ return s?s.charAt(0).toUpperCase()+s.slice(1):''; }
  function escHtml(s)   { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function setText(id,v){ const e=document.getElementById(id);if(e)e.textContent=v; }
  function getVal(id)   { const e=document.getElementById(id);return e?e.value:''; }
  function setVal(id,v) { const e=document.getElementById(id);if(e)e.value=v; }
  function shake(el)    { if(!el)return;el.classList.add('shake');setTimeout(()=>el.classList.remove('shake'),400); }

  return { init };
})();
