/**
 * src/diagnostics.ts - LMRA Pro Live Diagnostics Console
 *
 * Doel: bugs opsporen tijdens ECHT gebruik op de werkvloer, zonder laptop of
 * USB-debugging. Vangt fouten op, logt netwerkcalls, toont device-status en kan
 * zelftests draaien (GPS, weer-API, microfoon, canvas, opslag, offline).
 *
 * Openen:
 *   - Menu -> "Diagnose & Logs"
 *   - URL: /app.html?debug=1
 *   - 5x snel tikken op de titel in de header
 *   - Desktop: Ctrl + Shift + D
 *
 * Alles blijft lokaal op het toestel. Er wordt niets verstuurd.
 */

import { APP_VERSION, APP_RELEASE_NAME, APP_LABEL, APP_FULL_LABEL } from './config';
import { fetchWithTimeout, getConnectionInfo } from './net';

export type DiagLevel = 'debug' | 'info' | 'warn' | 'error';

export interface DiagLogEntry {
    ts: number;
    level: DiagLevel;
    src: string;
    msg: string;
}

export type DiagStatus = 'ok' | 'warn' | 'fail' | 'skip';

export interface DiagTestResult {
    name: string;
    status: DiagStatus;
    detail: string;
    ms: number;
}

const LOG_STORAGE_KEY = 'lmra_debug_log';
const ENABLED_KEY = 'lmra_debug_enabled';
const MAX_ENTRIES = 400;
const MAX_PERSISTED = 150;

const LEVEL_COLORS: Record<DiagLevel, string> = {
    debug: '#94a3b8',
    info: '#38bdf8',
    warn: '#fbbf24',
    error: '#f87171',
};

const STATUS_STYLE: Record<DiagStatus, { color: string; icon: string }> = {
    ok: { color: '#34d399', icon: '✔' },
    warn: { color: '#fbbf24', icon: '!' },
    fail: { color: '#f87171', icon: '✖' },
    skip: { color: '#94a3b8', icon: '–' },
};

function escapeHtml(input: string): string {
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function clock(ts: number): string {
    const d = new Date(ts);
    const pad = (n: number, len = 2) => String(n).padStart(len, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}

function stamp(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

function shortenUrl(url: string): string {
    try {
        const u = new URL(url, window.location.origin);
        const path = u.pathname.length > 40 ? `${u.pathname.slice(0, 40)}…` : u.pathname;
        return u.origin === window.location.origin ? path : `${u.host}${path}`;
    } catch {
        return url.length > 60 ? `${url.slice(0, 60)}…` : url;
    }
}

export const Diagnostics = {
    buffer: [] as DiagLogEntry[],
    tests: [] as DiagTestResult[],
    enabled: false,
    isOpen: false,
    activeTab: 'log' as 'log' | 'system' | 'tests',
    hooksInstalled: false,
    persistTimer: null as number | null,
    panel: null as HTMLElement | null,
    tapCount: 0,
    tapTimer: null as number | null,
    counters: { errors: 0, warnings: 0, failedRequests: 0 },

    /* ------------------------------------------------------------------ init */

    init(): void {
        this.restoreLog();
        this.installHooks();

        const params = new URLSearchParams(window.location.search);
        if (params.get('debug') === '1') {
            localStorage.setItem(ENABLED_KEY, '1');
        }
        if (params.get('debug') === '0') {
            localStorage.removeItem(ENABLED_KEY);
        }
        this.enabled = localStorage.getItem(ENABLED_KEY) === '1';

        this.installActivation();

        this.log('info', 'app', `${APP_FULL_LABEL} gestart (${this.isStandalone() ? 'PWA standalone' : 'browser'})`);
        this.log('debug', 'net', this.describeConnection());

        if (this.enabled) {
            this.mountFab();
        }
    },

    /* ------------------------------------------------------------- logging */

    log(level: DiagLevel, src: string, msg: string): void {
        const entry: DiagLogEntry = { ts: Date.now(), level, src, msg: String(msg).slice(0, 600) };
        this.buffer.push(entry);
        if (this.buffer.length > MAX_ENTRIES) {
            this.buffer.splice(0, this.buffer.length - MAX_ENTRIES);
        }
        if (level === 'error') this.counters.errors++;
        if (level === 'warn') this.counters.warnings++;

        this.schedulePersist();
        if (this.isOpen && this.activeTab === 'log') this.renderLog();
        this.updateFabBadge();
    },

    schedulePersist(): void {
        if (this.persistTimer !== null) return;
        this.persistTimer = window.setTimeout(() => {
            this.persistTimer = null;
            try {
                const tail = this.buffer.slice(-MAX_PERSISTED);
                localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(tail));
            } catch {
                /* opslag vol of geblokkeerd: logs blijven dan alleen in geheugen */
            }
        }, 1500);
    },

    restoreLog(): void {
        try {
            const raw = localStorage.getItem(LOG_STORAGE_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw) as DiagLogEntry[];
            if (Array.isArray(parsed)) {
                this.buffer = parsed.filter((e) => e && typeof e.ts === 'number').slice(-MAX_PERSISTED);
                if (this.buffer.length > 0) {
                    this.buffer.push({
                        ts: Date.now(),
                        level: 'debug',
                        src: 'diag',
                        msg: `--- nieuwe sessie (${this.buffer.length} regels bewaard van vorige sessie) ---`,
                    });
                }
            }
        } catch {
            /* corrupte log negeren */
        }
    },

    clearLog(): void {
        this.buffer = [];
        this.counters = { errors: 0, warnings: 0, failedRequests: 0 };
        try {
            localStorage.removeItem(LOG_STORAGE_KEY);
        } catch {
            /* niets */
        }
        this.log('info', 'diag', 'Log gewist');
    },

    /* --------------------------------------------------------------- hooks */

    installHooks(): void {
        if (this.hooksInstalled) return;
        this.hooksInstalled = true;

        window.addEventListener('error', (event: ErrorEvent) => {
            const target = event.target as HTMLElement | null;
            if (target && target !== (window as unknown as HTMLElement) && (target as any).tagName) {
                const src = (target as any).src || (target as any).href || '';
                this.log('error', 'resource', `${(target as any).tagName} kon niet laden: ${shortenUrl(String(src))}`);
                return;
            }
            const where = event.filename ? ` @ ${shortenUrl(event.filename)}:${event.lineno}` : '';
            this.log('error', 'js', `${event.message}${where}`);
        }, true);

        window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
            const reason = event.reason;
            const msg = reason instanceof Error ? `${reason.name}: ${reason.message}` : String(reason);
            this.log('error', 'promise', msg);
        });

        const origError = console.error.bind(console);
        console.error = (...args: unknown[]) => {
            this.log('error', 'console', args.map((a) => this.stringify(a)).join(' '));
            origError(...args);
        };

        const origWarn = console.warn.bind(console);
        console.warn = (...args: unknown[]) => {
            this.log('warn', 'console', args.map((a) => this.stringify(a)).join(' '));
            origWarn(...args);
        };

        // Netwerkcalls meten: cruciaal om te zien of de fabriek de API blokkeert.
        const origFetch = window.fetch.bind(window);
        window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
            const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
            const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
            const started = performance.now();
            try {
                const res = await origFetch(input as RequestInfo, init);
                const ms = Math.round(performance.now() - started);
                const level: DiagLevel = res.ok ? 'debug' : 'warn';
                if (!res.ok) this.counters.failedRequests++;
                this.log(level, 'net', `${method} ${shortenUrl(url)} -> ${res.status} (${ms}ms)`);
                return res;
            } catch (err) {
                const ms = Math.round(performance.now() - started);
                this.counters.failedRequests++;
                const msg = err instanceof Error ? err.message : String(err);
                this.log('error', 'net', `${method} ${shortenUrl(url)} -> MISLUKT na ${ms}ms (${msg})`);
                throw err;
            }
        };

        window.addEventListener('online', () => this.log('info', 'net', `Online. ${this.describeConnection()}`));
        window.addEventListener('offline', () => this.log('warn', 'net', 'Offline gegaan'));
    },

    stringify(value: unknown): string {
        if (value instanceof Error) return `${value.name}: ${value.message}`;
        if (typeof value === 'string') return value;
        try {
            return JSON.stringify(value);
        } catch {
            return String(value);
        }
    },

    /* ---------------------------------------------------------- activation */

    installActivation(): void {
        // 5x tikken op de app-titel in de header
        const title = document.querySelector('header h1');
        if (title) {
            title.addEventListener('click', () => {
                this.tapCount++;
                if (this.tapTimer !== null) window.clearTimeout(this.tapTimer);
                this.tapTimer = window.setTimeout(() => {
                    this.tapCount = 0;
                }, 1500);
                if (this.tapCount >= 5) {
                    this.tapCount = 0;
                    this.setEnabled(true);
                    this.open();
                }
            });
        }

        window.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
                e.preventDefault();
                this.setEnabled(true);
                this.toggle();
            }
        });
    },

    setEnabled(on: boolean): void {
        this.enabled = on;
        try {
            if (on) localStorage.setItem(ENABLED_KEY, '1');
            else localStorage.removeItem(ENABLED_KEY);
        } catch {
            /* niets */
        }
        if (on) this.mountFab();
        else document.getElementById('diagFab')?.remove();
    },

    /* -------------------------------------------------------- floating btn */

    mountFab(): void {
        if (document.getElementById('diagFab')) return;
        const fab = document.createElement('button');
        fab.id = 'diagFab';
        fab.type = 'button';
        fab.setAttribute('aria-label', 'Diagnose openen');
        fab.style.cssText =
            'position:fixed;right:10px;bottom:10px;z-index:2147483000;width:44px;height:44px;border-radius:50%;' +
            'background:#0f172a;color:#38bdf8;border:1px solid #334155;box-shadow:0 6px 20px rgba(0,0,0,.4);' +
            'font:600 16px system-ui,sans-serif;display:flex;align-items:center;justify-content:center;cursor:pointer;';
        fab.innerHTML = '<span style="pointer-events:none">🐞</span>';
        fab.addEventListener('click', () => this.toggle());
        document.body.appendChild(fab);
        this.updateFabBadge();
    },

    updateFabBadge(): void {
        const fab = document.getElementById('diagFab');
        if (!fab) return;
        const problems = this.counters.errors;
        fab.style.borderColor = problems > 0 ? '#f87171' : '#334155';
        fab.style.color = problems > 0 ? '#f87171' : '#38bdf8';
        fab.title = problems > 0 ? `${problems} fout(en) gelogd` : 'Diagnose openen';
    },

    /* ---------------------------------------------------------------- panel */

    toggle(): void {
        if (this.isOpen) this.close();
        else this.open();
    },

    open(): void {
        this.setEnabled(true);
        if (!this.panel) this.buildPanel();
        if (!this.panel) return;
        this.panel.style.display = 'flex';
        this.isOpen = true;
        this.switchTab(this.activeTab);
    },

    close(): void {
        if (this.panel) this.panel.style.display = 'none';
        this.isOpen = false;
    },

    buildPanel(): void {
        const panel = document.createElement('div');
        panel.id = 'diagPanel';
        panel.style.cssText =
            'position:fixed;inset:0;z-index:2147483001;background:#0b1220;color:#e2e8f0;display:none;' +
            'flex-direction:column;font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;';

        panel.innerHTML = `
            <div style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:#111c2f;border-bottom:1px solid #1f2d45;flex-shrink:0">
                <strong style="font:700 13px system-ui,sans-serif;color:#fff">🐞 LMRA Diagnose</strong>
                <span style="color:#64748b;font-size:11px">v${escapeHtml(APP_VERSION)} ${escapeHtml(APP_RELEASE_NAME)}</span>
                <button type="button" id="diagClose" style="margin-left:auto;background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:8px;padding:6px 12px;cursor:pointer;font:600 12px system-ui,sans-serif">Sluiten</button>
            </div>
            <div style="display:flex;gap:6px;padding:8px 12px;background:#0f172a;border-bottom:1px solid #1f2d45;flex-shrink:0">
                <button type="button" data-diag-tab="log" style="flex:1;background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:8px;padding:8px;cursor:pointer;font:600 12px system-ui,sans-serif">Log</button>
                <button type="button" data-diag-tab="system" style="flex:1;background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:8px;padding:8px;cursor:pointer;font:600 12px system-ui,sans-serif">Systeem</button>
                <button type="button" data-diag-tab="tests" style="flex:1;background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:8px;padding:8px;cursor:pointer;font:600 12px system-ui,sans-serif">Tests</button>
            </div>
            <div id="diagBody" style="flex:1;overflow:auto;padding:10px 12px;-webkit-overflow-scrolling:touch"></div>
            <div style="display:flex;gap:6px;padding:8px 12px;background:#111c2f;border-top:1px solid #1f2d45;flex-shrink:0;flex-wrap:wrap">
                <button type="button" id="diagRunTests" style="flex:1;min-width:120px;background:#0284c7;color:#fff;border:0;border-radius:8px;padding:10px;cursor:pointer;font:700 12px system-ui,sans-serif">Tests draaien</button>
                <button type="button" id="diagCopy" style="flex:1;min-width:90px;background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:8px;padding:10px;cursor:pointer;font:600 12px system-ui,sans-serif">Kopieer</button>
                <button type="button" id="diagDownload" style="flex:1;min-width:90px;background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:8px;padding:10px;cursor:pointer;font:600 12px system-ui,sans-serif">Download</button>
                <button type="button" id="diagClear" style="flex:1;min-width:90px;background:#7f1d1d;color:#fecaca;border:0;border-radius:8px;padding:10px;cursor:pointer;font:600 12px system-ui,sans-serif">Wis log</button>
            </div>
        `;

        document.body.appendChild(panel);
        this.panel = panel;

        panel.querySelector('#diagClose')?.addEventListener('click', () => this.close());
        panel.querySelectorAll('[data-diag-tab]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const tab = (btn as HTMLElement).dataset.diagTab as 'log' | 'system' | 'tests';
                this.switchTab(tab);
            });
        });
        panel.querySelector('#diagRunTests')?.addEventListener('click', () => {
            void this.runAllTests();
        });
        panel.querySelector('#diagCopy')?.addEventListener('click', () => {
            void this.copyReport();
        });
        panel.querySelector('#diagDownload')?.addEventListener('click', () => this.downloadReport());
        panel.querySelector('#diagClear')?.addEventListener('click', () => {
            this.clearLog();
            this.renderLog();
        });
    },

    switchTab(tab: 'log' | 'system' | 'tests'): void {
        this.activeTab = tab;
        this.panel?.querySelectorAll('[data-diag-tab]').forEach((btn) => {
            const el = btn as HTMLElement;
            const active = el.dataset.diagTab === tab;
            el.style.background = active ? '#0284c7' : '#1e293b';
            el.style.borderColor = active ? '#0284c7' : '#334155';
        });
        if (tab === 'log') this.renderLog();
        if (tab === 'system') void this.renderSystem();
        if (tab === 'tests') this.renderTests();
    },

    body(): HTMLElement | null {
        return document.getElementById('diagBody');
    },

    renderLog(): void {
        const body = this.body();
        if (!body) return;
        const rows = this.buffer
            .slice()
            .reverse()
            .map((e) => {
                const color = LEVEL_COLORS[e.level];
                return `<div style="padding:4px 0;border-bottom:1px solid #16233a;word-break:break-word">
                    <span style="color:#475569">${clock(e.ts)}</span>
                    <span style="color:${color};font-weight:700"> ${escapeHtml(e.level.toUpperCase())}</span>
                    <span style="color:#64748b"> [${escapeHtml(e.src)}]</span>
                    <span style="color:#e2e8f0"> ${escapeHtml(e.msg)}</span>
                </div>`;
            })
            .join('');

        body.innerHTML =
            `<div style="color:#94a3b8;margin-bottom:8px">${this.buffer.length} regels · ` +
            `<span style="color:#f87171">${this.counters.errors} fouten</span> · ` +
            `<span style="color:#fbbf24">${this.counters.warnings} waarschuwingen</span> · ` +
            `<span style="color:#f87171">${this.counters.failedRequests} mislukte requests</span> · nieuwste bovenaan</div>` +
            (rows || '<div style="color:#64748b">Nog geen log-regels.</div>');
    },

    async renderSystem(): Promise<void> {
        const body = this.body();
        if (!body) return;
        body.innerHTML = '<div style="color:#94a3b8">Systeeminfo ophalen…</div>';
        const info = await this.collectSystemInfo();
        body.innerHTML = Object.entries(info)
            .map(
                ([k, v]) => `<div style="display:flex;gap:8px;padding:4px 0;border-bottom:1px solid #16233a">
                    <span style="color:#94a3b8;min-width:150px;flex-shrink:0">${escapeHtml(k)}</span>
                    <span style="color:#e2e8f0;word-break:break-word">${escapeHtml(v)}</span>
                </div>`
            )
            .join('');
    },

    renderTests(): void {
        const body = this.body();
        if (!body) return;
        if (this.tests.length === 0) {
            body.innerHTML =
                '<div style="color:#94a3b8">Nog geen tests gedraaid. Druk op <strong>Tests draaien</strong> ' +
                'om GPS, weer-API, microfoon, opslag en offline-gedrag te controleren op dit toestel.</div>';
            return;
        }
        body.innerHTML = this.tests
            .map((t) => {
                const s = STATUS_STYLE[t.status];
                return `<div style="padding:6px 0;border-bottom:1px solid #16233a">
                    <div><span style="color:${s.color};font-weight:700">${s.icon} ${escapeHtml(t.name)}</span>
                    <span style="color:#475569"> ${t.ms}ms</span></div>
                    <div style="color:#94a3b8;word-break:break-word">${escapeHtml(t.detail)}</div>
                </div>`;
            })
            .join('');
    },

    /* ----------------------------------------------------------- systeminfo */

    isStandalone(): boolean {
        return window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
    },

    describeConnection(): string {
        const c = getConnectionInfo();
        const parts = [c.online ? 'online' : 'OFFLINE', `type=${c.effectiveType}`];
        if (c.downlinkMbps !== null) parts.push(`downlink=${c.downlinkMbps}Mbps`);
        if (c.rttMs !== null) parts.push(`rtt=${c.rttMs}ms`);
        if (c.saveData) parts.push('databesparing AAN');
        return parts.join(' · ');
    },

    async collectSystemInfo(): Promise<Record<string, string>> {
        const info: Record<string, string> = {};
        info['App versie'] = APP_LABEL;
        info['Serie'] = APP_RELEASE_NAME;
        info['Tijd'] = new Date().toLocaleString('nl-NL');
        info['Modus'] = this.isStandalone() ? 'PWA (standalone)' : 'Browser tab';
        info['URL'] = window.location.href;
        info['User agent'] = navigator.userAgent;
        info['Platform'] = (navigator as any).userAgentData?.platform || navigator.platform || 'onbekend';
        info['Taal'] = navigator.language;
        info['Tijdzone'] = Intl.DateTimeFormat().resolvedOptions().timeZone;
        info['Scherm'] = `${window.screen.width}x${window.screen.height} @ DPR ${window.devicePixelRatio}`;
        info['Viewport'] = `${window.innerWidth}x${window.innerHeight}`;
        info['Verbinding'] = this.describeConnection();
        info['CPU cores'] = String((navigator as any).hardwareConcurrency ?? 'onbekend');
        info['Device memory'] = (navigator as any).deviceMemory ? `${(navigator as any).deviceMemory} GB` : 'onbekend';

        info['Features'] = [
            `geolocation=${'geolocation' in navigator}`,
            `mediaDevices=${!!navigator.mediaDevices}`,
            `speech=${!!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)}`,
            `serviceWorker=${'serviceWorker' in navigator}`,
            `indexedDB=${!!window.indexedDB}`,
            `pointerEvents=${'PointerEvent' in window}`,
        ].join(' · ');

        // Permissies
        const perms: string[] = [];
        const anyNav = navigator as any;
        if (anyNav.permissions?.query) {
            for (const name of ['geolocation', 'microphone', 'camera']) {
                try {
                    const status = await anyNav.permissions.query({ name });
                    perms.push(`${name}=${status.state}`);
                } catch {
                    perms.push(`${name}=onbekend`);
                }
            }
        } else {
            perms.push('Permissions API niet beschikbaar');
        }
        info['Permissies'] = perms.join(' · ');

        // Opslag
        try {
            if (navigator.storage?.estimate) {
                const est = await navigator.storage.estimate();
                const usedMb = ((est.usage ?? 0) / 1048576).toFixed(1);
                const quotaMb = ((est.quota ?? 0) / 1048576).toFixed(0);
                info['Opslag'] = `${usedMb} MB gebruikt van ~${quotaMb} MB`;
            } else {
                info['Opslag'] = 'Storage API niet beschikbaar';
            }
        } catch (err) {
            info['Opslag'] = `Fout: ${this.stringify(err)}`;
        }

        // Service worker + cache
        try {
            if ('serviceWorker' in navigator) {
                const regs = await navigator.serviceWorker.getRegistrations();
                info['Service workers'] = regs.length === 0
                    ? 'GEEN geregistreerd (offline werkt niet!)'
                    : regs
                        .map((r) => `${r.scope} [${r.active ? 'actief' : r.installing ? 'installeert' : 'wachtend'}]`)
                        .join(' · ');
            }
            if ('caches' in window) {
                const keys = await caches.keys();
                const details: string[] = [];
                for (const key of keys) {
                    const cache = await caches.open(key);
                    const entries = await cache.keys();
                    details.push(`${key} (${entries.length} bestanden)`);
                }
                info['Caches'] = details.length ? details.join(' · ') : 'leeg';
            }
        } catch (err) {
            info['Service workers'] = `Fout: ${this.stringify(err)}`;
        }

        try {
            info['Cookie consent'] = localStorage.getItem('lmra_cookie_consent') || 'nog geen keuze';
        } catch {
            info['Cookie consent'] = 'localStorage geblokkeerd';
        }

        return info;
    },

    /* ---------------------------------------------------------------- tests */

    async runAllTests(): Promise<void> {
        this.switchTab('tests');
        this.tests = [];
        const body = this.body();
        if (body) body.innerHTML = '<div style="color:#38bdf8">Tests draaien…</div>';
        this.log('info', 'diag', 'Zelftests gestart');

        const suite: Array<{ name: string; fn: () => Promise<Omit<DiagTestResult, 'name' | 'ms'>> }> = [
            { name: '1. Netwerkvlag (navigator.onLine)', fn: () => this.testOnlineFlag() },
            { name: '2. Eigen server bereikbaar', fn: () => this.testOwnServer() },
            { name: '3. Adres-API (Nominatim)', fn: () => this.testNominatim() },
            { name: '4. Weer-API (Open-Meteo)', fn: () => this.testOpenMeteo() },
            { name: '5. GPS-positie', fn: () => this.testGeolocation() },
            { name: '6. Microfoon & spraakherkenning', fn: () => this.testMicrophone() },
            { name: '7. Lokale database (IndexedDB)', fn: () => this.testIndexedDb() },
            { name: '8. localStorage', fn: () => this.testLocalStorage() },
            { name: '9. Offline cache (service worker)', fn: () => this.testOfflineCache() },
            { name: '10. Handtekening-canvas', fn: () => this.testSignatureCanvas() },
        ];

        for (const item of suite) {
            const started = performance.now();
            let result: Omit<DiagTestResult, 'name' | 'ms'>;
            try {
                result = await item.fn();
            } catch (err) {
                result = { status: 'fail', detail: `Onverwachte fout: ${this.stringify(err)}` };
            }
            const entry: DiagTestResult = {
                name: item.name,
                status: result.status,
                detail: result.detail,
                ms: Math.round(performance.now() - started),
            };
            this.tests.push(entry);
            this.log(
                entry.status === 'fail' ? 'error' : entry.status === 'warn' ? 'warn' : 'info',
                'test',
                `${item.name}: ${entry.status.toUpperCase()} – ${entry.detail}`
            );
            if (this.activeTab === 'tests') this.renderTests();
        }

        const failed = this.tests.filter((t) => t.status === 'fail').length;
        this.log('info', 'diag', `Zelftests klaar: ${this.tests.length - failed} van ${this.tests.length} in orde`);
    },

    async testOnlineFlag(): Promise<Omit<DiagTestResult, 'name' | 'ms'>> {
        const c = getConnectionInfo();
        if (!c.online) return { status: 'warn', detail: 'Toestel meldt offline. App moet in offline-modus werken.' };
        return { status: 'ok', detail: this.describeConnection() };
    },

    async testOwnServer(): Promise<Omit<DiagTestResult, 'name' | 'ms'>> {
        if (!navigator.onLine) return { status: 'skip', detail: 'Overgeslagen: toestel is offline.' };
        try {
            const res = await fetchWithTimeout(`/manifest.json?diag=${Date.now()}`, 6000, { cache: 'no-store' });
            return res.ok
                ? { status: 'ok', detail: `HTTP ${res.status} van eigen server.` }
                : { status: 'fail', detail: `HTTP ${res.status}. Mogelijk captive portal of proxy van het bedrijfsnetwerk.` };
        } catch (err) {
            return {
                status: 'fail',
                detail: `Geen verbinding met eigen server: ${this.stringify(err)}. App draait dan uit cache.`,
            };
        }
    },

    async testNominatim(): Promise<Omit<DiagTestResult, 'name' | 'ms'>> {
        if (!navigator.onLine) return { status: 'skip', detail: 'Overgeslagen: toestel is offline.' };
        try {
            const res = await fetchWithTimeout(
                'https://nominatim.openstreetmap.org/reverse?format=json&zoom=18&accept-language=nl&lat=52.3676&lon=4.9041',
                7000,
                { cache: 'no-store' }
            );
            if (!res.ok) {
                return { status: 'fail', detail: `HTTP ${res.status}. Adres wordt dan als coördinaten ingevuld.` };
            }
            const data = (await res.json()) as { display_name?: string };
            return { status: 'ok', detail: `Antwoord ontvangen: ${(data.display_name || 'geen adres').slice(0, 60)}` };
        } catch (err) {
            return {
                status: 'fail',
                detail: `Niet bereikbaar (${this.stringify(err)}). Firewall van het bedrijf blokkeert dit vaak.`,
            };
        }
    },

    async testOpenMeteo(): Promise<Omit<DiagTestResult, 'name' | 'ms'>> {
        if (!navigator.onLine) return { status: 'skip', detail: 'Overgeslagen: toestel is offline.' };
        try {
            const res = await fetchWithTimeout(
                'https://api.open-meteo.com/v1/forecast?latitude=52.37&longitude=4.90&current_weather=true',
                7000,
                { cache: 'no-store' }
            );
            if (!res.ok) return { status: 'fail', detail: `HTTP ${res.status}` };
            const data = (await res.json()) as { current_weather?: { temperature: number } };
            return data.current_weather
                ? { status: 'ok', detail: `Weer ontvangen: ${data.current_weather.temperature}°C in Amsterdam.` }
                : { status: 'warn', detail: 'Antwoord zonder current_weather veld.' };
        } catch (err) {
            return { status: 'fail', detail: `Niet bereikbaar (${this.stringify(err)}).` };
        }
    },

    async testGeolocation(): Promise<Omit<DiagTestResult, 'name' | 'ms'>> {
        if (!('geolocation' in navigator)) {
            return { status: 'fail', detail: 'Geolocation API ontbreekt in deze browser.' };
        }
        return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const acc = Math.round(pos.coords.accuracy);
                    const age = Math.round((Date.now() - pos.timestamp) / 1000);
                    const status: DiagStatus = acc > 500 ? 'warn' : 'ok';
                    resolve({
                        status,
                        detail: `Fix: ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)} · nauwkeurigheid ±${acc}m · ${age}s oud${acc > 500 ? ' (grof: binnen in de fabriek normaal)' : ''}`,
                    });
                },
                (err) => {
                    const map: Record<number, string> = {
                        1: 'PERMISSION_DENIED: toestemming geweigerd of site niet als vertrouwd gemarkeerd.',
                        2: 'POSITION_UNAVAILABLE: geen satelliet-/netwerkfix. Typisch binnen in een fabriekshal.',
                        3: 'TIMEOUT: geen fix binnen de tijd.',
                    };
                    resolve({ status: 'fail', detail: map[err.code] || `Fout ${err.code}: ${err.message}` });
                },
                { enableHighAccuracy: false, timeout: 12000, maximumAge: 120000 }
            );
        });
    },

    async testMicrophone(): Promise<Omit<DiagTestResult, 'name' | 'ms'>> {
        const hasSpeech = !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
        if (!navigator.mediaDevices?.getUserMedia) {
            return { status: 'fail', detail: 'getUserMedia niet beschikbaar (geen HTTPS?).' };
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const label = stream.getAudioTracks()[0]?.label || 'onbekende microfoon';
            stream.getTracks().forEach((t) => t.stop());
            return hasSpeech
                ? { status: 'ok', detail: `Microfoon werkt (${label}). Spraakherkenning ondersteund.` }
                : {
                      status: 'warn',
                      detail: `Microfoon werkt (${label}), maar deze browser heeft geen Web Speech API. Gebruik Chrome.`,
                  };
        } catch (err) {
            return { status: 'fail', detail: `Microfoon geweigerd of bezet: ${this.stringify(err)}` };
        }
    },

    async testIndexedDb(): Promise<Omit<DiagTestResult, 'name' | 'ms'>> {
        if (!window.indexedDB) return { status: 'fail', detail: 'IndexedDB ontbreekt (privémodus?).' };
        return new Promise((resolve) => {
            const req = indexedDB.open('lmra-diag-test', 1);
            req.onupgradeneeded = () => {
                req.result.createObjectStore('probe');
            };
            req.onerror = () => resolve({ status: 'fail', detail: `Openen mislukt: ${req.error?.message ?? 'onbekend'}` });
            req.onsuccess = () => {
                const db = req.result;
                try {
                    const tx = db.transaction('probe', 'readwrite');
                    tx.objectStore('probe').put({ ok: true, ts: Date.now() }, 'probe');
                    tx.oncomplete = () => {
                        db.close();
                        indexedDB.deleteDatabase('lmra-diag-test');
                        resolve({ status: 'ok', detail: 'Schrijven en lezen naar lokale database werkt.' });
                    };
                    tx.onerror = () => {
                        db.close();
                        resolve({ status: 'fail', detail: `Schrijffout: ${tx.error?.message ?? 'onbekend'}` });
                    };
                } catch (err) {
                    db.close();
                    resolve({ status: 'fail', detail: this.stringify(err) });
                }
            };
        });
    },

    async testLocalStorage(): Promise<Omit<DiagTestResult, 'name' | 'ms'>> {
        try {
            const key = '__lmra_diag__';
            localStorage.setItem(key, '1');
            const ok = localStorage.getItem(key) === '1';
            localStorage.removeItem(key);
            return ok
                ? { status: 'ok', detail: 'localStorage werkt (instellingen en consent worden bewaard).' }
                : { status: 'fail', detail: 'Waarde kon niet worden teruggelezen.' };
        } catch (err) {
            return { status: 'fail', detail: `Geblokkeerd: ${this.stringify(err)}` };
        }
    },

    async testOfflineCache(): Promise<Omit<DiagTestResult, 'name' | 'ms'>> {
        if (!('serviceWorker' in navigator) || !('caches' in window)) {
            return { status: 'fail', detail: 'Service worker of Cache API niet beschikbaar.' };
        }
        const regs = await navigator.serviceWorker.getRegistrations();
        if (regs.length === 0) {
            return { status: 'fail', detail: 'Geen service worker geregistreerd: app werkt NIET offline.' };
        }
        const keys = await caches.keys();
        if (keys.length === 0) {
            return { status: 'warn', detail: 'Service worker actief maar cache nog leeg. Herlaad de pagina één keer online.' };
        }
        const cache = await caches.open(keys[0]);
        const appShell = (await cache.match('/app.html')) || (await cache.match('/app'));
        const entries = await cache.keys();
        return appShell
            ? { status: 'ok', detail: `Cache "${keys[0]}" bevat ${entries.length} bestanden incl. app-shell. Offline gebruik werkt.` }
            : { status: 'warn', detail: `Cache "${keys[0]}" bevat ${entries.length} bestanden maar geen /app.html.` };
    },

    async testSignatureCanvas(): Promise<Omit<DiagTestResult, 'name' | 'ms'>> {
        const canvas = document.getElementById('signatureCanvas') as HTMLCanvasElement | null;
        if (!canvas) return { status: 'skip', detail: 'Canvas niet op deze pagina.' };
        const rect = canvas.getBoundingClientRect();
        if (rect.width === 0 || canvas.width === 0) {
            return { status: 'fail', detail: `Canvas heeft geen afmeting (CSS ${rect.width}x${rect.height}, buffer ${canvas.width}x${canvas.height}). Tekenen werkt dan niet.` };
        }
        const scaleX = canvas.width / rect.width;
        const dpr = window.devicePixelRatio || 1;
        const mismatch = Math.abs(scaleX - dpr) > 0.05;
        const pointer = 'PointerEvent' in window;
        return {
            status: mismatch ? 'warn' : 'ok',
            detail:
                `CSS ${Math.round(rect.width)}x${Math.round(rect.height)} · buffer ${canvas.width}x${canvas.height} · ` +
                `schaal ${scaleX.toFixed(2)} (DPR ${dpr}) · PointerEvents ${pointer ? 'ja' : 'nee'}` +
                (mismatch ? ' · LET OP: schaal wijkt af van DPR, coördinaten kunnen verschuiven.' : ''),
        };
    },

    /* --------------------------------------------------------------- export */

    async buildReport(): Promise<string> {
        const info = await this.collectSystemInfo();
        const lines: string[] = [];
        lines.push('=== LMRA PRO DIAGNOSERAPPORT ===');
        lines.push(`Gegenereerd: ${new Date().toLocaleString('nl-NL')}`);
        lines.push('');
        lines.push('--- SYSTEEM ---');
        for (const [k, v] of Object.entries(info)) lines.push(`${k}: ${v}`);
        lines.push('');
        lines.push('--- ZELFTESTS ---');
        if (this.tests.length === 0) lines.push('(niet gedraaid)');
        for (const t of this.tests) lines.push(`[${t.status.toUpperCase()}] ${t.name} (${t.ms}ms) - ${t.detail}`);
        lines.push('');
        lines.push(`--- LOG (${this.buffer.length} regels, oudste eerst) ---`);
        for (const e of this.buffer) {
            lines.push(`${clock(e.ts)} ${e.level.toUpperCase().padEnd(5)} [${e.src}] ${e.msg}`);
        }
        return lines.join('\n');
    },

    async copyReport(): Promise<void> {
        const text = await this.buildReport();
        try {
            await navigator.clipboard.writeText(text);
            this.flash('Rapport gekopieerd naar klembord');
        } catch {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.cssText = 'position:fixed;top:-1000px';
            document.body.appendChild(ta);
            ta.select();
            const ok = document.execCommand('copy');
            ta.remove();
            this.flash(ok ? 'Rapport gekopieerd' : 'Kopiëren mislukt, gebruik Download');
        }
    },

    downloadReport(): void {
        void this.buildReport().then((text) => {
            const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `lmra-diagnose-${stamp()}.txt`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 2000);
            this.flash('Diagnoserapport gedownload');
        });
    },

    flash(msg: string): void {
        const el = document.createElement('div');
        el.textContent = msg;
        el.style.cssText =
            'position:fixed;left:50%;bottom:80px;transform:translateX(-50%);z-index:2147483002;background:#0284c7;' +
            'color:#fff;padding:10px 16px;border-radius:999px;font:600 12px system-ui,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.4)';
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 2200);
    },
};
