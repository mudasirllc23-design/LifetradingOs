/**
 * DASHBOARD MODULE
 * Renders and updates the main dashboard
 * Day 1: Foundation
 */

const Dashboard = (() => {

  // ---------- INIT ----------

  function init() {
    renderChecklist();
    updateHabitSummary();
    updateTradingSummary();
    updateGoalsSummary();
    updateMetrics();
    renderActivity();
    updateMoodScore();
  }

  // ---------- MOOD SCORE ----------
  function updateMoodScore() {
    const moods = Storage.getMoods();
    const d = new Date();
    const todayKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const todayMood = moods.find(m => m.date === todayKey);
    const MOOD_EMOJI  = { 5:'😄', 4:'😊', 3:'😐', 2:'😟', 1:'😢' };
    const MOOD_LABEL  = { 5:'Amazing', 4:'Good', 3:'Neutral', 2:'Bad', 1:'Terrible' };
    const moodScore = document.getElementById('moodScore');
    if (moodScore) {
      if (todayMood) {
        moodScore.textContent = MOOD_EMOJI[todayMood.mood] + ' ' + MOOD_LABEL[todayMood.mood];
      } else {
        moodScore.textContent = '—';
      }
    }
  }

  // ---------- CHECKLIST ----------

  function renderChecklist() {
    const saved = Storage.getTodayChecklist();
    const checkboxes = document.querySelectorAll('#dailyChecklist input[type="checkbox"]');

    checkboxes.forEach(cb => {
      const key = cb.dataset.key;
      if (saved[key]) cb.checked = true;

      cb.addEventListener('change', () => {
        const current = Storage.getTodayChecklist();
        current[cb.dataset.key] = cb.checked;
        Storage.saveTodayChecklist(current);
        updateChecklistCount();

        if (cb.checked) {
          Storage.addActivity({
            icon: '✅',
            text: `Completed: ${cb.closest('.check-item').querySelector('.check-label').textContent}`,
            color: '#34d399'
          });
          renderActivity();
        }
      });
    });

    updateChecklistCount();
  }

  function updateChecklistCount() {
    const checkboxes = document.querySelectorAll('#dailyChecklist input[type="checkbox"]');
    const checked = document.querySelectorAll('#dailyChecklist input[type="checkbox"]:checked');
    const badge = document.getElementById('checklistCount');
    if (badge) badge.textContent = `${checked.length}/${checkboxes.length}`;
  }

  // ---------- HABITS SUMMARY ----------

  function updateHabitSummary() {
    const habits = Storage.getHabits();
    const today = Storage.getTodayKey();

    const total = habits.length;
    const completed = habits.filter(h => h.completions && h.completions.includes(today)).length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Best streak
    let bestStreak = 0;
    habits.forEach(h => {
      if (h.streak && h.streak > bestStreak) bestStreak = h.streak;
    });

    // Update UI
    const pctEl = document.getElementById('habitPct');
    const completedEl = document.getElementById('habitsCompleted');
    const totalEl = document.getElementById('habitsTotal');
    const streakEl = document.getElementById('habitStreak');
    const emptyEl = document.getElementById('habitEmptyState');
    const ringFill = document.getElementById('habitRingFill');
    const badgeEl = document.getElementById('habitBadge');

    if (pctEl) pctEl.textContent = pct + '%';
    if (completedEl) completedEl.textContent = completed;
    if (totalEl) totalEl.textContent = total;
    if (streakEl) streakEl.textContent = bestStreak;
    if (badgeEl) badgeEl.textContent = completed;

    if (ringFill) {
      const circumference = 201.06;
      const offset = circumference - (pct / 100) * circumference;
      ringFill.style.strokeDashoffset = offset;
    }

    if (emptyEl) {
      emptyEl.style.display = total === 0 ? 'flex' : 'none';
    }

    // Score card
    const discScore = document.getElementById('disciplineScore');
    if (discScore) discScore.textContent = pct > 0 ? pct + '%' : '—';
  }

  // ---------- TRADING SUMMARY ----------

  function updateTradingSummary() {
    const trades = Storage.getTrades();
    const emptyEl = document.getElementById('tradeEmptyState');

    if (trades.length === 0) {
      if (emptyEl) emptyEl.style.display = 'flex';
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';

    const wins = trades.filter(t => parseFloat(t.pnl) > 0).length;
    const winRate = Math.round((wins / trades.length) * 100);
    const totalPL = trades.reduce((sum, t) => sum + parseFloat(t.pnl || 0), 0);

    const rrValues = trades.filter(t => t.rr).map(t => parseFloat(t.rr));
    const avgRR = rrValues.length > 0
      ? (rrValues.reduce((a, b) => a + b, 0) / rrValues.length).toFixed(1)
      : 0;

    const totalEl = document.getElementById('totalTrades');
    const winEl = document.getElementById('winRate');
    const rrEl = document.getElementById('avgRR');
    const plEl = document.getElementById('totalProfit');
    const dashPL = document.getElementById('tradingPL');

    if (totalEl) totalEl.textContent = trades.length;
    if (winEl) {
      winEl.textContent = winRate + '%';
      winEl.className = 't-stat-val ' + (winRate >= 50 ? 'green' : 'red');
    }
    if (rrEl) rrEl.textContent = '1:' + avgRR;
    if (plEl) {
      plEl.textContent = (totalPL >= 0 ? '+$' : '-$') + Math.abs(totalPL).toFixed(2);
      plEl.className = 't-stat-val ' + (totalPL >= 0 ? 'green' : 'red');
    }
    if (dashPL) {
      dashPL.textContent = (totalPL >= 0 ? '+$' : '-$') + Math.abs(totalPL).toFixed(2);
      dashPL.className = 'score-card-value ' + (totalPL >= 0 ? 'green' : 'red');
    }
  }

  // ---------- GOALS SUMMARY ----------

  function updateGoalsSummary() {
    const goals = Storage.getGoals();
    const container = document.getElementById('dashGoalsList');
    if (!container) return;

    if (goals.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
          <span>No goals yet. <a href="#" data-page="goals">Set your first goal →</a></span>
        </div>`;
      return;
    }

    const colorMap = {
      trading: '#4f9eff',
      study:   '#a78bfa',
      health:  '#34d399',
      personal:'#fb923c',
      finance: '#fbbf24'
    };

    const recent = goals.slice(0, 5);
    container.innerHTML = recent.map(g => {
      const pct = g.progress || 0;
      const color = colorMap[g.type] || '#4f9eff';
      return `
        <div class="goal-item">
          <div class="goal-dot" style="background:${color}"></div>
          <div class="goal-info">
            <div class="goal-name">${escapeHtml(g.title)}</div>
            <div class="goal-meta">${g.type} · ${pct}% done</div>
          </div>
          <div class="goal-progress-bar">
            <div class="metric-bar">
              <div class="metric-fill" style="width:${pct}%;background:${color}"></div>
            </div>
          </div>
        </div>`;
    }).join('');
  }

  // ---------- PERFORMANCE METRICS ----------

  function updateMetrics() {
    const habits = Storage.getHabits();
    const goals = Storage.getGoals();
    const today = Storage.getTodayKey();

    // Consistency: % days in last 7 where user completed at least 1 habit
    let consistencyPct = 0;
    if (habits.length > 0) {
      let daysActive = 0;
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = formatDateKey(d);
        const anyDone = habits.some(h => h.completions && h.completions.includes(key));
        if (anyDone) daysActive++;
      }
      consistencyPct = Math.round((daysActive / 7) * 100);
    }

    // Discipline: habit completion today
    const total = habits.length;
    const completed = habits.filter(h => h.completions && h.completions.includes(today)).length;
    const disciplinePct = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Goal progress: avg of all goals
    let goalPct = 0;
    if (goals.length > 0) {
      goalPct = Math.round(goals.reduce((s, g) => s + (g.progress || 0), 0) / goals.length);
    }

    // Study hours (placeholder until study tracker built)
    const studyHours = Storage.get('study_hours_today', 0);
    const studyPct = Math.min((studyHours / 8) * 100, 100);

    setMetric('consistencyPct', 'consistencyBar', consistencyPct, consistencyPct + '%');
    setMetric('disciplinePct',  'disciplineBar',  disciplinePct,  disciplinePct + '%');
    setMetric('goalPct',        'goalBar',        goalPct,        goalPct + '%');
    setMetric('studyHoursPct',  'studyBar',       studyPct,       studyHours + 'h');

    // Productivity score card
    const prodScore = document.getElementById('productivityScore');
    if (prodScore) {
      const avg = Math.round((consistencyPct + disciplinePct) / 2);
      prodScore.textContent = avg > 0 ? avg + '%' : '—';
    }
  }

  function setMetric(textId, barId, pct, label) {
    const textEl = document.getElementById(textId);
    const barEl  = document.getElementById(barId);
    if (textEl) textEl.textContent = label;
    if (barEl)  barEl.style.width = pct + '%';
  }

  // ---------- ACTIVITY FEED ----------

  function renderActivity() {
    const activity = Storage.getActivity();
    const feed = document.getElementById('activityFeed');
    if (!feed) return;

    if (activity.length === 0) {
      feed.innerHTML = '<div class="activity-empty"><p>Your activity will appear here as you use the app.</p></div>';
      return;
    }

    feed.innerHTML = activity.slice(0, 8).map(a => {
      const time = formatRelativeTime(a.timestamp);
      return `
        <div class="activity-item">
          <div class="activity-icon" style="background:${a.color || 'var(--bg3)'}22">${a.icon || '📌'}</div>
          <div class="activity-text">${escapeHtml(a.text)}</div>
          <div class="activity-time">${time}</div>
        </div>`;
    }).join('');
  }

  // ---------- HELPERS ----------

  function formatDateKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function formatRelativeTime(isoString) {
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs/24)}d ago`;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // Public
  return { init, updateHabitSummary, updateTradingSummary, updateGoalsSummary, updateMetrics, renderActivity, updateMoodScore };

})();
