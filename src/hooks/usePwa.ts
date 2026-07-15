import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getAuthenticatedHeaders } from '../lib/authHeaders';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export type PushState = 'checking' | 'unsupported' | 'insecure' | 'unavailable' | 'prompt' | 'enabled' | 'denied' | 'error';

const isStandaloneDisplay = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(character => character.charCodeAt(0)));
};

const applicationServerKeysMatch = (subscription: PushSubscription, expectedKey: Uint8Array) => {
  const currentKey = subscription.options.applicationServerKey;
  if (!currentKey) return false;
  const currentBytes = new Uint8Array(currentKey);
  return currentBytes.length === expectedKey.length && currentBytes.every((byte, index) => byte === expectedKey[index]);
};

export const usePwa = (userId?: string | null) => {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const installPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(() => isStandaloneDisplay());
  const [pushState, setPushState] = useState<PushState>('checking');
  const [pushError, setPushError] = useState('');
  const automaticPushSetupRef = useRef<string | null>(null);

  const platform = useMemo(() => {
    const ua = navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const android = /android/.test(ua);
    return { ios, android, mobile: ios || android };
  }, []);

  const basePushApisSupported = 'serviceWorker' in navigator && 'Notification' in window;
  const pushSupported = window.isSecureContext && basePushApisSupported;

  const refreshPushState = useCallback(async () => {
    setPushError('');
    if (!window.isSecureContext) {
      setPushState('insecure');
      return;
    }
    if (!basePushApisSupported) {
      setPushState('unsupported');
      return;
    }
    if (platform.ios && !isStandaloneDisplay()) {
      setPushState('unavailable');
      return;
    }
    if (Notification.permission === 'denied') {
      setPushState('denied');
      return;
    }
    try {
      const registration = await navigator.serviceWorker.ready;
      if (!registration.pushManager) {
        setPushState('unsupported');
        return;
      }
      const subscription = await registration.pushManager.getSubscription();
      setPushState(subscription ? 'enabled' : 'prompt');
    } catch (error) {
      setPushState('error');
      console.warn('Push state check failed:', error);
      setPushError('Notifications could not be checked on this device. Please try again.');
    }
  }, [basePushApisSupported, platform.ios]);

  useEffect(() => {
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      const promptEvent = event as BeforeInstallPromptEvent;
      installPromptRef.current = promptEvent;
      setInstallPrompt(promptEvent);
    };
    const handleInstalled = () => {
      installPromptRef.current = null;
      setInstallPrompt(null);
    };
    // Remove the old persistent marker. It could not detect an uninstall and
    // therefore produced stale "installed" states.
    try {
      localStorage.removeItem('xmum_pwa_installed_on_device');
    } catch {
      // Storage can be unavailable in restricted browsing modes.
    }
    const displayMode = window.matchMedia('(display-mode: standalone)');
    const syncDisplayMode = () => setIsInstalled(isStandaloneDisplay());
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    displayMode.addEventListener?.('change', syncDisplayMode);
    void refreshPushState();
    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
      displayMode.removeEventListener?.('change', syncDisplayMode);
    };
  }, [refreshPushState]);

  useEffect(() => {
    void refreshPushState();
  }, [userId, refreshPushState]);

  const install = useCallback(async () => {
    if (isStandaloneDisplay()) {
      setIsInstalled(true);
      return 'installed' as const;
    }
    const promptEvent = installPromptRef.current || installPrompt;
    if (!promptEvent) {
      return 'instructions' as const;
    }
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      installPromptRef.current = null;
      setInstallPrompt(null);
      if (choice.outcome === 'accepted') {
        return 'installed' as const;
      }
      return 'dismissed' as const;
    } catch {
      // Browsers can invalidate a captured prompt after navigation or when an
      // install dialog is already open. The manual path must remain usable.
      installPromptRef.current = null;
      setInstallPrompt(null);
      return 'instructions' as const;
    }
  }, [installPrompt]);

  const enablePush = useCallback(async () => {
    setPushError('');
    if (!userId) {
      setPushError('Please sign in before enabling notifications.');
      return false;
    }
    if (!window.isSecureContext) {
      setPushState('insecure');
      setPushError('Notifications aren’t available in this preview. Open the published website in Chrome and try again.');
      return false;
    }
    if (!basePushApisSupported) {
      setPushState('unsupported');
      return false;
    }
    if (platform.ios && !isStandaloneDisplay()) {
      setPushState('unavailable');
      setPushError('On iPhone or iPad, install XMUM Hangouts on your Home Screen first.');
      return false;
    }

    setPushState('checking');
    try {
      const permission = Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission();
      if (permission !== 'granted') {
        setPushState(permission === 'denied' ? 'denied' : 'prompt');
        return false;
      }

      const keyResponse = await fetch('/api/push/public-key');
      const keyPayload = await keyResponse.json().catch(() => ({}));
      if (!keyResponse.ok || !keyPayload.publicKey) {
        throw new Error(keyPayload.error || 'Push notifications are not configured on the server yet.');
      }

      const registration = await navigator.serviceWorker.ready;
      if (!registration.pushManager) {
        setPushState('unsupported');
        setPushError('Web Push is unavailable in this browsing mode. Open XMUM Hangouts directly in current Chrome or Safari.');
        return false;
      }
      const applicationServerKey = urlBase64ToUint8Array(keyPayload.publicKey);
      let existing = await registration.pushManager.getSubscription();
      if (existing && !applicationServerKeysMatch(existing, applicationServerKey)) {
        try {
          await fetch('/api/push/unsubscribe', {
            method: 'POST',
            headers: await getAuthenticatedHeaders(),
            body: JSON.stringify({ endpoint: existing.endpoint })
          });
        } catch {
          // The stale server endpoint will expire safely if cleanup is offline.
        }
        await existing.unsubscribe();
        existing = null;
      }
      const subscription = existing || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: await getAuthenticatedHeaders(),
        body: JSON.stringify({ subscription: subscription.toJSON() })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'We could not save this device for notifications.');
      setPushState('enabled');
      return true;
    } catch (error) {
      setPushState('error');
      console.warn('Push notification setup failed:', error);
      const message = error instanceof Error ? error.message : '';
      if (Notification.permission === 'denied') {
        setPushState('denied');
        setPushError("Notifications are blocked for this site. Allow them in Chrome's site settings, then try again.");
      } else if (/sign in again|authenticated user/i.test(message)) {
        setPushError('Your sign-in needs refreshing. Sign out, sign back in, then try notifications again.');
      } else if (/not configured|database connection|temporarily unavailable/i.test(message)) {
        setPushError('Notification setup is temporarily unavailable. Please try again shortly.');
      } else {
        setPushError('Chrome allowed notifications, but this device could not be connected yet. Please try again.');
      }
      return false;
    }
  }, [basePushApisSupported, platform.ios, userId]);

  // Browser permission and a working push subscription are separate. If Chrome
  // already has permission, repair a missing subscription after sign-in without
  // asking the user to grant that same permission again.
  useEffect(() => {
    if (!userId || !['prompt', 'enabled'].includes(pushState) || Notification.permission !== 'granted') return;
    if (automaticPushSetupRef.current === userId) return;
    automaticPushSetupRef.current = userId;
    void enablePush();
  }, [enablePush, pushState, userId]);

  const disablePush = useCallback(async () => {
    setPushError('');
    setPushState('checking');
    // An intentional opt-out must not trigger the automatic login repair.
    automaticPushSetupRef.current = userId || null;
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        try {
          const response = await fetch('/api/push/unsubscribe', {
            method: 'POST',
            headers: await getAuthenticatedHeaders(),
            body: JSON.stringify({ endpoint: subscription.endpoint })
          });
          if (!response.ok) {
            console.warn('The server could not immediately retire this push endpoint.');
          }
        } catch (error) {
          console.warn('The server push endpoint will expire after the browser disconnects:', error);
        }

        const unsubscribed = await subscription.unsubscribe();
        if (!unsubscribed) {
          throw new Error('The browser did not confirm that notifications were turned off.');
        }
      }
      setPushState('prompt');
      return true;
    } catch (error) {
      await refreshPushState();
      setPushError('Notifications could not be turned off on this device. Please try again.');
      return false;
    }
  }, [refreshPushState, userId]);

  return {
    ...platform,
    isInstalled,
    canPromptInstall: Boolean(installPrompt),
    install,
    pushSupported,
    notificationPermission: basePushApisSupported ? Notification.permission : 'default',
    pushState,
    pushError,
    enablePush,
    disablePush,
    refreshPushState
  };
};
