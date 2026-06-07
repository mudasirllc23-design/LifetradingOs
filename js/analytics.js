/**
 * ANALYTICS MODULE
 * Complete Analytics Engine with SVG Charts
 * Day 5: Analytics, Charts, Metrics
 * Pure SVG — no external chart library needed
 */

const Analytics = (() => {

  let range = 30;

  // ---------- INIT ----------
  function init() {
    range = parseInt(document.getElementById('analyticsRange')?.value || 30);
    document.getElementById('analyticsRange')?.addEventListener('change', e => {
      range = parseInt(e.target.value);
      renderAll();
    });
    renderAll();
  }

  function renderAll() {
    renderKPI();
    renderHabitConsistencyChart();
    renderTradingPLChart();
    renderMoodTrendChart();
    renderTradeResultChart();
    renderAnalyticsHeatmap();
    renderPairPerformance();
    renderGoalsAnalytics();
    renderRadarChart();
  }

  // ---------- KPI ROW ----------
  function renderKPI() {
    const el = document.getElementById('analyticsKPI');
    if (!el) return;

    const habits = Storage.getHabits();
    const trades = Storage.getTrades();
    const goals  = Storage.getGoals();
    const moods  = Storage.getMoods();

    // Habit consistency
    const days = getDaysRange(range);
    let habitDone = 0, habitTotal = 0;
    days.forEach(key => {
      habitTotal += habits.length;
      habitDone  += habits.filter(h => (h.completions||[]).includes(key)).length;
    });
    const habitRate = habitTotal > 0 ? Math.round((habitDone/habitTotal)*100) : 0;

    // Trading
    const rangedTrades = trades.filter(t => days.includes(t.date));
    const totalPL  = trades.reduce((s,t) => s + parseFloat(t.pnl||0), 0);
    const wins     = trades.filter(t => parseFloat(t.pnl||0) > 0).length;
    const winRate  = trades.length > 0 ? Math.round((wins/trades.length)*100) : 0;

    // Goals
    const avgGoal  = goals.length > 0 ? Math.round(goals.reduce((s,g)=>s+(g.progress||0),0)/goals.length) : 0;

    // Mood avg
    const recentMoods = moods.filter(m => days.includes(m.date));
    const avgMood = recentMoods.length > 0
      ? (recentMoods.reduce((s,m)=>s+m.mood,0)/recentMoods.length).toFixed(1)
      : '—';

    const kpis = [
      { label: 'Habit Consistency', val: habitRate + '%', icon: '✅', color: 'var(--accent)',  trend: habitRate >= 70 ? '↑' : '↓', good: habitRate >= 70 },
      { label: 'Win Rate',          val: winRate + '%',   icon: '🏆', color: 'var(--green)',   trend: winRate >= 50 ? '↑' : '↓',   good: winRate >= 50 },
      { label: 'Net P&L',           val: fmtPnL(totalPL), icon: '💰', color: totalPL >= 0 ? 'var(--green)' : 'var(--red)', trend: '', good: totalPL >= 0 },
      { label: 'Total Trades',      val: trades.length,   icon: '📊', color: 'var(--accent2)', trend: '', good: true },
      { label: 'Goal Progress',     val: avgGoal + '%',   icon: '🎯', color: 'var(--accent4)', trend: avgGoal >= 50 ? '↑' : '', good: avgGoal >= 50 },
      { label: 'Avg Mood',          val: avgMood,         icon: '😊', color: 'var(--accent5)', trend: '', good: true },
    ];

    el.innerHTML = kpis.map(k => `
      <div class="kpi-card">
        <div class="kpi-icon">${k.icon}</div>
        <div class="kpi-body">
          <div class="kpi-val" style="color:${k.color}">${k.val} <span class="kpi-trend ${k.good?'good':'bad'}">${k.trend}</span></div>
          <div class="kpi-label">${k.label}</div>
        </div>
      </div>`).join('');
  }

  // ---------- HABIT CONSISTENCY BAR CHART ----------
  function renderHabitConsistencyChart() {
    const canvas = document.getElementById('habitConsistencyChart');
    if (!canvas) return;

    const habits = Storage.getHabits();
    const days   = getDaysRange(Math.min(range, 30));
    const data   = days.map(key => {
      const done  = habits.filter(h => (h.completions||[]).includes(key)).length;
      const pct   = habits.length > 0 ? Math.round((done / habits.length) * 100) : 0;
      return { key, pct, done, total: habits.length };
    });

    const totalDone = data.reduce((s,d)=>s+d.done,0);
    const totalPoss = data.reduce((s,d)=>s+d.total,0);
    const rate = totalPoss > 0 ? Math.round((totalDone/totalPoss)*100) : 0;
    setText('habitConsistencyRate', `${rate}% overall consistency`);

    canvas.innerHTML = renderBarChart(data.map(d => ({
      label: shortDate(d.key),
      value: d.pct,
      color: d.pct >= 80 ? 'var(--green)' : d.pct >= 50 ? 'var(--accent)' : 'var(--accent4)',
      tooltip: `${d.key}: ${d.done}/${d.total} (${d.pct}%)`
    })), { max: 100, unit: '%', height: 200 });
  }

  // ---------- TRADING P&L CUMULATIVE LINE CHART ----------
  function renderTradingPLChart() {
    const canvas = document.getElementById('tradingPLChart');
    if (!canvas) return;

    const trades = Storage.getTrades()
      .filter(t => t.date && t.pnl !== undefined)
      .sort((a,b) => new Date(a.date) - new Date(b.date));

    if (trades.length === 0) {
      canvas.innerHTML = emptyChartMsg('No trades logged yet');
      return;
    }

    let running = 0;
    const data = trades.map(t => {
      running += parseFloat(t.pnl || 0);
      return { label: shortDate(t.date), value: running, tooltip: `${t.pair} ${t.date}: ${fmtPnL(running)}` };
    });

    const net = running;
    setText('tradingPLSubtitle', `Net: ${fmtPnL(net)} over ${trades.length} trades`);
    canvas.innerHTML = renderLineChart(data, { color: net >= 0 ? 'var(--green)' : 'var(--red)', height: 200 });
  }

  // ---------- MOOD TREND CHART ----------
  function renderMoodTrendChart() {
    const canvas = document.getElementById('moodTrendChart');
    if (!canvas) return;

    const moods = Storage.getMoods();
    const days  = getDaysRange(Math.min(range, 30));

    const data = days.filter(key => moods.find(m => m.date === key)).map(key => {
      const m = moods.find(m => m.date === key);
      return { label: shortDate(key), value: m.mood, tooltip: `${key}: Mood ${m.mood}/5` };
    });

    if (data.length === 0) {
      canvas.innerHTML = emptyChartMsg('No mood data yet');
      setText('moodTrendSubtitle', '');
      return;
    }

    const avg = (data.reduce((s,d)=>s+d.value,0)/data.length).toFixed(1);
    setText('moodTrendSubtitle', `Average: ${avg}/5`);
    canvas.innerHTML = renderLineChart(data, { color: 'var(--accent5)', max: 5, height: 150, dots: true });
  }

  // ---------- TRADE RESULT DONUT ----------
  function renderTradeResultChart() {
    const canvas = document.getElementById('tradeResultChart');
    if (!canvas) return;

    const trades = Storage.getTrades();
    const wins   = trades.filter(t => parseFloat(t.pnl||0) > 0).length;
    const losses = trades.filter(t => parseFloat(t.pnl||0) < 0).length;
    const be     = trades.filter(t => parseFloat(t.pnl||0) === 0).length;

    if (trades.length === 0) {
      canvas.innerHTML = emptyChartMsg('No trades yet');
      document.getElementById('donutLegend').innerHTML = '';
      return;
    }

    const segments = [
      { label: 'Wins',       value: wins,   color: '#34d399' },
      { label: 'Losses',     value: losses, color: '#f87171' },
      { label: 'Break Even', value: be,     color: '#a0a8c0' },
    ].filter(s => s.value > 0);

    canvas.innerHTML = renderDonutChart(segments, trades.length);

    const legend = document.getElementById('donutLegend');
    if (legend) {
      legend.innerHTML = segments.map(s => `
        <div class="donut-leg-item">
          <span class="donut-leg-dot" style="background:${s.color}"></span>
          <span>${s.label}: <strong>${s.value}</strong> (${Math.round(s.value/trades.length*100)}%)</span>
        </div>`).join('');
    }
  }

  // ---------- ANALYTICS HEATMAP ----------
  function renderAnalyticsHeatmap() {
    const el = document.getElementById('analyticsHeatmap');
    if (!el) return;

    const habits = Storage.getHabits();
    const moods  = Storage.getMoods();
    const today  = new Date();
    const weeks  = 15;
    const cells  = [];

    for (let i = weeks * 7 - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key    = dateKey(d);
      const done   = habits.filter(h => (h.completions||[]).includes(key)).length;
      const mood   = moods.find(m => m.date === key);
      const score  = habits.length > 0
        ? Math.floor((done / habits.length) * 4)
        : mood ? mood.mood - 1 : 0;
      cells.push({ key, score: Math.min(4, score), done, total: habits.length });
    }

    // Build week columns
    const weekCols = [];
    for (let i = 0; i < cells.length; i += 7) weekCols.push(cells.slice(i, i + 7));

    // Month labels
    const monthLabels = [];
    weekCols.forEach((week, wi) => {
      const firstDay = new Date(week[0].key + 'T00:00:00');
      if (firstDay.getDate() <= 7 || wi === 0) {
        monthLabels.push({ wi, label: firstDay.toLocaleDateString('en-US', { month: 'short' }) });
      }
    });

    el.innerHTML = `
      <div class="aheatmap-wrap">
        <div class="aheatmap-months">
          ${weekCols.map((_, wi) => {
            const ml = monthLabels.find(m => m.wi === wi);
            return `<div class="aheatmap-month-label">${ml ? ml.label : ''}</div>`;
          }).join('')}
        </div>
        <div class="aheatmap-grid">
          ${weekCols.map(week => `
            <div class="aheatmap-col">
              ${week.map(c => `
                <div class="aheatmap-cell level-${c.score}" title="${c.key}: ${c.done}/${c.total} habits"></div>
              `).join('')}
            </div>`).join('')}
        </div>
        <div class="aheatmap-legend">
          <span style="font-size:10px;color:var(--text3)">Less</span>
          ${[0,1,2,3,4].map(l => `<div class="aheatmap-cell level-${l}"></div>`).join('')}
          <span style="font-size:10px;color:var(--text3)">More</span>
        </div>
      </div>`;
  }

  // ---------- PAIR PERFORMANCE ----------
  function renderPairPerformance() {
    const el = document.getElementById('pairPerfList');
    if (!el) return;

    const trades = Storage.getTrades();
    if (trades.length === 0) {
      el.innerHTML = '<p class="analytics-empty">No trades yet.</p>';
      return;
    }

    const pairMap = {};
    trades.forEach(t => {
      if (!pairMap[t.pair]) pairMap[t.pair] = { pnl: 0, wins: 0, total: 0 };
      pairMap[t.pair].total++;
      pairMap[t.pair].pnl += parseFloat(t.pnl || 0);
      if (parseFloat(t.pnl || 0) > 0) pairMap[t.pair].wins++;
    });

    const maxPnL = Math.max(...Object.values(pairMap).map(p => Math.abs(p.pnl)), 1);

    el.innerHTML = Object.entries(pairMap)
      .sort((a,b) => Math.abs(b[1].pnl) - Math.abs(a[1].pnl))
      .slice(0, 8)
      .map(([pair, d]) => {
        const wr    = Math.round((d.wins/d.total)*100);
        const color = d.pnl >= 0 ? 'var(--green)' : 'var(--red)';
        const pct   = Math.round((Math.abs(d.pnl)/maxPnL)*100);
        return `
          <div class="perf-row">
            <div class="perf-pair">${escHtml(pair)}</div>
            <div class="perf-bar-wrap">
              <div class="perf-bar">
                <div class="perf-fill" style="width:${pct}%;background:${color}"></div>
              </div>
            </div>
            <div class="perf-stats">
              <span style="color:${color};font-family:'Space Mono',monospace;font-size:12px;font-weight:700">${fmtPnL(d.pnl)}</span>
              <span style="color:var(--text3);font-size:11px">${wr}% WR</span>
            </div>
          </div>`;
      }).join('');
  }

  // ---------- GOALS ANALYTICS ----------
  function renderGoalsAnalytics() {
    const el = document.getElementById('goalsAnalyticsList');
    if (!el) return;

    const goals = Storage.getGoals();
    if (goals.length === 0) {
      el.innerHTML = '<p class="analytics-empty">No goals yet.</p>';
      return;
    }

    const TYPE_COLOR = { trading:'#4f9eff', study:'#a78bfa', health:'#34d399', personal:'#fb923c', finance:'#fbbf24' };

    el.innerHTML = goals.slice(0, 8).map(g => {
      const prog  = Math.min(100, g.progress || 0);
      const color = TYPE_COLOR[g.type] || 'var(--accent)';
      return `
        <div class="goal-perf-row">
          <div class="goal-perf-name" title="${escHtml(g.title)}">${escHtml(g.title.slice(0,32))}${g.title.length>32?'…':''}</div>
          <div class="goal-perf-bar">
            <div class="goal-perf-fill" style="width:${prog}%;background:${color}"></div>
          </div>
          <div class="goal-perf-pct" style="color:${color}">${prog}%</div>
        </div>`;
    }).join('');
  }

  // ---------- RADAR CHART (SVG) ----------
  function renderRadarChart() {
    const canvas = document.getElementById('radarChart');
    const scores = document.getElementById('radarScores');
    if (!canvas) return;

    const habits = Storage.getHabits();
    const trades = Storage.getTrades();
    const goals  = Storage.getGoals();
    const moods  = Storage.getMoods();

    const today = new Date();
    const days7 = getDaysRange(7);

    // Habit consistency 7d
    let hDone = 0, hTotal = habits.length * 7;
    days7.forEach(k => { hDone += habits.filter(h => (h.completions||[]).includes(k)).length; });
    const habitScore = hTotal > 0 ? Math.round((hDone/hTotal)*100) : 0;

    // Win rate
    const wins = trades.filter(t=>parseFloat(t.pnl||0)>0).length;
    const tradingScore = trades.length > 0 ? Math.round((wins/trades.length)*100) : 0;

    // Goal progress avg
    const goalScore = goals.length > 0 ? Math.round(goals.reduce((s,g)=>s+(g.progress||0),0)/goals.length) : 0;

    // Avg mood 7d (scale to 100)
    const recentMoods = moods.filter(m=>days7.includes(m.date));
    const moodScore = recentMoods.length > 0
      ? Math.round((recentMoods.reduce((s,m)=>s+m.mood,0)/recentMoods.length/5)*100) : 0;

    // Avg discipline from trades
    const withDisc = trades.filter(t=>t.discipline);
    const discScore = withDisc.length > 0
      ? Math.round(withDisc.reduce((s,t)=>s+parseInt(t.discipline||5),0)/withDisc.length*10) : 0;

    // Notes activity (capped at 100)
    const notes = Storage.getNotes();
    const recentNotes = notes.filter(n => {
      const d = new Date(n.createdAt);
      return (Date.now() - d) / 86400000 <= 30;
    });
    const learningScore = Math.min(100, recentNotes.length * 10);

    const axes = [
      { label: 'Habits',     value: habitScore,   color: 'var(--accent)' },
      { label: 'Trading',    value: tradingScore,  color: 'var(--green)' },
      { label: 'Goals',      value: goalScore,     color: 'var(--accent4)' },
      { label: 'Mood',       value: moodScore,     color: 'var(--accent5)' },
      { label: 'Discipline', value: discScore,     color: 'var(--accent2)' },
      { label: 'Learning',   value: learningScore, color: 'var(--yellow)' },
    ];

    canvas.innerHTML = svgRadar(axes);

    if (scores) {
      scores.innerHTML = axes.map(a => `
        <div class="radar-score-item">
          <div class="radar-score-dot" style="background:${a.color}"></div>
          <div class="radar-score-label">${a.label}</div>
          <div class="radar-score-val" style="color:${a.color}">${a.value}%</div>
          <div class="metric-bar" style="flex:1">
            <div class="metric-fill" style="width:${a.value}%;background:${a.color}"></div>
          </div>
        </div>`).join('');
    }
  }

  // ============================================================
  // SVG CHART PRIMITIVES
  // ============================================================

  function renderBarChart(data, opts = {}) {
    const { max = 100, unit = '', height = 200 } = opts;
    const w = 800, h = height + 60;
    const padL = 40, padR = 10, padT = 10, padB = 40;
    const chartW = w - padL - padR;
    const chartH = h - padT - padB;
    const barW   = Math.max(4, Math.floor(chartW / data.length) - 2);
    const maxVal = max || Math.max(...data.map(d => Math.abs(d.value)), 1);

    const gridLines = [0, 25, 50, 75, 100].filter(v => v <= maxVal);

    let svgContent = `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:${height}px">`;

    // Grid lines
    gridLines.forEach(g => {
      const y = padT + chartH - (g / maxVal) * chartH;
      svgContent += `<line x1="${padL}" y1="${y}" x2="${w-padR}" y2="${y}" stroke="var(--border)" stroke-width="1"/>`;
      svgContent += `<text x="${padL-4}" y="${y+4}" text-anchor="end" font-size="9" fill="var(--text3)" font-family="Space Mono,monospace">${g}${unit}</text>`;
    });

    // Bars
    data.forEach((d, i) => {
      const x   = padL + (chartW / data.length) * i + (chartW / data.length - barW) / 2;
      const val = Math.min(Math.abs(d.value), maxVal);
      const barH = (val / maxVal) * chartH;
      const y   = padT + chartH - barH;
      svgContent += `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" fill="${d.color || 'var(--accent)'}" rx="3" opacity="0.85">
        <title>${d.tooltip || `${d.label}: ${d.value}${unit}`}</title>
      </rect>`;

      // X label (every nth)
      const step = Math.max(1, Math.floor(data.length / 10));
      if (i % step === 0) {
        svgContent += `<text x="${x + barW/2}" y="${h - padB + 14}" text-anchor="middle" font-size="8" fill="var(--text3)" font-family="Space Mono,monospace">${d.label}</text>`;
      }
    });

    svgContent += `</svg>`;
    return svgContent;
  }

  function renderLineChart(data, opts = {}) {
    const { color = 'var(--accent)', max, height = 180, dots = false } = opts;
    if (data.length < 2) return emptyChartMsg('Not enough data');

    const w = 800, h = height + 50;
    const padL = 50, padR = 10, padT = 15, padB = 30;
    const chartW = w - padL - padR;
    const chartH = h - padT - padB;

    const vals   = data.map(d => d.value);
    const minVal = Math.min(...vals);
    const maxVal = max || Math.max(...vals, 1);
    const range  = maxVal - (minVal < 0 ? minVal : 0);

    const scaleY = v => padT + chartH - ((v - (minVal < 0 ? minVal : 0)) / (range || 1)) * chartH;
    const scaleX = i => padL + (i / (data.length - 1)) * chartW;

    const points = data.map((d, i) => `${scaleX(i)},${scaleY(d.value)}`).join(' ');
    const areaPoints = `${padL},${padT+chartH} ` + points + ` ${scaleX(data.length-1)},${padT+chartH}`;

    let svg = `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:${height}px">`;

    // Zero line
    if (minVal < 0) {
      const zy = scaleY(0);
      svg += `<line x1="${padL}" y1="${zy}" x2="${w-padR}" y2="${zy}" stroke="var(--border2)" stroke-width="1.5" stroke-dasharray="4"/>`;
    }

    // Area fill
    svg += `<polygon points="${areaPoints}" fill="${color}" opacity="0.08"/>`;

    // Line
    svg += `<polyline points="${points}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;

    // Dots
    if (dots || data.length <= 20) {
      data.forEach((d, i) => {
        svg += `<circle cx="${scaleX(i)}" cy="${scaleY(d.value)}" r="3.5" fill="${color}" stroke="var(--bg2)" stroke-width="2">
          <title>${d.tooltip || `${d.label}: ${d.value}`}</title>
        </circle>`;
      });
    }

    // X labels
    const step = Math.max(1, Math.floor(data.length / 8));
    data.forEach((d, i) => {
      if (i % step === 0 || i === data.length-1) {
        svg += `<text x="${scaleX(i)}" y="${h-padB+16}" text-anchor="middle" font-size="8" fill="var(--text3)" font-family="Space Mono,monospace">${d.label}</text>`;
      }
    });

    // Y labels
    const gridVals = max
      ? [0, Math.round(max*0.25), Math.round(max*0.5), Math.round(max*0.75), max]
      : [minVal, 0, maxVal].filter((v,i,a) => a.indexOf(v)===i);
    gridVals.forEach(gv => {
      const gy = scaleY(gv);
      if (gy >= padT && gy <= padT+chartH) {
        svg += `<line x1="${padL}" y1="${gy}" x2="${w-padR}" y2="${gy}" stroke="var(--border)" stroke-width="0.8"/>`;
        svg += `<text x="${padL-4}" y="${gy+4}" text-anchor="end" font-size="9" fill="var(--text3)" font-family="Space Mono,monospace">${typeof gv==='number'&&Math.abs(gv)>=1000?'$'+Math.round(gv/1000)+'k':gv}</text>`;
      }
    });

    svg += `</svg>`;
    return svg;
  }

  function renderDonutChart(segments, total) {
    const cx = 80, cy = 80, r = 60, stroke = 22;
    const circumference = 2 * Math.PI * r;
    let offset = 0;

    let svg = `<svg viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg" style="width:140px;height:140px">`;
    svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--bg3)" stroke-width="${stroke}"/>`;

    segments.forEach(s => {
      const pct = s.value / total;
      const dash = pct * circumference;
      svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${s.color}" stroke-width="${stroke}"
        stroke-dasharray="${dash} ${circumference - dash}"
        stroke-dashoffset="${-offset}"
        transform="rotate(-90 ${cx} ${cy})" opacity="0.9">
        <title>${s.label}: ${s.value} (${Math.round(pct*100)}%)</title>
      </circle>`;
      offset += dash;
    });

    svg += `<text x="${cx}" y="${cy-6}" text-anchor="middle" font-size="22" font-weight="bold" fill="var(--text)" font-family="Space Mono,monospace">${total}</text>`;
    svg += `<text x="${cx}" y="${cy+12}" text-anchor="middle" font-size="10" fill="var(--text3)" font-family="Space Mono,monospace">trades</text>`;
    svg += `</svg>`;
    return svg;
  }

  function svgRadar(axes) {
    const cx = 140, cy = 140, r = 110;
    const n = axes.length;
    const levels = 4;
    let svg = `<svg viewBox="0 0 280 280" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:280px;height:280px">`;

    // Grid rings
    for (let l = 1; l <= levels; l++) {
      const pr = (l / levels) * r;
      const pts = axes.map((_, i) => {
        const angle = (2 * Math.PI * i / n) - Math.PI / 2;
        return `${cx + pr * Math.cos(angle)},${cy + pr * Math.sin(angle)}`;
      }).join(' ');
      svg += `<polygon points="${pts}" fill="none" stroke="var(--border)" stroke-width="1"/>`;
    }

    // Spokes
    axes.forEach((_, i) => {
      const angle = (2 * Math.PI * i / n) - Math.PI / 2;
      svg += `<line x1="${cx}" y1="${cy}" x2="${cx + r * Math.cos(angle)}" y2="${cy + r * Math.sin(angle)}" stroke="var(--border)" stroke-width="1"/>`;
    });

    // Data polygon
    const dataPoints = axes.map((a, i) => {
      const angle = (2 * Math.PI * i / n) - Math.PI / 2;
      const pr = (Math.min(100, a.value) / 100) * r;
      return `${cx + pr * Math.cos(angle)},${cy + pr * Math.sin(angle)}`;
    }).join(' ');
    svg += `<polygon points="${dataPoints}" fill="var(--accent)" fill-opacity="0.15" stroke="var(--accent)" stroke-width="2"/>`;

    // Dots & labels
    axes.forEach((a, i) => {
      const angle = (2 * Math.PI * i / n) - Math.PI / 2;
      const pr = (Math.min(100, a.value) / 100) * r;
      const dx = cx + pr * Math.cos(angle);
      const dy = cy + pr * Math.sin(angle);
      const lx = cx + (r + 22) * Math.cos(angle);
      const ly = cy + (r + 22) * Math.sin(angle);
      svg += `<circle cx="${dx}" cy="${dy}" r="5" fill="${a.color}" stroke="var(--bg2)" stroke-width="2"/>`;
      svg += `<text x="${lx}" y="${ly+4}" text-anchor="middle" font-size="10" fill="var(--text2)" font-family="Syne,sans-serif" font-weight="600">${a.label}</text>`;
    });

    svg += `</svg>`;
    return svg;
  }

  // ---------- HELPERS ----------
  function getDaysRange(n) {
    const days = [];
    const today = new Date();
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      days.push(dateKey(d));
    }
    return days;
  }

  function dateKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function shortDate(str) {
    if (!str) return '';
    const d = new Date(str + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
  }

  function fmtPnL(n) {
    n = parseFloat(n || 0);
    return (n >= 0 ? '+$' : '-$') + Math.abs(n).toFixed(2);
  }

  function emptyChartMsg(msg) {
    return `<div style="display:flex;align-items:center;justify-content:center;height:150px;color:var(--text3);font-size:13px;font-style:italic">${msg}</div>`;
  }

  function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }

  return { init };

})();
