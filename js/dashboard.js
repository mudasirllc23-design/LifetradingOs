/**
 * DASHBOARD MODULE — ADVANCED VERSION
 * Hero Banner, Streak, Quick Actions, Weekly Overview,
 * Mini Chart, Daily Tip, Achievement Popup
 */

const Dashboard = (() => {

  const QUOTES = [
    "Discipline is the bridge between goals and accomplishment.",
    "Every expert was once a beginner. Keep going.",
    "The market rewards patience and punishes greed.",
    "Your trading journal is your most powerful tool.",
    "Consistency beats perfection every single time.",
    "Risk management is not optional — it is survival.",
    "One good trade a week beats ten bad trades a day.",
    "The best traders are the most disciplined ones.",
    "Emotions are your biggest enemy in trading.",
    "Small daily improvements lead to stunning results.",
    "A loss is only a lesson if you learn from it.",
    "Trade what you see, not what you think.",
    "Protect your capital — it is your business.",
    "The trend is your friend until it ends.",
    "Winners cut losses short and let profits run.",
  ];

  const TIPS = [
    "Never risk more than 1-2% of your account per trade.",
    "Always set your Stop Loss before entering a trade.",
    "Wait for your setup — patience is a trading edge.",
    "Check the economic calendar before every session.",
    "Review your trades every Sunday — learn from them.",
    "Higher timeframe trend always wins in the end.",
    "Do not trade when you are emotional or tired.",
    "Quality trades over quantity — less is more.",
    "Your discipline is your biggest trading advantage.",
    "Write your entry reason before clicking buy/sell.",
    "A break-even Stop Loss is a free trade.",
    "Never move your Stop Loss to a worse position.",
    "The best trade is sometimes no trade at all.",
    "Celebrate discipline, not just profits.",
    "Your mindset determines your trading results.",
  ];

  // ---------- INIT ----------
  function init() {
    // Load user name from onboarding
    if (typeof Onboarding !== 'undefined') Onboarding.loadUserName();
    renderHeroBanner();
    renderStreakBanner();
    renderQuickActions();
    renderDailyTip();
    updateMoodScore();
    renderChecklist();
    updateHabitSummary();
    updateTradingSummary();
    updateGoalsSummary();
    updateMetrics();
    renderActivity();
    renderWeekOverview();
    renderMiniPLChart();
    renderTodaysFocus();
    checkAchievements();
  }

  // ---------- HERO BANNER ----------
  function renderHeroBanner() {
    const now = new Date();
    const hour = now.getHours();

    let greeting, icon;
    if (hour < 12) { greeting = 'Good Morning'; icon = '☀️'; }
    else if (hour < 17) { greeting = 'Good Afternoon'; icon = '🌤️'; }
    else if (hour < 21) { greeting = 'Good Evening'; icon = '🌆'; }
    else { greeting = 'Good Night'; icon = '🌙'; }

    setText('heroGreeting', `${greeting} ${icon}`);

    // Date
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    setText('heroDayName',  days[now.getDay()]);
    setText('heroDayNum',   now.getDate());
    setText('heroMonthYear', months[now.getMonth()] + ' ' + now.getFullYear());

    // Quote — changes daily
    const dayIndex = now.getDate() % QUOTES.length;
    setText('heroDailyQuote', `"${QUOTES[dayIndex]}"`);
  }

  // ---------- STREAK BANNER ----------
  function renderStreakBanner() {
    const habits = Storage.getHabits();
    if (habits.length === 0) return;

    const bestStreak = habits.reduce((m,h) => Math.max(m, h.streak||0), 0);
    const banner = document.getElementById('streakBanner');
    const bannerText = document.getElementById('streakBannerText');
    const bannerDays = document.getElementById('streakBannerDays');

    if (bestStreak >= 3 && banner) {
      banner.style.display = 'flex';
      if (bannerText) bannerText.textContent = `${bestStreak} Day Streak! 🔥`;
      if (bannerDays) bannerDays.textContent = bestStreak;

      // Color based on streak length
      if (bestStreak >= 30) banner.className = 'streak-banner streak-gold';
      else if (bestStreak >= 14) banner.className = 'streak-banner streak-purple';
      else if (bestStreak >= 7)  banner.className = 'streak-banner streak-blue';
      else banner.className = 'streak-banner streak-green';
    }
  }

  // ---------- QUICK ACTIONS ----------
  function renderQuickActions() {
    document.querySelectorAll('.qa-action-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const page = e.currentTarget.dataset.page;
        if (page && typeof App !== 'undefined') {
          App.navigateTo(page);
        }
      });
    });
  }

  // ---------- DAILY TIP ----------
  function renderDailyTip() {
    const now = new Date();
    const tipIndex = (now.getDate() + now.getMonth()) % TIPS.length;
    setText('dailyTip', TIPS[tipIndex]);
  }

  // ---------- TODAY'S FOCUS ----------
  function renderTodaysFocus() {
    const goals = Storage.getGoals();
    const card = document.getElementById('todaysFocusCard');
    if (!card || goals.length === 0) return;

    // Find highest priority incomplete goal
    const priority = { critical:0, high:1, medium:2, low:3 };
    const active = goals
      .filter(g => g.progress < 100)
      .sort((a,b) => (priority[a.priority]||2) - (priority[b.priority]||2));

    if (active.length === 0) return;

    const goal = active[0];
    card.style.display = 'block';
    setText('focusGoalTitle', goal.title);
    setText('focusGoalPct', (goal.progress||0) + '%');

    const fill = document.getElementById('focusGoalFill');
    if (fill) fill.style.width = (goal.progress||0) + '%';
  }

  // ---------- WEEK OVERVIEW ----------
  function renderWeekOverview() {
    const el = document.getElementById('weekOverview');
    const badge = document.getElementById('weekScoreBadge');
    if (!el) return;

    const habits = Storage.getHabits();
    const today = new Date();
    const dow = today.getDay();
    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

    let totalScore = 0;
    let dayCount = 0;

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - dow + i);
      const key = dateKey(d);
      const isFuture = d > today && i !== dow;
      const isToday  = i === dow;

      let pct = 0;
      if (!isFuture && habits.length > 0) {
        const done = habits.filter(h => (h.completions||[]).includes(key)).length;
        pct = Math.round((done / habits.length) * 100);
        totalScore += pct;
        dayCount++;
      }

      days.push({ name: dayNames[i], pct, isFuture, isToday, key });
    }

    const avgScore = dayCount > 0 ? Math.round(totalScore / dayCount) : 0;
    if (badge) badge.textContent = avgScore + '%';

    el.innerHTML = days.map(d => {
      const color = d.pct >= 80 ? 'var(--green)' :
                    d.pct >= 50 ? 'var(--accent)' :
                    d.pct > 0   ? 'var(--accent4)' : 'var(--border2)';
      const height = d.isFuture ? 4 : Math.max(4, (d.pct / 100) * 50);

      return `
        <div class="week-ov-day ${d.isToday ? 'week-ov-today' : ''} ${d.isFuture ? 'week-ov-future' : ''}">
          <div class="week-ov-bar-wrap">
            <div class="week-ov-bar" style="height:${height}px;background:${color}"></div>
          </div>
          <div class="week-ov-pct">${d.isFuture ? '' : d.pct > 0 ? d.pct+'%' : '—'}</div>
          <div class="week-ov-name">${d.name}</div>
        </div>`;
    }).join('');
  }

  // ---------- MINI P&L CHART ----------
  function renderMiniPLChart() {
    const el = document.getElementById('miniPLChart');
    if (!el) return;

    const trades = Storage.getTrades()
      .filter(t => t.date && t.pnl !== undefined)
      .sort((a,b) => new Date(a.date) - new Date(b.date))
      .slice(-7);

    if (trades.length < 2) {
      el.innerHTML = '<div class="empty-state" style="padding:16px"><span style="font-size:12px;color:var(--text3)">Need 2+ trades for chart</span></div>';
      return;
    }

    let running = 0;
    const data = trades.map(t => {
      running += parseFloat(t.pnl || 0);
      return { val: running, pnl: parseFloat(t.pnl||0), pair: t.pair };
    });

    const vals = data.map(d => d.val);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;
    const w = 300, h = 80;
    const padX = 10, padY = 10;

    const scaleX = i => padX + (i / (data.length - 1)) * (w - padX*2);
    const scaleY = v => padY + (1 - (v - min) / range) * (h - padY*2);

    const points = data.map((d,i) => `${scaleX(i)},${scaleY(d.val)}`).join(' ');
    const areaPoints = `${padX},${h-padY} ${points} ${scaleX(data.length-1)},${h-padY}`;
    const netColor = running >= 0 ? 'var(--green)' : 'var(--red)';
    const net = running >= 0 ? `+$${running.toFixed(2)}` : `-$${Math.abs(running).toFixed(2)}`;

    el.innerHTML = `
      <div class="mini-chart-header">
        <span class="mini-chart-net" style="color:${netColor}">${net}</span>
        <span class="mini-chart-sub">Last ${trades.length} trades</span>
      </div>
      <svg viewBox="0 0 ${w} ${h}" style="width:100%;height:70px">
        <defs>
          <linearGradient id="miniGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${netColor}" stop-opacity="0.3"/>
            <stop offset="100%" stop-color="${netColor}" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <polygon points="${areaPoints}" fill="url(#miniGrad)"/>
        <polyline points="${points}" fill="none" stroke="${netColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        ${data.map((d,i) => `<circle cx="${scaleX(i)}" cy="${scaleY(d.val)}" r="3" fill="${d.pnl>=0?'var(--green)':'var(--red)'}" stroke="var(--bg2)" stroke-width="1.5"/>`).join('')}
      </svg>`;
  }

  // ---------- ACHIEVEMENTS ----------
  function checkAchievements() {
    const habits = Storage.getHabits();
    const trades = Storage.getTrades();
    const achieved = Storage.get('achievements_shown', []);

    const checks = [
      {
        id: 'habit_7',
        condition: habits.some(h => (h.streak||0) >= 7),
        icon: '🔥', title: '7 Day Streak!',
        desc: 'You completed a habit 7 days in a row!'
      },
      {
        id: 'habit_30',
        condition: habits.some(h => (h.longestStreak||0) >= 30),
        icon: '🏆', title: '30 Day Legend!',
        desc: '30 day habit streak — incredible discipline!'
      },
      {
        id: 'first_trade',
        condition: trades.length >= 1,
        icon: '📈', title: 'First Trade Logged!',
        desc: 'Your trading journey has officially begun!'
      },
      {
        id: 'ten_trades',
        condition: trades.length >= 10,
        icon: '💰', title: '10 Trades Logged!',
        desc: 'Building your trading history!'
      },
      {
        id: 'first_habit',
        condition: habits.length >= 1,
        icon: '✅', title: 'First Habit Created!',
        desc: 'The journey of a thousand miles begins with one step!'
      },
    ];

    const newAchievement = checks.find(c => c.condition && !achieved.includes(c.id));
    if (newAchievement) {
      achieved.push(newAchievement.id);
      Storage.set('achievements_shown', achieved);
      showAchievement(newAchievement);
    }
  }

  function showAchievement(ach) {
    const popup = document.getElementById('achievementPopup');
    const icon  = document.getElementById('achIcon');
    const title = document.getElementById('achTitle');
    const desc  = document.getElementById('achDesc');
    const close = document.getElementById('achClose');

    if (!popup) return;

    if (icon)  icon.textContent  = ach.icon;
    if (title) title.textContent = ach.title;
    if (desc)  desc.textContent  = ach.desc;

    popup.style.display = 'flex';
    popup.classList.add('ach-show');

    if (close) {
      close.onclick = () => {
        popup.classList.remove('ach-show');
        setTimeout(() => { popup.style.display = 'none'; }, 400);
      };
    }

    // Auto hide after 5 seconds
    setTimeout(() => {
      popup.classList.remove('ach-show');
      setTimeout(() => { popup.style.display = 'none'; }, 400);
    }, 5000);
  }

  // ---------- CHECKLIST ----------
  function renderChecklist() {
    const saved = Storage.getTodayChecklist();
    const checkboxes = document.querySelectorAll('.checklist-two-col input[type="checkbox"]');

    checkboxes.forEach(cb => {
      const key = cb.dataset.key;
      if (saved[key]) {
        cb.checked = true;
        const label = cb.closest('.check-item-new');
        if (label) label.classList.add('checked');
      }
      cb.addEventListener('change', () => {
        const current = Storage.getTodayChecklist();
        current[cb.dataset.key] = cb.checked;
        Storage.saveTodayChecklist(current);
        const label = cb.closest('.check-item-new');
        if (label) label.classList.toggle('checked', cb.checked);
        updateChecklistCount();
        if (cb.checked) {
          const labelEl = cb.closest('.check-item-new')?.querySelector('.check-item-label');
          Storage.addActivity({ icon:'✅', text:`Completed: ${labelEl?.textContent||key}`, color:'#10b981' });
          renderActivity();
        }
      });
    });

    // Click-to-navigate for action items (Log Trade, Habits, Goals, Rules)
    document.querySelectorAll('.check-item-action').forEach(item => {
      const goto = item.dataset.goto;
      const iconEl  = item.querySelector('.check-item-icon');
      const labelEl = item.querySelector('.check-item-label');
      const gotoEl  = item.querySelector('.check-item-goto');

      [iconEl, labelEl, gotoEl].forEach(el => {
        if (!el) return;
        el.style.cursor = 'pointer';
        el.addEventListener('click', e => {
          e.preventDefault();
          if (goto && typeof App !== 'undefined') App.navigateTo(goto);
        });
      });
    });

    updateChecklistCount();
  }

  function updateChecklistCount() {
    const checkboxes = document.querySelectorAll('.checklist-two-col input[type="checkbox"]');
    const checked    = document.querySelectorAll('.checklist-two-col input[type="checkbox"]:checked');
    const total = checkboxes.length;
    const done  = checked.length;
    const pct   = total > 0 ? Math.round((done/total)*100) : 0;

    setText('checklistCount', `${done}/${total}`);

    const fill = document.getElementById('checklistProgFill');
    if (fill) {
      fill.style.width = pct + '%';
      fill.style.background = pct===100 ? 'var(--green)' : 'linear-gradient(90deg,var(--accent),var(--accent2))';
    }

    const ring = document.getElementById('checklistRing');
    if (ring) {
      const offset = 87.96 - (pct/100)*87.96;
      ring.style.strokeDashoffset = offset;
      ring.style.stroke = pct===100 ? 'var(--green)' : 'var(--accent)';
    }
    setText('checklistRingPct', pct+'%');

    const msg = document.getElementById('checklistCompleteMsg');
    if (msg) msg.style.display = pct===100 ? 'flex' : 'none';
  }

  // ---------- HABIT SUMMARY ----------
  function updateHabitSummary() {
    const habits = Storage.getHabits();
    const today  = todayKey();
    const total     = habits.length;
    const completed = habits.filter(h => (h.completions||[]).includes(today)).length;
    const pct       = total > 0 ? Math.round((completed/total)*100) : 0;
    const bestStreak= habits.reduce((m,h) => Math.max(m,h.streak||0), 0);

    setText('habitPct', pct+'%');
    setText('habitsCompleted', completed);
    setText('habitsTotal', total);
    setText('habitStreak', bestStreak);

    const badge = document.getElementById('habitBadge');
    if (badge) badge.textContent = completed;

    const ring = document.getElementById('habitRingFill');
    if (ring) {
      const offset = 201.06 - (pct/100)*201.06;
      ring.style.strokeDashoffset = offset;
    }

    const emptyEl = document.getElementById('habitEmptyState');
    if (emptyEl) emptyEl.style.display = total===0 ? 'flex' : 'none';

    setText('disciplineScore', pct>0 ? pct+'%' : '—');
  }

  // ---------- TRADING SUMMARY ----------
  function updateTradingSummary() {
    const trades  = Storage.getTrades();
    const emptyEl = document.getElementById('tradeEmptyState');
    if (trades.length === 0) { if (emptyEl) emptyEl.style.display='flex'; return; }
    if (emptyEl) emptyEl.style.display = 'none';

    const wins   = trades.filter(t=>parseFloat(t.pnl||0)>0).length;
    const winRate= Math.round((wins/trades.length)*100);
    const netPnL = trades.reduce((s,t)=>s+parseFloat(t.pnl||0),0);
    const rrVals = trades.filter(t=>t.rr).map(t=>parseFloat(t.rr));
    const avgRR  = rrVals.length>0 ? (rrVals.reduce((a,b)=>a+b,0)/rrVals.length).toFixed(1) : 0;

    setText('totalTrades', trades.length);

    const wrEl = document.getElementById('winRate');
    if (wrEl) { wrEl.textContent=winRate+'%'; wrEl.className='t-stat-val '+(winRate>=50?'green':'red'); }

    setText('avgRR', '1:'+avgRR);

    const plEl = document.getElementById('totalProfit');
    if (plEl) { plEl.textContent=(netPnL>=0?'+$':'-$')+Math.abs(netPnL).toFixed(2); plEl.className='t-stat-val '+(netPnL>=0?'green':'red'); }

    const dashPL = document.getElementById('tradingPL');
    if (dashPL) { dashPL.textContent=(netPnL>=0?'+$':'-$')+Math.abs(netPnL).toFixed(2); dashPL.className='score-card-value '+(netPnL>=0?'green':'red'); }
  }

  // ---------- GOALS SUMMARY ----------
  function updateGoalsSummary() {
    const goals = Storage.getGoals();
    const el    = document.getElementById('dashGoalsList');
    if (!el) return;
    if (goals.length===0) {
      el.innerHTML=`<div class="empty-state"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg><span>No goals yet. <a href="#" data-page="goals">Set your first goal →</a></span></div>`;
      return;
    }
    const COLOR={trading:'#4f9eff',study:'#a78bfa',health:'#34d399',personal:'#fb923c',finance:'#fbbf24'};
    el.innerHTML=goals.slice(0,5).map(g=>{
      const pct=Math.min(100,g.progress||0);
      const color=COLOR[g.type]||'#4f9eff';
      return `<div class="goal-item">
        <div class="goal-dot" style="background:${color}"></div>
        <div class="goal-info"><div class="goal-name">${escHtml(g.title)}</div><div class="goal-meta">${g.type} · ${pct}% done</div></div>
        <div class="goal-progress-bar"><div class="metric-bar"><div class="metric-fill" style="width:${pct}%;background:${color}"></div></div></div>
      </div>`;
    }).join('');
  }

  // ---------- METRICS ----------
  function updateMetrics() {
    const habits = Storage.getHabits();
    const goals  = Storage.getGoals();
    const today  = todayKey();
    const days7  = getDays(7);

    let hDone=0, hTotal=habits.length*7;
    days7.forEach(k => { hDone+=habits.filter(h=>(h.completions||[]).includes(k)).length; });
    const consistencyPct = hTotal>0 ? Math.round((hDone/hTotal)*100) : 0;

    const total     = habits.length;
    const completed = habits.filter(h=>(h.completions||[]).includes(today)).length;
    const disciplinePct = total>0 ? Math.round((completed/total)*100) : 0;

    const goalPct = goals.length>0 ? Math.round(goals.reduce((s,g)=>s+(g.progress||0),0)/goals.length) : 0;
    const studyHours = Storage.get('study_hours_today',0);
    const studyPct = Math.min((studyHours/8)*100,100);

    setMetric('consistencyPct','consistencyBar',consistencyPct,consistencyPct+'%');
    setMetric('disciplinePct','disciplineBar',disciplinePct,disciplinePct+'%');
    setMetric('goalPct','goalBar',goalPct,goalPct+'%');
    setMetric('studyHoursPct','studyBar',studyPct,studyHours+'h');

    const prod = Math.round((consistencyPct+disciplinePct)/2);
    setText('productivityScore', prod>0 ? prod+'%' : '—');
  }

  function setMetric(textId, barId, pct, label) {
    setText(textId, label);
    const bar = document.getElementById(barId);
    if (bar) bar.style.width = pct+'%';
  }

  // ---------- MOOD SCORE ----------
  function updateMoodScore() {
    const moods = Storage.getMoods();
    const d = new Date();
    const key = dateKey(d);
    const m = moods.find(m=>m.date===key);
    const EMOJI={5:'😄',4:'😊',3:'😐',2:'😟',1:'😢'};
    const LABEL={5:'Amazing',4:'Good',3:'Neutral',2:'Bad',1:'Terrible'};
    const el = document.getElementById('moodScore');
    if (el) el.textContent = m ? EMOJI[m.mood]+' '+LABEL[m.mood] : '—';
  }

  // ---------- ACTIVITY FEED ----------
  function renderActivity() {
    const activity = Storage.getActivity();
    const feed = document.getElementById('activityFeed');
    if (!feed) return;
    if (activity.length===0) {
      feed.innerHTML='<div class="activity-empty"><p>Your activity will appear here as you use the app.</p></div>';
      return;
    }
    feed.innerHTML=activity.slice(0,8).map(a=>`
      <div class="activity-item">
        <div class="activity-icon" style="background:${a.color||'var(--bg3)'}22">${a.icon||'📌'}</div>
        <div class="activity-text">${escHtml(a.text)}</div>
        <div class="activity-time">${relativeTime(a.timestamp)}</div>
      </div>`).join('');
  }

  // ---------- HELPERS ----------
  function getDays(n) {
    const days=[]; const today=new Date();
    for(let i=n-1;i>=0;i--){const d=new Date(today);d.setDate(today.getDate()-i);days.push(dateKey(d));}
    return days;
  }

  function todayKey() { return dateKey(new Date()); }

  function dateKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function relativeTime(iso) {
    const diff=Date.now()-new Date(iso).getTime();
    const mins=Math.floor(diff/60000);
    if(mins<1) return 'just now';
    if(mins<60) return `${mins}m ago`;
    const hrs=Math.floor(mins/60);
    if(hrs<24) return `${hrs}h ago`;
    return `${Math.floor(hrs/24)}d ago`;
  }

  function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function setText(id,val) { const e=document.getElementById(id); if(e) e.textContent=val; }

  return { init, updateHabitSummary, updateTradingSummary, updateGoalsSummary, updateMetrics, renderActivity, updateMoodScore };

})();
