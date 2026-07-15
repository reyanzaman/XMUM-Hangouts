import React, { useRef, useState } from 'react';
import { BellRing, Check, Download, MonitorSmartphone, Share, Smartphone, Sparkles } from 'lucide-react';
import { Logo } from './Logo';
import { PushState } from '../hooks/usePwa';

interface GetAppPageProps {
  isSignedIn: boolean;
  isInstalled: boolean;
  isIos: boolean;
  isAndroid: boolean;
  canPromptInstall: boolean;
  pushState: PushState;
  notificationPermission: NotificationPermission;
  pushError: string;
  onInstall: () => Promise<'installed' | 'instructions' | 'dismissed'>;
  onEnablePush: () => Promise<boolean>;
  onDisablePush: () => Promise<boolean>;
  onRequestLogin: () => void;
}

const Step: React.FC<{ number: number; children: React.ReactNode }> = ({ number, children }) => (
  <div className="flex items-start gap-3">
    <span className="w-7 h-7 rounded-full bg-rose-500 text-white text-xs font-black flex items-center justify-center shrink-0 shadow-sm">
      {number}
    </span>
    <p className="text-sm text-slate-600 font-semibold leading-relaxed pt-0.5">{children}</p>
  </div>
);

export const GetAppPage: React.FC<GetAppPageProps> = ({
  isSignedIn,
  isInstalled,
  isIos,
  isAndroid,
  canPromptInstall,
  pushState,
  notificationPermission,
  pushError,
  onInstall,
  onEnablePush,
  onDisablePush,
  onRequestLogin
}) => {
  const pushEnabled = pushState === 'enabled';
  const installGuideRef = useRef<HTMLElement>(null);
  const [installMessage, setInstallMessage] = useState('');
  const [installing, setInstalling] = useState(false);

  const showInstallGuide = (message: string) => {
    setInstallMessage(message);
    window.setTimeout(() => installGuideRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
  };

  const handleInstall = async () => {
    setInstalling(true);
    setInstallMessage('');
    const result = await onInstall();
    setInstalling(false);

    if (result === 'instructions') {
      showInstallGuide(
        isIos
          ? 'iPhone and iPad install through Safari’s Share menu. Follow these steps:'
          : isAndroid
            ? 'In Chrome, tap the ⋮ menu and choose Install app or Add to Home screen:'
            : 'Use your browser’s Install app or Add to Home Screen option:'
      );
    } else if (result === 'dismissed') {
      showInstallGuide('Installation was cancelled. Tap Install app above to try again, or use the browser-menu steps below.');
    } else {
      setInstallMessage('Installation accepted. Look for XMUM Hangouts on your Home Screen or in your device’s apps.');
    }
  };

  return (
    <div id="get-app-page" className="space-y-5 sm:space-y-7 max-w-5xl mx-auto">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-500 via-rose-500 to-amber-400 text-white p-6 sm:p-10 shadow-lg">
        <div className="absolute -right-10 -top-14 w-44 h-44 bg-white/10 rounded-full" />
        <div className="absolute right-20 -bottom-20 w-40 h-40 bg-amber-200/20 rounded-full" />
        <div className="relative flex flex-col sm:flex-row items-center gap-5 sm:gap-8 text-center sm:text-left">
          <div className="relative shrink-0">
            <div className="w-24 h-24 sm:w-28 sm:h-28 bg-white rounded-[2rem] shadow-xl flex items-center justify-center">
              <Logo size="lg" />
            </div>
            <span className="absolute -right-2 -bottom-2 bg-amber-300 text-amber-900 rounded-full p-2 shadow-md">
              <Sparkles className="w-5 h-5" />
            </span>
          </div>
          <div className="space-y-3 flex-1">
            <p className="uppercase tracking-[0.22em] text-[10px] sm:text-xs font-black text-rose-100">Your campus circle, one tap away</p>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight">Get the Hangouts App</h1>
            <p className="text-sm sm:text-base text-rose-50 font-semibold leading-relaxed max-w-2xl">
              Install it directly from this website. It stays in sync automatically and uses no app store.
            </p>
            <button
              id="get-app-install-button"
              onClick={() => void handleInstall()}
              disabled={installing}
              className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-black shadow-md transition-all hover:scale-[1.02] active:scale-95 cursor-pointer disabled:cursor-wait disabled:opacity-75 ${
                'bg-white hover:bg-rose-50 text-rose-600'
              }`}
            >
              <Download className="w-4 h-4" />
              {installing ? 'Opening installer…' : isIos || isInstalled ? 'Installation instructions' : 'Install app'}
            </button>
            {installMessage && (
              <p role="status" aria-live="polite" className="max-w-xl rounded-xl bg-white/15 border border-white/20 px-3 py-2 text-xs font-bold text-white">
                {installMessage}
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-5">
        <section ref={installGuideRef} id="app-install-guide" className="bg-white border border-rose-100 rounded-3xl p-5 sm:p-7 shadow-sm space-y-5 scroll-mt-24">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-slate-800">Install on {isIos ? 'iPhone or iPad' : isAndroid ? 'Android' : 'your device'}</h2>
              <p className="text-xs text-slate-400 font-semibold">Usually takes less than a minute</p>
            </div>
          </div>

          {isIos ? (
            <div className="space-y-4">
              <Step number={1}>Open this page in Safari.</Step>
              <Step number={2}>Tap the <span className="inline-flex items-center gap-1 text-rose-500"><Share className="w-4 h-4" /> Share</span> button at the bottom of Safari.</Step>
              <Step number={3}>Scroll and choose <strong className="text-slate-800">Add to Home Screen</strong>, then tap Add.</Step>
            </div>
          ) : canPromptInstall ? (
            <div className="space-y-4">
              <Step number={1}>Tap the Install app button above.</Step>
              <Step number={2}>Confirm Install in your browser’s message.</Step>
              <Step number={3}>Open XMUM Hangouts from your Home Screen.</Step>
            </div>
          ) : (
            <div className="space-y-4">
              <Step number={1}>Open your browser menu (usually ⋮ or Share).</Step>
              <Step number={2}>Choose <strong className="text-slate-800">Install app</strong> or <strong className="text-slate-800">Add to Home Screen</strong>.</Step>
              <Step number={3}>Follow the browser confirmation and look for the app icon.</Step>
            </div>
          )}

        </section>

        <section className="bg-white border border-amber-100 rounded-3xl p-5 sm:p-7 shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-slate-800">Push notifications</h2>
              <p className="text-xs text-slate-400 font-semibold">Requests, approvals, chats and reminders</p>
            </div>
          </div>

          <p className="text-sm text-slate-600 font-semibold leading-relaxed">
            Enable notifications to receive important updates even when XMUM Hangouts is closed. You stay in control and can turn them off here anytime.
          </p>

          {pushState === 'unavailable' && isIos && !isInstalled && (
            <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4 text-xs font-bold text-amber-800 leading-relaxed">
              Apple enables push notifications after the app is added to your Home Screen. Install it first, open it there, then return to this page.
            </div>
          )}
          {pushState === 'denied' && (
            <div className="rounded-2xl bg-rose-50 border border-rose-100 p-4 text-xs font-bold text-rose-700 leading-relaxed">
              Notifications are blocked in your device settings. Allow them for XMUM Hangouts, then reopen this page.
            </div>
          )}
          {pushState === 'unsupported' && (
            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 text-xs font-bold text-slate-600 leading-relaxed">
              Web Push is unavailable in this browsing mode. Open XMUM Hangouts directly in current Chrome, Safari, Edge, or Samsung Internet.
            </div>
          )}
          {pushState === 'insecure' && (
            <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4 text-xs font-bold text-amber-800 leading-relaxed">
              Notifications aren’t available in this preview. Open the published XMUM Hangouts website in Chrome and try again.
            </div>
          )}
          {pushError && <p className="text-xs font-bold text-rose-600">{pushError}</p>}

          {!isSignedIn ? (
            <button onClick={onRequestLogin} className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-black cursor-pointer transition-colors">
              Sign in to enable notifications
            </button>
          ) : pushEnabled ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-100 py-3 text-emerald-700 text-sm font-black">
                <Check className="w-4 h-4" /> Notifications enabled
              </div>
              <button onClick={() => void onDisablePush()} className="w-full text-xs font-bold text-slate-400 hover:text-rose-500 cursor-pointer">
                Turn off on this device
              </button>
            </div>
          ) : (
            <button
              id="enable-push-button"
              onClick={() => void onEnablePush()}
              disabled={pushState === 'checking' || pushState === 'insecure' || pushState === 'unavailable' || pushState === 'unsupported' || pushState === 'denied'}
              className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl bg-amber-400 hover:bg-amber-500 disabled:bg-slate-200 disabled:text-slate-400 text-amber-950 text-sm font-black cursor-pointer disabled:cursor-not-allowed transition-colors"
            >
              <BellRing className="w-4 h-4" /> {pushState === 'checking'
                ? 'Checking this device…'
                : notificationPermission === 'granted'
                  ? 'Re-enable notifications'
                  : 'Enable notifications'}
            </button>
          )}
        </section>
      </div>

      <section className="grid sm:grid-cols-3 gap-3">
        {[
          { icon: MonitorSmartphone, title: 'Always in sync', text: 'Website updates automatically reach the installed app.' },
          { icon: BellRing, title: 'Timely updates', text: 'Receive the same trusted updates shown in your notification bell.' },
          { icon: Download, title: 'No app store', text: 'Install directly from this website at no cost.' }
        ].map(item => (
          <div key={item.title} className="bg-white border border-slate-100 rounded-2xl p-4 flex sm:block items-center gap-3 text-left sm:text-center shadow-sm">
            <item.icon className="w-5 h-5 text-rose-500 shrink-0 sm:mx-auto sm:mb-2" />
            <div>
              <h3 className="text-sm font-black text-slate-800">{item.title}</h3>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed mt-1">{item.text}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
};
