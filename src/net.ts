/**
 * src/net.ts - Netwerk helpers met harde timeouts, retry en verbindingsinfo.
 *
 * Reden: op fabrieksterreinen (dikke betonwanden, captive portals, 2G-achtige
 * dekking) blijft een normale fetch() oneindig hangen. Elke externe call in deze
 * app gaat daarom via fetchWithTimeout / fetchJsonWithRetry.
 */

export interface ConnectionInfo {
    online: boolean;
    effectiveType: string;
    downlinkMbps: number | null;
    rttMs: number | null;
    saveData: boolean;
}

export class NetTimeoutError extends Error {
    constructor(url: string, timeoutMs: number) {
        super(`Timeout na ${timeoutMs}ms bij ${url}`);
        this.name = 'NetTimeoutError';
    }
}

/** Fetch met AbortController-timeout. Gooit NetTimeoutError bij verlopen tijd. */
export async function fetchWithTimeout(
    url: string,
    timeoutMs: number = 8000,
    init: RequestInit = {}
): Promise<Response> {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
    }, timeoutMs);

    try {
        return await fetch(url, { ...init, signal: controller.signal });
    } catch (err) {
        if (timedOut) throw new NetTimeoutError(url, timeoutMs);
        throw err;
    } finally {
        clearTimeout(timer);
    }
}

export interface JsonFetchOptions {
    timeoutMs?: number;
    retries?: number;
    retryDelayMs?: number;
    headers?: Record<string, string>;
}

/**
 * Haalt JSON op met timeout en (standaard) 1 retry.
 * Retourneert null in plaats van te throwen wanneer het definitief mislukt,
 * zodat de aanroeper altijd door kan met een fallback.
 */
export async function fetchJsonWithRetry<T>(
    url: string,
    options: JsonFetchOptions = {}
): Promise<{ data: T | null; error: string | null; attempts: number; ms: number }> {
    const timeoutMs = options.timeoutMs ?? 8000;
    const retries = options.retries ?? 1;
    const retryDelayMs = options.retryDelayMs ?? 700;
    const started = Date.now();

    let lastError = 'Onbekende fout';
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
        try {
            const res = await fetchWithTimeout(url, timeoutMs, {
                cache: 'no-store',
                headers: options.headers,
            });
            if (!res.ok) {
                lastError = `HTTP ${res.status}`;
            } else {
                const data = (await res.json()) as T;
                return { data, error: null, attempts: attempt, ms: Date.now() - started };
            }
        } catch (err) {
            lastError = err instanceof Error ? err.message : String(err);
        }

        if (attempt <= retries) {
            await delay(retryDelayMs);
        }
    }

    return { data: null, error: lastError, attempts: retries + 1, ms: Date.now() - started };
}

export function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getConnectionInfo(): ConnectionInfo {
    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    return {
        online: navigator.onLine,
        effectiveType: conn?.effectiveType ?? 'onbekend',
        downlinkMbps: typeof conn?.downlink === 'number' ? conn.downlink : null,
        rttMs: typeof conn?.rtt === 'number' ? conn.rtt : null,
        saveData: conn?.saveData === true,
    };
}

/** True bij offline vlag of een extreem trage verbinding (2g / save-data). */
export function isConnectionUnusable(): boolean {
    const info = getConnectionInfo();
    if (!info.online) return true;
    return info.effectiveType === 'slow-2g';
}
