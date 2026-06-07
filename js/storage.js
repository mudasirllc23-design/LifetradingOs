/**
 * STORAGE MODULE
 * Handles all localStorage operations for LifeTradingOS
 * Day 1: Foundation
 */

const Storage = (() => {

  const PREFIX = 'lifeos_';

  // ---------- CORE ----------

  function set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('[Storage] set error:', e);
      return false;
    }
  }

  function get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(PREFIX + key);
      return item !== null ? JSON.parse(item) : defaultValue;
    } catch (e) {
      console.error('[Storage] get error:', e);
      return defaultValue;
    }
  }

  function remove(key) {
    localStorage.removeItem(PREFIX + key);
  }

  function clear() {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(PREFIX));
    keys.forEach(k => localStorage.removeItem(k));
  }

  // ---------- THEME ----------

  function getTheme() {
    return get('theme', 'dark');
  }

  function setTheme(theme) {
    set('theme', theme);
  }

  // ---------- HABITS ----------

  function getHabits() {
    return get('habits', []);
  }

  function saveHabits(habits) {
    set('habits', habits);
  }

  // ---------- TRADES ----------

  function getTrades() {
    return get('trades', []);
  }

  function saveTrades(trades) {
    set('trades', trades);
  }

  // ---------- GOALS ----------

  function getGoals() {
    return get('goals', []);
  }

  function saveGoals(goals) {
    set('goals', goals);
  }

  // ---------- NOTES ----------

  function getNotes() {
    return get('notes', []);
  }

  function saveNotes(notes) {
    set('notes', notes);
  }

  // ---------- REFLECTIONS ----------

  function getReflections() {
    return get('reflections', []);
  }

  function saveReflections(reflections) {
    set('reflections', reflections);
  }

  // ---------- MOOD ----------

  function getMoods() {
    return get('moods', []);
  }

  function saveMoods(moods) {
    set('moods', moods);
  }

  // ---------- CHECKLIST (daily) ----------

  function getTodayChecklist() {
    const today = getTodayKey();
    return get('checklist_' + today, {});
  }

  function saveTodayChecklist(data) {
    const today = getTodayKey();
    set('checklist_' + today, data);
  }

  // ---------- ACTIVITY LOG ----------

  function getActivity() {
    return get('activity', []);
  }

  function addActivity(entry) {
    const log = getActivity();
    log.unshift({
      ...entry,
      timestamp: new Date().toISOString()
    });
    // Keep last 50 entries
    set('activity', log.slice(0, 50));
  }

  // ---------- ALL DATA (for backup) ----------

  function exportAll() {
    return {
      version: '1.0',
      exportDate: new Date().toISOString(),
      habits: getHabits(),
      trades: getTrades(),
      goals: getGoals(),
      notes: getNotes(),
      reflections: getReflections(),
      moods: getMoods(),
      activity: getActivity(),
      settings: {
        theme: getTheme()
      }
    };
  }

  function importAll(data) {
    if (!data || !data.version) return false;
    try {
      if (data.habits)      saveHabits(data.habits);
      if (data.trades)      saveTrades(data.trades);
      if (data.goals)       saveGoals(data.goals);
      if (data.notes)       saveNotes(data.notes);
      if (data.reflections) saveReflections(data.reflections);
      if (data.moods)       saveMoods(data.moods);
      if (data.settings?.theme) setTheme(data.settings.theme);
      return true;
    } catch (e) {
      console.error('[Storage] importAll error:', e);
      return false;
    }
  }

  // ---------- HELPERS ----------

  function getTodayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function getStorageSize() {
    let total = 0;
    for (const key in localStorage) {
      if (key.startsWith(PREFIX)) {
        total += localStorage[key].length * 2;
      }
    }
    return (total / 1024).toFixed(2) + ' KB';
  }

  // ---------- PUBLIC API ----------

  return {
    set, get, remove, clear,
    getTheme, setTheme,
    getHabits, saveHabits,
    getTrades, saveTrades,
    getGoals, saveGoals,
    getNotes, saveNotes,
    getReflections, saveReflections,
    getMoods, saveMoods,
    getTodayChecklist, saveTodayChecklist,
    getActivity, addActivity,
    exportAll, importAll,
    getTodayKey, getStorageSize
  };

})();
