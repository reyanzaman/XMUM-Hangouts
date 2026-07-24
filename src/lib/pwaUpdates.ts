const UPDATE_CHECK_INTERVAL_MS = 5 * 60 * 1000;
const UPDATE_CHECK_THROTTLE_MS = 60 * 1000;

/**
 * Registers the generated PWA worker and keeps installed app windows current.
 * Checks are asynchronous and limited to visible, online windows. A downloaded
 * release takes effect on the user's next normal launch/navigation; an active
 * session is never reloaded automatically.
 */
export const setupPwaUpdates = () => {
  if (!('serviceWorker' in navigator)) return () => undefined;

  let registration: ServiceWorkerRegistration | null = null;
  let updatePromise: Promise<void> | null = null;
  let lastUpdateCheckAt = 0;

  const checkForUpdate = async (force = false) => {
    if (!navigator.onLine || document.visibilityState !== 'visible') return;
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
    // Let interested UI surfaces know an update is ready, but never interrupt
    // forms, chats, scrolling, or any other active work with a forced reload.
    window.dispatchEvent(new CustomEvent('xmum-pwa-update-ready'));
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState !== 'visible') return;
    void checkForUpdate();
  };

  const handleFocus = () => {
    void checkForUpdate();
  };

  const handlePageShow = () => {
    void checkForUpdate(true);
  };

  navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('focus', handleFocus);
  window.addEventListener('online', handleFocus);
  window.addEventListener('pageshow', handlePageShow);

  void navigator.serviceWorker
    .register('/sw.js', { scope: '/', updateViaCache: 'none' })
    .then(currentRegistration => {
      registration = currentRegistration;
      currentRegistration.addEventListener('updatefound', () => {
        const installingWorker = currentRegistration.installing;
        if (!installingWorker) return;
        installingWorker.addEventListener('statechange', () => {
          if (installingWorker.state !== 'installed' || !navigator.serviceWorker.controller) return;
          currentRegistration.waiting?.postMessage({ type: 'SKIP_WAITING' });
        });
      });
      currentRegistration.waiting?.postMessage({ type: 'SKIP_WAITING' });
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
    window.removeEventListener('pageshow', handlePageShow);
  };
};
