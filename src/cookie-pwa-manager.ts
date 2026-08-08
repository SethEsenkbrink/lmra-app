/**
 * src/cookie-pwa-manager.ts
 * Manages AVG Cookie Consent Banner & PWA Installation / Standalone Routing
 */

const GA_MEASUREMENT_ID = 'G-5MDH1F4RD3';

export function initCookieAndPwaManager(isAppPage: boolean = false) {
  // 1. Standalone Redirect for Installed PWA
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
  
  if (!isAppPage && isStandalone) {
    // If launched as installed PWA from home screen, bypass landing page and go directly to /app.html
    window.location.replace('/app.html');
    return;
  }

  // 2. Cookie Consent Manager
  initCookieConsent();

  // 3. PWA Install Prompt Manager
  initPwaInstallPrompt();
}

function initCookieConsent() {
  const consentChoice = localStorage.getItem('lmra_cookie_consent');

  if (consentChoice === 'accepted') {
    // User already accepted: load Google Analytics dynamically
    loadGoogleAnalytics();
  } else if (consentChoice === 'declined') {
    // User declined: disable Google Analytics
    (window as any)[`ga-disable-${GA_MEASUREMENT_ID}`] = true;
  } else {
    // No consent choice made yet: show banner, do NOT load Analytics until accepted
    renderCookieBanner();
  }
}

function loadGoogleAnalytics() {
  if (document.getElementById('ga-script')) return;

  const script = document.createElement('script');
  script.id = 'ga-script';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  (window as any).dataLayer = (window as any).dataLayer || [];
  function gtag(...args: any[]) {
    (window as any).dataLayer.push(args);
  }
  (window as any).gtag = gtag;
  gtag('js', new Date());
  gtag('config', GA_MEASUREMENT_ID);
}

function renderCookieBanner() {
  if (document.getElementById('cookieBanner')) return;

  const banner = document.createElement('div');
  banner.id = 'cookieBanner';
  banner.className = 'fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md bg-slate-900/95 backdrop-blur-md text-white p-5 rounded-2xl shadow-2xl border border-slate-700 z-50 transition-all duration-300 transform translate-y-0 text-sm';
  
  banner.innerHTML = `
    <div class="flex items-start gap-3">
      <div class="bg-blue-600/20 p-2.5 rounded-xl text-blue-400 shrink-0">
        <i class="fa-solid fa-cookie-bite text-xl"></i>
      </div>
      <div class="space-y-2">
        <h4 class="font-bold text-white text-base">Privacy & Cookies</h4>
        <p class="text-slate-300 text-xs leading-relaxed">
          LMRA Pro gebruikt noodzakelijke lokale opslag (IndexedDB) om rapporten op je toestel te bewaren. Optioneel gebruiken we geanonimiseerde Google Analytics voor webstatistieken.
        </p>
        <div class="pt-2 flex flex-wrap items-center gap-2">
          <button id="btnAcceptCookies" class="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition shadow-lg shadow-blue-600/30 cursor-pointer">
            Accepteren
          </button>
          <button id="btnRefuseCookies" class="bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium px-3 py-2 rounded-xl text-xs transition border border-slate-700 cursor-pointer">
            Alleen Functioneel
          </button>
          <a href="/privacy.html" class="text-blue-400 hover:underline text-xs ml-auto font-medium">
            Privacy Policy
          </a>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(banner);

  document.getElementById('btnAcceptCookies')?.addEventListener('click', () => {
    localStorage.setItem('lmra_cookie_consent', 'accepted');
    loadGoogleAnalytics();
    banner.remove();
  });

  document.getElementById('btnRefuseCookies')?.addEventListener('click', () => {
    localStorage.setItem('lmra_cookie_consent', 'declined');
    (window as any)[`ga-disable-${GA_MEASUREMENT_ID}`] = true;
    banner.remove();
  });
}

function initPwaInstallPrompt() {
  let deferredPrompt: any = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    const pwaInstallContainers = document.querySelectorAll('.pwa-install-trigger');
    pwaInstallContainers.forEach(container => {
      (container as HTMLElement).style.display = 'flex';
      container.addEventListener('click', async () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          console.log('[PWA] User response:', outcome);
          deferredPrompt = null;
          (container as HTMLElement).style.display = 'none';
        }
      });
    });
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        console.log('[PWA] ServiceWorker registered with scope:', reg.scope);
      }).catch((err) => {
        console.warn('[PWA] ServiceWorker registration failed:', err);
      });
    });
  }
}
