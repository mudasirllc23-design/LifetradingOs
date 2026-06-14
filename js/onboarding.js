/**
 * ONBOARDING MODULE
 * First-time setup: Name, Trading Level, Goal
 * Shows on first launch, skips after that
 */

const Onboarding = (() => {

  let currentStep = 1;
  let userData = {
    name: '',
    level: '',
    goal: '',
  };

  const TOTAL_STEPS = 5;

  // ---------- INIT ----------
  function init() {
    const isComplete = localStorage.getItem('lifeos_onboarding_done');
    if (isComplete) {
      // Already done — just load name
      loadUserName();
      return;
    }
    // First time — show onboarding
    showOnboarding();
    bindEvents();
  }

  // ---------- SHOW / HIDE ----------
  function showOnboarding() {
    const screen = document.getElementById('onboardingScreen');
    if (screen) screen.style.display = 'flex';
  }

  function hideOnboarding() {
    const screen = document.getElementById('onboardingScreen');
    if (screen) {
      screen.style.opacity = '0';
      screen.style.transition = 'opacity 0.5s ease';
      setTimeout(() => { screen.style.display = 'none'; }, 500);
    }
  }

  // ---------- BIND EVENTS ----------
  function bindEvents() {
    // Step 1 → 2
    document.getElementById('ob-next-1')?.addEventListener('click', () => goToStep(2));

    // Step 2 → 3 (name)
    document.getElementById('ob-next-2')?.addEventListener('click', () => {
      const name = document.getElementById('obNameInput')?.value.trim();
      if (!name) {
        shake(document.getElementById('obNameInput'));
        return;
      }
      userData.name = name;
      goToStep(3);
    });

    // Enter key on name input
    document.getElementById('obNameInput')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('ob-next-2')?.click();
    });

    // Step 3 options (trading level)
    document.querySelectorAll('#ob-step-3 .ob-option').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#ob-step-3 .ob-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        userData.level = btn.dataset.val;
        const nextBtn = document.getElementById('ob-next-3');
        if (nextBtn) nextBtn.style.opacity = '1';
      });
    });

    // Step 3 → 4
    document.getElementById('ob-next-3')?.addEventListener('click', () => {
      if (!userData.level) return;
      goToStep(4);
    });

    // Step 4 options (goal)
    document.querySelectorAll('#ob-step-4 .ob-option').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#ob-step-4 .ob-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        userData.goal = btn.dataset.val;
        const nextBtn = document.getElementById('ob-next-4');
        if (nextBtn) nextBtn.style.opacity = '1';
      });
    });

    // Step 4 → 5
    document.getElementById('ob-next-4')?.addEventListener('click', () => {
      if (!userData.goal) return;
      // Set final name
      const finalName = document.getElementById('obFinalName');
      if (finalName) finalName.textContent = userData.name;
      goToStep(5);
    });

    // Step 5 → Finish
    document.getElementById('ob-finish')?.addEventListener('click', () => {
      finishOnboarding();
    });
  }

  // ---------- NAVIGATION ----------
  function goToStep(step) {
    // Hide current
    const current = document.getElementById(`ob-step-${currentStep}`);
    if (current) {
      current.classList.remove('active');
      current.classList.add('exit');
      setTimeout(() => current.classList.remove('exit'), 400);
    }

    currentStep = step;

    // Show new
    setTimeout(() => {
      const next = document.getElementById(`ob-step-${step}`);
      if (next) next.classList.add('active');
    }, 150);

    // Update progress dots
    document.querySelectorAll('.ob-dot').forEach(dot => {
      const dotStep = parseInt(dot.dataset.step);
      dot.classList.toggle('active',    dotStep === step);
      dot.classList.toggle('completed', dotStep < step);
    });
  }

  // ---------- FINISH ----------
  function finishOnboarding() {
    // Save user data
    localStorage.setItem('lifeos_onboarding_done', 'true');
    localStorage.setItem('lifeos_user_name',  userData.name);
    localStorage.setItem('lifeos_user_level', userData.level);
    localStorage.setItem('lifeos_user_goal',  userData.goal);

    // Update dashboard name
    loadUserName();

    // Add welcome activity
    Storage.addActivity({
      icon: '🎉',
      text: `Welcome to LifeOS, ${userData.name}! Your journey starts today.`,
      color: '#3b82f6'
    });

    // Hide onboarding
    hideOnboarding();
  }

  // ---------- LOAD USER NAME ----------
  function loadUserName() {
    const name = localStorage.getItem('lifeos_user_name') || 'Trader';
    const el = document.getElementById('heroUserName');
    if (el) el.textContent = name + '!';

    // Also update sidebar if needed
    const sidebarName = document.getElementById('sidebarUserName');
    if (sidebarName) sidebarName.textContent = name;
  }

  // ---------- HELPERS ----------
  function shake(el) {
    if (!el) return;
    el.classList.add('shake');
    setTimeout(() => el.classList.remove('shake'), 400);
  }

  // Public
  return { init, loadUserName };

})();

// Boot immediately
document.addEventListener('DOMContentLoaded', () => {
  Onboarding.init();
});
