/**
 * INSTALL.JS
 * Captures the browser's native PWA install prompt and exposes it through
 * in-app buttons (sidebar + dashboard banner) instead of relying on the
 * person to find "Add to Home Screen" buried in the browser menu.
 *
 * How it works:
 * - Chrome/Edge/Android fire `beforeinstallprompt` when the PWA criteria
 *   are met (valid manifest, service worker, HTTPS). We intercept that
 *   event, stash it, and reveal our own buttons.
 * - Clicking our button replays the saved native prompt.
 * - iOS Safari never fires this event (Apple doesn't support it), so we
 *   show a one-time instructional banner for "Add to Home Screen" instead.
 */

const Install = (() => {

  let deferredPrompt = null;
  const DISMISS_KEY = 'lifeos_install_banner_dismissed';

  function init() {
    bindButtons();

    // Standard PWA install flow (Chrome, Edge, Android)
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      deferredPrompt = e;
      showInstallUI();
    });

    // Hide everything once the app is actually installed
    window.addEventListener('appinstalled', () => {
      deferredPrompt = null;
      hideInstallUI();
      localStorage.setItem(DISMISS_KEY, 'true');
      showToast('🎉 LifeOS installed! Find it on your home screen.');
    });

    // Already running as an installed app — nothing to prompt for
    if (isStandalone()) {
      hideInstallUI();
      return;
    }

    // iOS Safari has no beforeinstallprompt — show manual instructions
    // once, unless the person already dismissed it before.
    if (isIos() && isSafari() && localStorage.getItem(DISMISS_KEY) !== 'true') {
      showIosInstallUI();
    }
  }

  function bindButtons() {
    document.getElementById('sidebarInstallBtn')?.addEventListener('click', triggerInstall);
    document.getElementById('installBannerBtn')?.addEventListener('click', triggerInstall);
    document.getElementById('installBannerClose')?.addEventListener('click', () => {
      localStorage.setItem(DISMISS_KEY, 'true');
      hideInstallUI();
    });
  }

  async function triggerInstall() {
    if (!deferredPrompt) {
      // iOS or a browser that doesn't support the prompt — show instructions
      if (isIos()) {
        showToast('📲 Tap Share → "Add to Home Screen" to install.');
      }
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      showToast('Installing LifeOS...');
    }
    deferredPrompt = null;
    hideInstallUI();
  }

  function showInstallUI() {
    if (localStorage.getItem(DISMISS_KEY) === 'true') return;
    document.getElementById('sidebarInstallBtn')?.style.removeProperty('display');
    const banner = document.getElementById('installBanner');
    if (banner) banner.style.display = 'flex';
  }

  function showIosInstallUI() {
    const banner = document.getElementById('installBanner');
    const textEl = banner?.querySelector('.install-banner-text');
    if (textEl) {
      textEl.innerHTML = '<strong>Install LifeOS on this iPhone</strong><span>Tap the Share icon below, then "Add to Home Screen".</span>';
    }
    const btn = document.getElementById('installBannerBtn');
    if (btn) btn.textContent = 'Show me how';
    if (banner) banner.style.display = 'flex';
  }

  function hideInstallUI() {
    const sidebarBtn = document.getElementById('sidebarInstallBtn');
    if (sidebarBtn) sidebarBtn.style.display = 'none';
    const banner = document.getElementById('installBanner');
    if (banner) banner.style.display = 'none';
  }

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true; // iOS Safari flag
  }

  function isIos() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }

  function isSafari() {
    return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  }

  function showToast(msg) {
    let t = document.getElementById('saveToast');
    if (!t) { t = document.createElement('div'); t.id = 'saveToast'; t.className = 'save-toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3200);
  }

  return { init };

})();

document.addEventListener('DOMContentLoaded', () => Install.init());
