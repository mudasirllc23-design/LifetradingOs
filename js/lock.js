/**
 * PIN LOCK MODULE
 * 4-digit PIN security for LifeTradingOS
 * Features: Set PIN, Unlock, Change PIN, Reset, Auto-lock
 */

const Lock = (() => {

  // ---------- STATE ----------
  let currentInput  = '';
  let mode          = 'unlock';   // 'unlock' | 'setup-new' | 'setup-confirm' | 'change-old' | 'change-new' | 'change-confirm'
  let firstPin      = '';
  let attempts      = 0;
  let lockoutUntil  = 0;
  let lockoutTimer  = null;

  const MAX_ATTEMPTS = 5;
  const LOCKOUT_MS   = 30000; // 30 seconds
  const PIN_KEY      = 'lifeos_pin_hash';
  const SETUP_KEY    = 'lifeos_pin_set';
  const SESSION_KEY  = 'lifeos_unlocked';

  // ---------- INIT ----------
  function init() {
    applyThemeToLock();
    const isPinSet    = localStorage.getItem(SETUP_KEY) === 'true';
    const isUnlocked  = sessionStorage.getItem(SESSION_KEY) === 'true';

    if (!isPinSet) {
      // First time — setup mode
      showLock();
      setMode('setup-new');
    } else if (isUnlocked) {
      // Already unlocked this session
      hideLock();
    } else {
      // PIN is set, need to unlock
      showLock();
      setMode('unlock');
    }

    bindKeys();
    bindKeyboard();
    bindForgotBtn();
    bindSidebarLockBtn();
    updateSidebarLockBtn();
  }

  // ---------- SHOW / HIDE ----------
  function showLock() {
    const screen = document.getElementById('pinLockScreen');
    if (screen) {
      screen.style.display = 'flex';
      screen.classList.remove('pin-unlock-anim');
    }
  }

  function hideLock() {
    const screen = document.getElementById('pinLockScreen');
    if (screen) {
      screen.classList.add('pin-unlock-anim');
      setTimeout(() => { screen.style.display = 'none'; }, 500);
    }
  }

  // ---------- MODE SETUP ----------
  function setMode(newMode) {
    mode = newMode;
    currentInput = '';
    // NOTE: firstPin is NOT reset here — it must survive across mode changes
    // e.g. setup-new → setup-confirm needs firstPin intact
    updateDots();
    clearError();

    const labelEl  = document.getElementById('pinModeLabel');
    const hintEl   = document.getElementById('pinHint');
    const iconEl   = document.getElementById('pinLockIcon');
    const forgotEl = document.getElementById('pinForgotBtn');

    const labels = {
      'unlock':          { label: 'Enter your PIN',    hint: '',                              icon: '🔒', forgot: true  },
      'setup-new':       { label: 'Create a 4-digit PIN', hint: 'Choose a PIN you will remember', icon: '🔐', forgot: false },
      'setup-confirm':   { label: 'Confirm your PIN',  hint: 'Enter the same PIN again',      icon: '🔐', forgot: false },
      'change-old':      { label: 'Enter current PIN', hint: 'Verify your identity first',    icon: '🔑', forgot: true  },
      'change-new':      { label: 'Enter new PIN',     hint: 'Choose your new 4-digit PIN',   icon: '🔐', forgot: false },
      'change-confirm':  { label: 'Confirm new PIN',   hint: 'Enter the new PIN again',       icon: '🔐', forgot: false },
    };

    const cfg = labels[newMode] || labels['unlock'];
    if (labelEl)  labelEl.textContent = cfg.label;
    if (hintEl)   hintEl.textContent  = cfg.hint;
    if (iconEl)   iconEl.textContent  = cfg.icon;
    if (forgotEl) forgotEl.style.display = cfg.forgot ? 'block' : 'none';
  }

  // ---------- KEY BINDING ----------
  function bindKeys() {
    document.querySelectorAll('.pin-key').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.key;
        if (key === 'del')   handleDel();
        else if (key === 'clear') handleClear();
        else handleDigit(key);
      });
    });
  }

  function bindKeyboard() {
    document.addEventListener('keydown', e => {
      const lockScreen = document.getElementById('pinLockScreen');
      if (!lockScreen || lockScreen.style.display === 'none') return;

      if (e.key >= '0' && e.key <= '9') handleDigit(e.key);
      else if (e.key === 'Backspace')    handleDel();
      else if (e.key === 'Escape')       handleClear();
    });
  }

  function bindForgotBtn() {
    document.getElementById('pinForgotBtn')?.addEventListener('click', () => {
      const confirmed = confirm(
        '⚠️ Reset PIN Lock?\n\nThis will remove your PIN. You will need to set a new one.\n\nClick OK to confirm.'
      );
      if (confirmed) resetPin();
    });
  }

  function bindSidebarLockBtn() {
    document.getElementById('sidebarLockBtn')?.addEventListener('click', () => {
      const isPinSet = localStorage.getItem(SETUP_KEY) === 'true';
      if (isPinSet) {
        // Change PIN flow
        showLock();
        setMode('change-old');
      } else {
        // Set PIN flow
        showLock();
        setMode('setup-new');
      }
    });
  }

  function updateSidebarLockBtn() {
    const isPinSet = localStorage.getItem(SETUP_KEY) === 'true';
    const label = document.getElementById('sidebarLockLabel');
    if (label) label.textContent = isPinSet ? 'Change PIN' : 'Set PIN Lock';
  }

  // ---------- DIGIT HANDLING ----------
  function handleDigit(digit) {
    if (isLockedOut()) return;
    if (currentInput.length >= 4) return;

    currentInput += digit;
    updateDots();
    animateKey(digit);

    if (currentInput.length === 4) {
      setTimeout(() => processPin(), 200);
    }
  }

  function handleDel() {
    if (currentInput.length > 0) {
      currentInput = currentInput.slice(0, -1);
      updateDots();
    }
  }

  function handleClear() {
    currentInput = '';
    updateDots();
    clearError();
  }

  // ---------- PROCESS PIN ----------
  function processPin() {
    if (mode === 'unlock')         processUnlock();
    else if (mode === 'setup-new') processSetupNew();
    else if (mode === 'setup-confirm') processSetupConfirm();
    else if (mode === 'change-old')    processChangeOld();
    else if (mode === 'change-new')    processChangeNew();
    else if (mode === 'change-confirm') processChangeConfirm();
  }

  function processUnlock() {
    if (verifyPin(currentInput)) {
      // Success
      attempts = 0;
      sessionStorage.setItem(SESSION_KEY, 'true');
      showSuccess();
      setTimeout(() => hideLock(), 600);
    } else {
      attempts++;
      if (attempts >= MAX_ATTEMPTS) {
        startLockout();
      } else {
        showError(`Wrong PIN! ${MAX_ATTEMPTS - attempts} attempts left`);
        shakeCard();
        currentInput = '';
        updateDots();
      }
    }
  }

  function processSetupNew() {
    firstPin = currentInput;   // save BEFORE setMode (setMode no longer resets it)
    setMode('setup-confirm');
  }

  function processSetupConfirm() {
    if (currentInput === firstPin) {
      savePin(currentInput);
      localStorage.setItem(SETUP_KEY, 'true');
      sessionStorage.setItem(SESSION_KEY, 'true');
      firstPin = '';
      updateSidebarLockBtn();
      showSuccess();
      showToast('✅ PIN set! App is now protected 🔒');
      setTimeout(() => hideLock(), 700);
    } else {
      showError("PINs don't match! Try again");
      shakeCard();
      firstPin = '';
      currentInput = '';
      updateDots();
      setTimeout(() => setMode('setup-new'), 1200);
    }
  }

  function processChangeOld() {
    if (verifyPin(currentInput)) {
      setMode('change-new');
    } else {
      showError('Wrong current PIN!');
      shakeCard();
      currentInput = '';
      updateDots();
    }
  }

  function processChangeNew() {
    firstPin = currentInput;   // save BEFORE setMode
    setMode('change-confirm');
  }

  function processChangeConfirm() {
    if (currentInput === firstPin) {
      savePin(currentInput);
      sessionStorage.setItem(SESSION_KEY, 'true');
      firstPin = '';
      showSuccess();
      showToast('✅ PIN changed successfully!');
      setTimeout(() => hideLock(), 700);
    } else {
      showError("PINs don't match! Try again");
      shakeCard();
      firstPin = '';
      currentInput = '';
      updateDots();
      setTimeout(() => setMode('change-new'), 1200);
    }
  }

  // ---------- PIN STORAGE ----------
  function hashPin(pin) {
    // Simple hash for localStorage (not cryptographic, just obfuscation)
    let hash = 0;
    const salt = 'lifeos_salt_2026';
    const str = pin + salt;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return hash.toString(36);
  }

  function savePin(pin) {
    localStorage.setItem(PIN_KEY, hashPin(pin));
  }

  function verifyPin(pin) {
    const stored = localStorage.getItem(PIN_KEY);
    return stored && stored === hashPin(pin);
  }

  function resetPin() {
    localStorage.removeItem(PIN_KEY);
    localStorage.removeItem(SETUP_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    attempts = 0;
    updateSidebarLockBtn();
    showToast('🔓 PIN removed. Set a new one.');
    setMode('setup-new');
  }

  // ---------- LOCKOUT ----------
  function startLockout() {
    lockoutUntil = Date.now() + LOCKOUT_MS;
    attempts = 0;
    runLockoutTimer();
  }

  function runLockoutTimer() {
    const update = () => {
      const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        clearError();
        currentInput = '';
        updateDots();
        return;
      }
      showError(`Too many attempts! Wait ${remaining}s`);
      lockoutTimer = setTimeout(update, 1000);
    };
    update();
  }

  function isLockedOut() {
    return Date.now() < lockoutUntil;
  }

  // ---------- UI UPDATES ----------
  function updateDots() {
    for (let i = 0; i < 4; i++) {
      const dot = document.getElementById('dot' + i);
      if (!dot) continue;
      dot.classList.toggle('filled', i < currentInput.length);
      if (i === currentInput.length - 1) {
        dot.classList.add('just-filled');
        setTimeout(() => dot.classList.remove('just-filled'), 150);
      }
    }
  }

  function showError(msg) {
    const el = document.getElementById('pinError');
    if (el) {
      el.textContent = msg;
      el.classList.add('visible');
    }
  }

  function clearError() {
    const el = document.getElementById('pinError');
    if (el) {
      el.textContent = '';
      el.classList.remove('visible');
    }
  }

  function showSuccess() {
    const icon = document.getElementById('pinLockIcon');
    if (icon) {
      icon.textContent = '✅';
      icon.classList.add('success-bounce');
    }
    document.querySelectorAll('.pin-dot').forEach(d => d.classList.add('success'));
  }

  function shakeCard() {
    const card = document.querySelector('.pin-lock-card');
    if (card) {
      card.classList.add('pin-shake');
      setTimeout(() => card.classList.remove('pin-shake'), 500);
    }
  }

  function animateKey(key) {
    const btn = document.querySelector(`.pin-key[data-key="${key}"]`);
    if (btn) {
      btn.classList.add('pin-key-press');
      setTimeout(() => btn.classList.remove('pin-key-press'), 150);
    }
  }

  function applyThemeToLock() {
    const theme = localStorage.getItem('lifeos_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
  }

  function showToast(msg) {
    let toast = document.getElementById('saveToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'saveToast';
      toast.className = 'save-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  }

  // ---------- AUTO LOCK ----------
  // Lock app when tab becomes hidden (optional — commented out by default)
  // document.addEventListener('visibilitychange', () => {
  //   if (document.hidden && localStorage.getItem(SETUP_KEY) === 'true') {
  //     sessionStorage.removeItem(SESSION_KEY);
  //     showLock();
  //     setMode('unlock');
  //   }
  // });

  // Public API
  return { init };

})();

// Boot immediately — before anything else
document.addEventListener('DOMContentLoaded', () => {
  Lock.init();
});
