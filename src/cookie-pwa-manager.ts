/**
 * src/cookie-pwa-manager.ts
 * AVG-cookiebanner, Google Analytics consent en PWA-installatie/routing.
 *
 * AVG-uitgangspunten die hier zijn geïmplementeerd:
 *  - Geen enkele analytics-cookie of -script vóór expliciete toestemming.
 *  - Weigeren is net zo eenvoudig en even prominent als accepteren.
 *  - Toestemming is op elk moment in te trekken of te wijzigen
 *    (menu -> Cookievoorkeuren, of de link in de footer van de website).
 *  - Bij weigeren of intrekken worden bestaande _ga-cookies actief verwijderd.
 */

const GA_MEASUREMENT_ID = 'G-5MDH1F4RD3';
const CONSENT_KEY = 'lmra_cookie_consent';
const CONSENT_DATE_KEY = 'lmra_cookie_consent_date';

export type ConsentValue = 'accepted' | 'declined' | null;

export function getConsent(): ConsentValue {
    try {
        const value = localStorage.getItem(CONSENT_KEY);
        return value === 'accepted' || value === 'declined' ? value : null;
    } catch {
        return null;
    }
}

function storeConsent(value: Exclude<ConsentValue, null>): void {
    try {
        localStorage.setItem(CONSENT_KEY, value);
        localStorage.setItem(CONSENT_DATE_KEY, new Date().toISOString());
    } catch {
        /* privémodus: keuze geldt dan alleen voor deze sessie */
    }
}

export function initCookieAndPwaManager(isAppPage: boolean = false): void {
    // 1. Geïnstalleerde PWA start direct de app, niet de landingspagina.
    const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;

    if (!isAppPage && isStandalone) {
        window.location.replace('/app.html');
        return;
    }

    // 2. Cookie consent
    const consent = getConsent();
    if (consent === 'accepted') {
        loadGoogleAnalytics();
    } else if (consent === 'declined') {
        disableGoogleAnalytics();
    } else {
        renderCookieBanner(false);
    }

    // 3. Voorkeuren-link in de footer van de website
    document.getElementById('btnCookieSettingsLanding')?.addEventListener('click', (e) => {
        e.preventDefault();
        showCookiePreferences();
    });

    // 4. PWA install prompt + service worker
    initPwaInstallPrompt();
}

/** Opent de banner opnieuw zodat de gebruiker zijn keuze kan wijzigen. */
export function showCookiePreferences(): void {
    document.getElementById('cookieBanner')?.remove();
    renderCookieBanner(true);
}

/* ------------------------------------------------------------------ analytics */

function loadGoogleAnalytics(): void {
    (window as any)[`ga-disable-${GA_MEASUREMENT_ID}`] = false;
    if (document.getElementById('ga-script')) return;

    const script = document.createElement('script');
    script.id = 'ga-script';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);

    (window as any).dataLayer = (window as any).dataLayer || [];
    function gtag(...args: any[]): void {
        (window as any).dataLayer.push(args);
    }
    (window as any).gtag = gtag;

    // Consent Mode: analytics toegestaan, advertentiecookies expliciet geweigerd.
    gtag('consent', 'default', {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        analytics_storage: 'granted',
    });
    gtag('js', new Date());
    gtag('config', GA_MEASUREMENT_ID, {
        anonymize_ip: true,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
    });
}

function disableGoogleAnalytics(): void {
    (window as any)[`ga-disable-${GA_MEASUREMENT_ID}`] = true;
    document.getElementById('ga-script')?.remove();
    deleteAnalyticsCookies();
}

function deleteAnalyticsCookies(): void {
    const host = window.location.hostname;
    const domains = [host, `.${host}`, `.${host.split('.').slice(-2).join('.')}`];
    document.cookie.split(';').forEach((raw) => {
        const name = raw.split('=')[0]?.trim();
        if (!name) return;
        if (!name.startsWith('_ga') && !name.startsWith('_gid') && !name.startsWith('_gat')) return;
        domains.forEach((domain) => {
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${domain}`;
        });
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    });
}

/** Optioneel event loggen, alleen wanneer toestemming is gegeven. */
export function trackEvent(name: string, params: Record<string, unknown> = {}): void {
    if (getConsent() !== 'accepted') return;
    const gtag = (window as any).gtag;
    if (typeof gtag === 'function') gtag('event', name, params);
}

/* --------------------------------------------------------------------- banner */

function renderCookieBanner(isPreferences: boolean): void {
    if (document.getElementById('cookieBanner')) return;

    const current = getConsent();
    const statusLine = isPreferences
        ? `<p class="text-[11px] text-slate-400">Huidige keuze: <strong class="text-white">${
              current === 'accepted' ? 'Statistieken toegestaan' : current === 'declined' ? 'Alleen functioneel' : 'nog niet gekozen'
          }</strong></p>`
        : '';

    const banner = document.createElement('div');
    banner.id = 'cookieBanner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookievoorkeuren');
    banner.className =
        'fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md bg-slate-900/95 backdrop-blur-md ' +
        'text-white p-5 rounded-2xl shadow-2xl border border-slate-700 z-[70] transition-all duration-300 text-sm';

    banner.innerHTML = `
    <div class="flex items-start gap-3">
      <div class="bg-blue-600/20 p-2.5 rounded-xl text-blue-400 shrink-0">
        <i class="fa-solid fa-cookie-bite text-xl"></i>
      </div>
      <div class="space-y-2 w-full">
        <h4 class="font-bold text-white text-base">Privacy &amp; Cookies</h4>
        <p class="text-slate-300 text-xs leading-relaxed">
          LMRA Pro bewaart je rapporten <strong>alleen op dit toestel</strong> (IndexedDB) — dat is
          noodzakelijk voor de werking en staat altijd aan. Daarnaast kun je optioneel geanonimiseerde
          Google Analytics-statistieken toestaan, zodat we zien welke functies gebruikt worden.
          Zonder toestemming wordt Analytics niet geladen.
        </p>
        ${statusLine}
        <div class="pt-2 grid grid-cols-2 gap-2">
          <button id="btnAcceptCookies" type="button" class="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition shadow-lg shadow-blue-600/30 cursor-pointer">
            Statistieken toestaan
          </button>
          <button id="btnRefuseCookies" type="button" class="bg-slate-700 hover:bg-slate-600 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition border border-slate-600 cursor-pointer">
            Alleen functioneel
          </button>
        </div>
        <div class="pt-1 flex items-center justify-between">
          <a href="/privacy.html" class="text-blue-400 hover:underline text-[11px] font-medium">Privacyverklaring</a>
          ${
              isPreferences
                  ? '<button id="btnCloseCookieBanner" type="button" class="text-slate-400 hover:text-white text-[11px] font-medium cursor-pointer">Sluiten</button>'
                  : ''
          }
        </div>
      </div>
    </div>
  `;

    document.body.appendChild(banner);

    document.getElementById('btnAcceptCookies')?.addEventListener('click', () => {
        storeConsent('accepted');
        loadGoogleAnalytics();
        banner.remove();
    });

    document.getElementById('btnRefuseCookies')?.addEventListener('click', () => {
        storeConsent('declined');
        disableGoogleAnalytics();
        banner.remove();
    });

    document.getElementById('btnCloseCookieBanner')?.addEventListener('click', () => banner.remove());
}

/* ------------------------------------------------------------------ PWA */

function initPwaInstallPrompt(): void {
    let deferredPrompt: any = null;
    let listenersAttached = false;

    const attachTriggers = (): void => {
        const triggers = document.querySelectorAll('.pwa-install-trigger');
        triggers.forEach((container) => {
            (container as HTMLElement).style.display = 'flex';
        });
        if (listenersAttached) return;
        listenersAttached = true;

        triggers.forEach((container) => {
            container.addEventListener('click', async () => {
                if (!deferredPrompt) return;
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console.log('[PWA] Keuze gebruiker:', outcome);
                deferredPrompt = null;
                (container as HTMLElement).style.display = 'none';
            });
        });
    };

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        attachTriggers();
    });

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker
                .register('/sw.js')
                .then((reg) => console.log('[PWA] ServiceWorker actief op scope:', reg.scope))
                .catch((err) => console.warn('[PWA] ServiceWorker registratie mislukt:', err));
        });
    }
}
