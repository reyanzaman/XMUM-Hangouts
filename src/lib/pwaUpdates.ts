const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;
const UPDATE_CHECK_THROTTLE_MS = 60 * 1000;
const RELOAD_GUARD_KEY = 'xmum_pwa_update_reload_at';

/**
 * Registers the generated PWA worker and keeps installed app windows current.
 * Workbox is configured with skipWaiting + clientsClaim, so a controller change
 * means the new release is ready and the running document can safely reload.
 */
export const setupPwaUpdates = () => {
  if (!('serviceWorker' in navigator)) return () => undefined;

  let registration: ServiceWorkerRegistration | null = null;
  let updatePromise: Promise<void> | null = null;
  let lastUpdateCheckAt = 0;
  let reloadPending = false;
  const hadControllerAtStartup = Boolean(navigator.serviceWorker.controller);

  const reloadForUpdate = () => {
    if (!reloadPending || document.visibilityState !== 'visible') return;

    const now = Date.now();
    const previousReloadAt = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) || 0);
    if (now - previousReloadAt < 10_000) {
      reloadPending = false;
      return;
    }

    sessionStorage.setItem(RELOAD_GUARD_KEY, String(now));
    window.location.reload();
  };

  const checkForUpdate = async (force = false) => {
    const now = Date.now();
    if (!force && now - lastUpdateCheckAt < UPDATE_CHECK_THROTTLE_MS) return;
    if (updatePromise) return updatePromise;

    lastUpdateCheckAt = now;
    updatePromise = (async () => {
      try {
        registration ||= await navigator.serviceWorker.ready;
        await registration.update();
      } catch (error) {
        // Updating is best-effort. Offline launches must continue to use the
        // currently installed release without showing a technical error.
        if (import.meta.env.DEV) console.warn('PWA update check failed:', error);
      } finally {
        updatePromise = null;
      }
    })();

    return updatePromise;
  };

  const handleControllerChange = () => {
    // Do not reload when the app is installed for the first time. Reload only
    // when an already-controlled app receives a replacement worker.
    if (!hadControllerAtStartup) return;
    reloadPending = true;
    reloadForUpdate();
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState !== 'visible') return;
    reloadForUpdate();
    void checkForUpdate();
  };

  const handleFocus = () => {
    reloadForUpdate();
    void checkForUpdate();
  };

  navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('focus', handleFocus);
  window.addEventListener('online', handleFocus);

  void navigator.serviceWorker
    .register('/sw.js', { scope: '/', updateViaCache: 'none' })
    .then(currentRegistration => {
      registration = currentRegistration;
      return checkForUpdate(true);
    })
    .catch(error => {
      if (import.meta.env.DEV) console.warn('PWA service worker registration failed:', error);
    });

  const intervalId = window.setInterval(() => {
    if (navigator.onLine && document.visibilityState === 'visible') void checkForUpdate(true);
  }, UPDATE_CHECK_INTERVAL_MS);

  return () => {
    window.clearInterval(intervalId);
    navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('focus', handleFocus);
    window.removeEventListener('online', handleFocus);
  };
};
