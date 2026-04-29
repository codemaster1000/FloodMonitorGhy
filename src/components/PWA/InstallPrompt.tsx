import { useEffect, useState } from "react";

const DISMISS_STORAGE_KEY = "floodmonitor.installPromptDismissedThisSession";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function isStandaloneDisplay() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.navigator.standalone === true
  );
}

function isIosDevice() {
  const userAgent = window.navigator.userAgent.toLowerCase();
  const platform = window.navigator.platform.toLowerCase();
  const isTouchMac =
    platform === "macintel" && window.navigator.maxTouchPoints > 1;

  return /iphone|ipad|ipod/.test(userAgent) || isTouchMac;
}

function hasDismissedPrompt() {
  try {
    return window.sessionStorage.getItem(DISMISS_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function persistDismissedPrompt() {
  try {
    window.sessionStorage.setItem(DISMISS_STORAGE_KEY, "true");
  } catch {
    // Ignore storage failures so private browsing modes can still dismiss.
  }
}

export default function InstallPrompt() {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIos] = useState(isIosDevice);

  useEffect(() => {
    if (isStandaloneDisplay() || hasDismissedPrompt()) {
      return;
    }

    const showTimer = window.setTimeout(() => setIsVisible(true), 900);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    const handleInstalled = () => {
      persistDismissedPrompt();
      setIsVisible(false);
      setInstallEvent(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.clearTimeout(showTimer);
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const handleDismiss = () => {
    persistDismissedPrompt();
    setIsVisible(false);
  };

  const handleInstall = async () => {
    if (!installEvent) {
      return;
    }

    await installEvent.prompt();
    const choice = await installEvent.userChoice;

    if (choice.outcome === "accepted") {
      persistDismissedPrompt();
    }

    setInstallEvent(null);
    setIsVisible(false);
  };

  const title = isIos ? "Add FloodMonitorGhy" : "Install FloodMonitorGhy";
  const message = isIos
    ? "On iPhone or iPad, tap Share, then choose Add to Home Screen."
    : "FloodMonitorGhy is better on the app. Install app now!";
  const canUseNativeInstall = installEvent != null;

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-x-4 bottom-5 z-40 mx-auto max-w-[28rem] rounded-2xl border border-slate-200 bg-white p-4 text-left text-slate-950 shadow-[0_12px_28px_rgba(15,23,42,0.16)] sm:left-6 sm:right-auto sm:mx-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <img
            src="/pwa-icon-192.svg"
            alt=""
            aria-hidden="true"
            className="h-12 w-12 shrink-0 rounded-2xl shadow-[0_8px_18px_rgba(14,165,233,0.22)]"
          />
          <h2 className="min-w-0 text-lg font-semibold leading-tight text-slate-950">
            {title}
          </h2>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss install prompt"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-950 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>

      <p className="mt-3 text-sm font-normal leading-snug text-slate-600">
        {message}
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        {!isIos ? (
          <button
            type="button"
            onClick={handleInstall}
            disabled={!canUseNativeInstall}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-xs font-medium leading-none text-white shadow-[0_10px_22px_rgba(14,165,233,0.22)] transition hover:bg-sky-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2"
            title={
              canUseNativeInstall
                ? "Install FloodMonitorGhy"
                : "Install prompt is available from the production PWA build."
            }
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="21"
              height="21"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 3v12" />
              <path d="m7 10 5 5 5-5" />
              <path d="M5 21h14" />
            </svg>
            Install
          </button>
        ) : (
          <div className="inline-flex items-center gap-2 rounded-xl bg-sky-50 px-3 py-2 text-xs font-medium leading-none text-sky-700">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 16V4" />
              <path d="m7 9 5-5 5 5" />
              <path d="M20 16v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4" />
            </svg>
            Share then Add to Home Screen
          </div>
        )}
        <button
          type="button"
          onClick={handleDismiss}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium leading-none text-slate-950 shadow-[0_4px_10px_rgba(15,23,42,0.12)] transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          Later
        </button>
      </div>
    </div>
  );
}
