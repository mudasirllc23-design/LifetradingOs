/**
 * REPORTS MODULE
 * Daily / Weekly / Monthly / Yearly Reports
 * Day 5: Reports System
 */

const Reports = (() => {

  // ---------- INIT ----------
  function init() {
    document.getElementById('generateReportBtn')?.addEventListener('click', generateReport);
    document.getElementById('printReportBtn')?.addEventListener('click', printReport);
    document.getElementById('reportPeriod')?.addEventListener('change', () => {
      // Clear output when period changes
      const out = document.getElementById('reportOutput');
      if (out) out.innerHTML = `<div class="report-prompt"><span>📋</span><p>Select a period and click <strong>Generate</strong> to build your report.</p></div>`;
    });
  }

  // ---------- GENERATE ----------
  function generateReport() {
    const period = document.getElementById('reportPeriod')?.value || 'weekly';
    const out    = document.getElementById('reportOutput');
    if (!out) return;

    out.innerHTML = '<div class="report-loading">⏳ Generating report...</div>';

    setTimeout(() => {
      const html = buildReport(period);
      out.innerHTML = html;
    }, 200);
  }

  function buildReport(period) {
    const { startDate, endDate, label, days } = getPeriodRange(period);
    const habits  = Storage.getHabits();
    const trades  = Storage.getTrades();
    const goals   = Storage.getGoals();
    const moods   = Storage.getMoods();
    const refs    = Storage.getReflections();
    const notes   = Storage.getNotes();

    // ---- HABIT METRICS ----
    let habitDone = 0, habitTotal = 0;
    days.forEach(k => {
      habitTotal += habits.length;
      habitDone  += habits.filter(h => (h.completions||[]).includes(k)).length;
    });
    const habitRate = habitTotal > 0 ? Math.round((habitDone/habitTotal)*100) : 0;
    const bestStreak = habits.reduce((m,h)=>Math.max(m,h.longestStreak||0),0);

    // ---- TRADE METRICS ----
    const periodTrades = trades.filter(t => t.date >= startDate && t.date <= endDate);
    const netPnL   = periodTrades.reduce((s,t)=>s+parseFloat(t.pnl||0),0);
    const trWins   = periodTrades.filter(t=>parseFloat(t.pnl||0)>0).length;
    const trLosses = periodTrades.filter(t=>parseFloat(t.pnl||0)<0).length;
    const winRate  = periodTrades.length > 0 ? Math.round((trWins/periodTrades.length)*100) : 0;
    const rrVals   = periodTrades.filter(t=>t.rr).map(t=>parseFloat(t.rr));
    const avgRR    = rrVals.length > 0 ? (rrVals.reduce((a,b)=>a+b,0)/rrVals.length).toFixed(2) : '—';

    // Mistakes
    const mistakeMap = {};
    periodTrades.forEach(t => {
      if (t.mistake && t.mistake !== 'None' && t.mistake !== '') {
        mistakeMap[t.mistake] = (mistakeMap[t.mistake]||0)+1;
      }
    });
    const topMistakes = Object.entries(mistakeMap).sort((a,b)=>b[1]-a[1]).slice(0,3);

    // ---- MOOD METRICS ----
    const periodMoods = moods.filter(m => m.date >= startDate && m.date <= endDate);
    const avgMood = periodMoods.length > 0
      ? (periodMoods.reduce((s,m)=>s+m.mood,0)/periodMoods.length).toFixed(1) : '—';
    const avgEnergy = periodMoods.length > 0
      ? (periodMoods.reduce((s,m)=>s+(m.energy||5),0)/periodMoods.length).toFixed(1) : '—';
    const totalSleep  = periodMoods.reduce((s,m)=>s+(m.sleep||0),0).toFixed(1);
    const totalWater  = periodMoods.reduce((s,m)=>s+(m.water||0),0);
    const totalExercise = periodMoods.reduce((s,m)=>s+(m.exercise||0),0);
    const totalStudy  = periodMoods.reduce((s,m)=>s+(m.study||0),0).toFixed(1);

    // ---- GOAL METRICS ----
    const activeGoals    = goals.filter(g => g.progress > 0 && g.progress < 100).length;
    const completedGoals = goals.filter(g => g.progress >= 100).length;
    const avgGoalProg    = goals.length > 0 ? Math.round(goals.reduce((s,g)=>s+(g.progress||0),0)/goals.length) : 0;

    // ---- REFLECTIONS ----
    const periodRefs = refs.filter(r => r.date >= startDate && r.date <= endDate);

    // ---- NOTES ----
    const periodNotes = notes.filter(n => {
      const d = new Date(n.createdAt).toISOString().slice(0,10);
      return d >= startDate && d <= endDate;
    });

    // ---- TOP HABIT ----
    const topHabit = habits.reduce((best, h) => {
      const done = days.filter(k => (h.completions||[]).includes(k)).length;
      return done > (best.done||0) ? { name: h.name, done } : best;
    }, {});

    // ---- DISCIPLINE SCORE ----
    const withDisc = periodTrades.filter(t=>t.discipline);
    const avgDisc  = withDisc.length > 0
      ? Math.round(withDisc.reduce((s,t)=>s+parseInt(t.discipline||5),0)/withDisc.length * 10) : 0;

    const generatedAt = new Date().toLocaleString('en-US', { dateStyle:'full', timeStyle:'short' });

    return `
    <div class="report-doc" id="reportDoc">

      <!-- REPORT HEADER -->
      <div class="report-header-section">
        <div class="report-logo">
          <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
            <rect x="2" y="2" width="10" height="10" rx="2" fill="var(--accent)"/>
            <rect x="16" y="2" width="10" height="10" rx="2" fill="var(--accent2)" opacity="0.7"/>
            <rect x="2" y="16" width="10" height="10" rx="2" fill="var(--accent2)" opacity="0.7"/>
            <rect x="16" y="16" width="10" height="10" rx="2" fill="var(--accent)"/>
          </svg>
          <span>Life &amp; Trading Performance OS</span>
        </div>
        <h2 class="report-title">${label}</h2>
        <p class="report-period-range">${formatDate(startDate)} — ${formatDate(endDate)}</p>
        <p class="report-generated">Generated: ${generatedAt}</p>
      </div>

      <!-- EXECUTIVE SUMMARY -->
      <div class="report-section">
        <h3 class="report-section-title">📊 Executive Summary</h3>
        <div class="report-summary-grid">
          ${summaryCard('Habit Rate',    habitRate + '%',     habitRate >= 70 ? '✅' : '⚠️', habitRate >= 70 ? 'var(--green)' : 'var(--accent4)')}
          ${summaryCard('Win Rate',      winRate + '%',       winRate >= 50 ? '✅' : '⚠️',  winRate >= 50 ? 'var(--green)' : 'var(--red)')}
          ${summaryCard('Net P&L',       fmtPnL(netPnL),      netPnL >= 0 ? '📈' : '📉',    netPnL >= 0 ? 'var(--green)' : 'var(--red)')}
          ${summaryCard('Goal Progress', avgGoalProg + '%',   avgGoalProg >= 50 ? '🎯' : '🔄', 'var(--accent4)')}
          ${summaryCard('Avg Mood',      avgMood + '/5',      '😊', 'var(--accent5)')}
          ${summaryCard('Study Hours',   totalStudy + 'h',   '📚', 'var(--accent2)')}
        </div>
      </div>

      <!-- HABIT SECTION -->
      <div class="report-section">
        <h3 class="report-section-title">✅ Habit Performance</h3>
        <div class="report-two-col">
          <div>
            <div class="report-metric-row"><span>Completion Rate</span><strong style="color:${habitRate>=70?'var(--green)':'var(--accent4)'}">${habitRate}%</strong></div>
            <div class="report-metric-row"><span>Days Tracked</span><strong>${days.length}</strong></div>
            <div class="report-metric-row"><span>Total Habits</span><strong>${habits.length}</strong></div>
            <div class="report-metric-row"><span>Best Streak (ever)</span><strong>${bestStreak} days</strong></div>
            ${topHabit.name ? `<div class="report-metric-row"><span>Top Habit</span><strong>${escHtml(topHabit.name)} (${topHabit.done}/${days.length}d)</strong></div>` : ''}
          </div>
          <div>
            <div class="report-bar-list">
              ${habits.slice(0,6).map(h => {
                const done = days.filter(k => (h.completions||[]).includes(k)).length;
                const pct  = days.length > 0 ? Math.round((done/days.length)*100) : 0;
                return `<div class="report-bar-item">
                  <div class="report-bar-label"><span>${escHtml(h.name.slice(0,24))}</span><span>${pct}%</span></div>
                  <div class="report-mini-bar"><div class="report-mini-fill" style="width:${pct}%;background:${h.color||'var(--accent)'}"></div></div>
                </div>`;
              }).join('')}
            </div>
          </div>
        </div>
      </div>

      <!-- TRADING SECTION -->
      <div class="report-section">
        <h3 class="report-section-title">📈 Trading Performance</h3>
        <div class="report-two-col">
          <div>
            <div class="report-metric-row"><span>Total Trades</span><strong>${periodTrades.length}</strong></div>
            <div class="report-metric-row"><span>Wins / Losses</span><strong><span style="color:var(--green)">${trWins}W</span> / <span style="color:var(--red)">${trLosses}L</span></strong></div>
            <div class="report-metric-row"><span>Win Rate</span><strong style="color:${winRate>=50?'var(--green)':'var(--red)'}">${winRate}%</strong></div>
            <div class="report-metric-row"><span>Net P&amp;L</span><strong style="color:${netPnL>=0?'var(--green)':'var(--red)'}">${fmtPnL(netPnL)}</strong></div>
            <div class="report-metric-row"><span>Avg R:R</span><strong>1:${avgRR}</strong></div>
            <div class="report-metric-row"><span>Avg Discipline</span><strong>${avgDisc > 0 ? avgDisc + '%' : '—'}</strong></div>
          </div>
          <div>
            ${topMistakes.length > 0 ? `
              <p class="report-subsection-title">⚠️ Top Mistakes</p>
              ${topMistakes.map(([m, c]) => `
                <div class="report-bar-item">
                  <div class="report-bar-label"><span>${escHtml(m)}</span><span>${c}x</span></div>
                  <div class="report-mini-bar"><div class="report-mini-fill" style="width:${Math.round(c/periodTrades.length*100)}%;background:var(--red)"></div></div>
                </div>`).join('')}` : '<p class="report-green-note">✅ No major mistakes recorded!</p>'}

            ${periodTrades.length > 0 ? `
              <p class="report-subsection-title" style="margin-top:14px">Recent Trades</p>
              <div class="report-trade-list">
                ${periodTrades.slice(-5).reverse().map(t => {
                  const pnl = parseFloat(t.pnl||0);
                  return `<div class="report-trade-row">
                    <span class="rt-pair">${escHtml(t.pair)}</span>
                    <span class="rt-dir ${t.direction}">${t.direction==='buy'?'↑':'↓'}</span>
                    <span class="rt-pnl ${pnl>=0?'green':'red'}">${fmtPnL(pnl)}</span>
                    <span class="rt-date">${shortDate(t.date)}</span>
                  </div>`;
                }).join('')}
              </div>` : ''}
          </div>
        </div>
      </div>

      <!-- GOALS SECTION -->
      <div class="report-section">
        <h3 class="report-section-title">🎯 Goals Progress</h3>
        <div class="report-two-col">
          <div>
            <div class="report-metric-row"><span>Total Goals</span><strong>${goals.length}</strong></div>
            <div class="report-metric-row"><span>Completed</span><strong style="color:var(--green)">${completedGoals}</strong></div>
            <div class="report-metric-row"><span>In Progress</span><strong style="color:var(--accent)">${activeGoals}</strong></div>
            <div class="report-metric-row"><span>Avg Progress</span><strong>${avgGoalProg}%</strong></div>
          </div>
          <div class="report-bar-list">
            ${goals.slice(0,5).map(g => {
              const prog = Math.min(100, g.progress||0);
              const TYPE_COLOR = { trading:'#4f9eff', study:'#a78bfa', health:'#34d399', personal:'#fb923c', finance:'#fbbf24' };
              const color = TYPE_COLOR[g.type] || 'var(--accent)';
              return `<div class="report-bar-item">
                <div class="report-bar-label"><span>${escHtml(g.title.slice(0,28))}${g.title.length>28?'…':''}</span><span>${prog}%</span></div>
                <div class="report-mini-bar"><div class="report-mini-fill" style="width:${prog}%;background:${color}"></div></div>
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>

      <!-- HEALTH & MOOD -->
      <div class="report-section">
        <h3 class="report-section-title">😊 Health &amp; Mood</h3>
        <div class="report-summary-grid" style="grid-template-columns:repeat(4,1fr)">
          ${summaryCard('Avg Mood',    avgMood+'/5',          '😊', 'var(--accent5)')}
          ${summaryCard('Avg Energy',  avgEnergy+'/10',       '⚡', 'var(--accent)')}
          ${summaryCard('Total Sleep', totalSleep+'h',        '😴', 'var(--accent2)')}
          ${summaryCard('Water',       totalWater+' glasses', '💧', 'var(--accent)')}
          ${summaryCard('Exercise',    totalExercise+'min',   '🏃', 'var(--green)')}
          ${summaryCard('Study',       totalStudy+'h',        '📚', 'var(--accent4)')}
          ${summaryCard('Mood Logs',   periodMoods.length+'',  '📝', 'var(--text2)')}
          ${summaryCard('Reflections', periodRefs.length+'',  '💭', 'var(--accent2)')}
        </div>
      </div>

      <!-- REFLECTIONS SECTION -->
      ${periodRefs.length > 0 ? `
      <div class="report-section">
        <h3 class="report-section-title">💭 Reflections Snapshot</h3>
        <div class="report-reflections">
          ${periodRefs.slice(0, 3).map(r => `
            <div class="report-ref-item">
              <div class="report-ref-date">${formatDate(r.date)}</div>
              ${r.wentWell   ? `<div class="report-ref-line"><span class="rrl-label">✅</span>${escHtml(r.wentWell.slice(0,100))}${r.wentWell.length>100?'…':''}</div>`   : ''}
              ${r.lessons    ? `<div class="report-ref-line"><span class="rrl-label">💡</span>${escHtml(r.lessons.slice(0,100))}${r.lessons.length>100?'…':''}</div>`    : ''}
              ${r.wentWrong  ? `<div class="report-ref-line"><span class="rrl-label">⚠️</span>${escHtml(r.wentWrong.slice(0,100))}${r.wentWrong.length>100?'…':''}</div>` : ''}
            </div>`).join('')}
        </div>
      </div>` : ''}

      <!-- NOTES CREATED -->
      ${periodNotes.length > 0 ? `
      <div class="report-section">
        <h3 class="report-section-title">📓 Notes Created (${periodNotes.length})</h3>
        <div class="report-notes-list">
          ${periodNotes.slice(0,5).map(n => `
            <div class="report-note-item">
              <span class="rni-cat">${n.category}</span>
              <span class="rni-title">${escHtml(n.title)}</span>
              <span class="rni-words">${n.content.split(/\s+/).filter(Boolean).length} words</span>
            </div>`).join('')}
        </div>
      </div>` : ''}

      <!-- IMPROVEMENT AREAS -->
      <div class="report-section">
        <h3 class="report-section-title">🚀 Key Insights &amp; Next Steps</h3>
        <div class="report-insights">
          ${habitRate < 70  ? insight('warning', 'Habit consistency is below 70%. Focus on building a stronger daily routine.') : insight('success', 'Great habit consistency! Keep maintaining this level of discipline.')}
          ${winRate < 50 && periodTrades.length > 0 ? insight('warning', `Win rate is ${winRate}%. Review your entry criteria and risk management strategy.`) : periodTrades.length > 0 ? insight('success', `Win rate is strong at ${winRate}%. Your trading strategy is working.`) : insight('info', 'No trades this period. Stay patient and wait for A+ setups.')}
          ${netPnL < 0 && periodTrades.length > 0 ? insight('warning', `Net loss of ${fmtPnL(netPnL)}. Review losing trades and identify patterns.`) : ''}
          ${topMistakes.length > 0 ? insight('warning', `Top trading mistake: "${topMistakes[0][0]}" (${topMistakes[0][1]}x). Create a rule to eliminate this.`) : periodTrades.length > 0 ? insight('success', 'No repeated mistakes recorded. Excellent mental discipline!') : ''}
          ${avgGoalProg < 30 ? insight('warning', 'Goal progress is low. Break goals into smaller daily actions.') : insight('success', `Goals progressing well at ${avgGoalProg}% average.`)}
          ${parseFloat(avgMood) < 3 ? insight('warning', 'Average mood is low. Prioritise sleep, exercise and stress management.') : ''}
          ${parseFloat(totalStudy) < 5 && period !== 'daily' ? insight('info', `Study hours: ${totalStudy}h. Aim for at least 1 hour of focused learning daily.`) : ''}
        </div>
      </div>

      <div class="report-footer">
        <p>Life &amp; Trading Performance OS — Confidential Report</p>
        <p>${generatedAt}</p>
      </div>
    </div>`;
  }

  // ---------- HELPERS ----------
  function getPeriodRange(period) {
    const today = new Date();
    const endDate = dateKey(today);
    let startDate, label;
    const days = [];

    if (period === 'daily') {
      startDate = endDate;
      label = 'Daily Report — ' + today.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' });
    } else if (period === 'weekly') {
      const start = new Date(today);
      start.setDate(today.getDate() - 6);
      startDate = dateKey(start);
      label = 'Weekly Report';
    } else if (period === 'monthly') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      startDate = dateKey(start);
      label = 'Monthly Report — ' + today.toLocaleDateString('en-US', { month:'long', year:'numeric' });
    } else {
      const start = new Date(today.getFullYear(), 0, 1);
      startDate = dateKey(start);
      label = 'Yearly Report — ' + today.getFullYear();
    }

    const s = new Date(startDate + 'T00:00:00');
    const e = new Date(endDate  + 'T00:00:00');
    for (let d = new Date(s); d <= e; d.setDate(d.getDate()+1)) {
      days.push(dateKey(new Date(d)));
    }

    if (!label.includes('—')) label += ` — ${formatDate(startDate)} to ${formatDate(endDate)}`;

    return { startDate, endDate, label, days };
  }

  function summaryCard(label, value, icon, color) {
    return `<div class="report-summary-card">
      <div class="rsc-icon">${icon}</div>
      <div class="rsc-val" style="color:${color}">${value}</div>
      <div class="rsc-label">${label}</div>
    </div>`;
  }

  function insight(type, text) {
    const icon  = { success:'✅', warning:'⚠️', info:'💡' }[type] || '•';
    const color = { success:'var(--green)', warning:'var(--accent4)', info:'var(--accent)' }[type];
    return `<div class="report-insight ${type}">
      <span class="ri-icon">${icon}</span>
      <span style="color:${color}">${text}</span>
    </div>`;
  }

  function printReport() {
    const doc = document.getElementById('reportDoc');
    if (!doc) { alert('Generate a report first!'); return; }
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><title>LifeOS Report</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 30px; color: #1a1d2e; }
      .report-header-section { text-align:center; margin-bottom:30px; border-bottom:2px solid #eee; padding-bottom:20px; }
      .report-title { font-size:22px; font-weight:700; margin:8px 0; }
      .report-section { margin:20px 0; page-break-inside:avoid; }
      .report-section-title { font-size:15px; font-weight:700; margin-bottom:12px; border-bottom:1px solid #eee; padding-bottom:6px; }
      .report-summary-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:16px; }
      .report-summary-card { background:#f8f9fc; border-radius:8px; padding:12px; text-align:center; }
      .rsc-val { font-size:18px; font-weight:700; margin:4px 0; }
      .rsc-label { font-size:11px; color:#666; }
      .report-two-col { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
      .report-metric-row { display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px solid #f0f0f0; font-size:13px; }
      .report-mini-bar { height:5px; background:#eee; border-radius:3px; margin:3px 0 8px; }
      .report-mini-fill { height:100%; border-radius:3px; background:#4f9eff; }
      .report-bar-label { display:flex; justify-content:space-between; font-size:12px; margin-bottom:2px; }
      .report-trade-row { display:flex; gap:10px; font-size:12px; padding:4px 0; border-bottom:1px solid #f0f0f0; }
      .report-insight { display:flex; gap:8px; padding:8px; margin:4px 0; border-radius:6px; background:#f8f9fc; font-size:13px; }
      .report-footer { text-align:center; margin-top:40px; color:#999; font-size:11px; border-top:1px solid #eee; padding-top:16px; }
      .green { color:#059669; } .red { color:#dc2626; }
      @media print { body { margin:15px; } }
    </style></head><body>`);
    win.document.write(doc.innerHTML);
    win.document.write('</body></html>');
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  }

  function dateKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function formatDate(str) {
    if (!str) return '';
    const d = new Date(str + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
  }

  function shortDate(str) {
    if (!str) return '';
    const d = new Date(str + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month:'numeric', day:'numeric' });
  }

  function fmtPnL(n) {
    n = parseFloat(n||0);
    return (n>=0?'+$':'-$') + Math.abs(n).toFixed(2);
  }

  function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  return { init };

})();
