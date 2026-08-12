/**
 * src/gps-weather.ts - GPS locatie + Open-Meteo weerdata
 *
 * Gehard voor gebruik in fabrieken en op industrieterreinen:
 *  - Twee-traps positiebepaling: eerst nauwkeurig (kort), daarna grof met
 *    hergebruik van een oudere fix. Binnen een hal komt er vaak geen GPS-fix.
 *  - Elke externe call heeft een harde timeout + 1 retry (fetchJsonWithRetry).
 *  - Adres en weer worden ONAFHANKELIJK opgehaald: valt de adres-API weg, dan
 *    komt het weer nog steeds binnen (en omgekeerd).
 *  - Zonder adres-API wordt het locatieveld met coördinaten gevuld, nooit leeg.
 *  - Laatst bekende weerdata (max 60 min) wordt gebruikt als de app offline is.
 */

import { UI } from './ui';
import { Diagnostics } from './diagnostics';
import { fetchJsonWithRetry, getConnectionInfo } from './net';

export interface WeatherData {
    temperature: number;
    windspeed: number;
    weathercode: number;
    description: string;
    isHazardous: boolean;
    stale?: boolean;
    measuredAt?: number;
}

interface NominatimResponse {
    address?: Record<string, string>;
    display_name?: string;
}

interface OpenMeteoResponse {
    current_weather?: {
        temperature: number;
        windspeed: number;
        weathercode: number;
    };
}

const WEATHER_CACHE_KEY = 'lmra_last_weather';
const WEATHER_CACHE_MAX_AGE_MS = 60 * 60 * 1000; // 1 uur

export const GPSWeather = {
    currentWeather: null as WeatherData | null,
    currentLocation: null as string | null,
    isBusy: false,

    init(): void {
        const btnGPS = document.getElementById('btnUseGPS');
        if (btnGPS) {
            btnGPS.addEventListener('click', () => {
                void this.fetchLocationAndWeather();
            });
        }
    },

    /* ------------------------------------------------------------- hoofdflow */

    async fetchLocationAndWeather(): Promise<void> {
        if (this.isBusy) {
            Diagnostics.log('debug', 'gps', 'Dubbele klik genegeerd, ophalen loopt al');
            return;
        }
        if (!('geolocation' in navigator)) {
            UI.showToast('❌ GPS wordt niet ondersteund door deze browser.');
            Diagnostics.log('error', 'gps', 'Geolocation API ontbreekt');
            return;
        }

        this.isBusy = true;
        this.setButtonBusy(true);
        Diagnostics.log('info', 'gps', `Locatie ophalen gestart. ${Diagnostics.describeConnection()}`);
        UI.showToast('📍 Locatie bepalen...');

        try {
            const pos = await this.acquirePosition();
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            const acc = Math.round(pos.coords.accuracy);
            Diagnostics.log('info', 'gps', `Fix: ${lat.toFixed(5)},${lon.toFixed(5)} ±${acc}m`);

            // Stap 1: coördinaten direct invullen zodat het veld nooit leeg blijft.
            const coordString = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
            this.currentLocation = coordString;
            this.setLocationField(coordString);

            if (acc > 1000) {
                UI.showToast(`⚠️ Grove locatie (±${acc}m). Controleer het adres.`);
            }

            const offline = !getConnectionInfo().online;
            if (offline) {
                Diagnostics.log('warn', 'gps', 'Offline: adres en weer worden overgeslagen');
                UI.showToast('📍 Locatie opgeslagen als coördinaten (offline).');
                this.useCachedWeather();
                return;
            }

            // Stap 2 en 3 los van elkaar, zodat één storing de andere niet meesleept.
            await Promise.allSettled([
                this.resolveAddress(lat, lon),
                this.resolveWeather(lat, lon),
            ]);
        } catch (err) {
            this.handlePositionError(err);
        } finally {
            this.isBusy = false;
            this.setButtonBusy(false);
        }
    },

    /* ------------------------------------------------------------- positie */

    /** Twee-traps fix: nauwkeurig en kort, daarna grof met oudere cache-fix. */
    async acquirePosition(): Promise<GeolocationPosition> {
        try {
            const pos = await this.requestPosition({
                enableHighAccuracy: true,
                timeout: 8000,
                maximumAge: 30000,
            });
            Diagnostics.log('debug', 'gps', 'Nauwkeurige fix gelukt');
            return pos;
        } catch (err) {
            const code = (err as GeolocationPositionError)?.code;
            if (code === 1) {
                // Toestemming geweigerd: opnieuw proberen heeft geen zin.
                throw err;
            }
            Diagnostics.log('warn', 'gps', `Nauwkeurige fix mislukt (code ${code}), val terug op netwerklocatie`);
            UI.showToast('📡 Geen satellietfix, netwerklocatie proberen...');
            return this.requestPosition({
                enableHighAccuracy: false,
                timeout: 15000,
                maximumAge: 600000,
            });
        }
    },

    requestPosition(options: PositionOptions): Promise<GeolocationPosition> {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, options);
        });
    },

    handlePositionError(err: unknown): void {
        const geoErr = err as GeolocationPositionError;
        const code = typeof geoErr?.code === 'number' ? geoErr.code : -1;
        let msg: string;
        switch (code) {
            case 1:
                msg = '❌ Locatietoegang geweigerd. Sta locatie toe in je browserinstellingen.';
                break;
            case 2:
                msg = '❌ Geen GPS-signaal (binnen in de hal). Vul de locatie handmatig in.';
                break;
            case 3:
                msg = '⏱️ GPS duurde te lang. Ga even naar buiten of vul handmatig in.';
                break;
            default:
                msg = '❌ Locatie kon niet worden bepaald.';
        }
        UI.showToast(msg);
        Diagnostics.log('error', 'gps', `Positie mislukt (code ${code}): ${geoErr?.message ?? String(err)}`);
        this.useCachedWeather();
    },

    /* --------------------------------------------------------------- adres */

    async resolveAddress(lat: number, lon: number): Promise<void> {
        const url =
            `https://nominatim.openstreetmap.org/reverse?format=json&zoom=18&addressdetails=1` +
            `&accept-language=nl&lat=${lat}&lon=${lon}`;

        const { data, error, attempts, ms } = await fetchJsonWithRetry<NominatimResponse>(url, {
            timeoutMs: 7000,
            retries: 1,
        });

        if (!data) {
            Diagnostics.log('warn', 'gps', `Adres-API mislukt na ${attempts} poging(en) in ${ms}ms: ${error}`);
            UI.showToast('⚠️ Adres niet op te halen, coördinaten gebruikt.');
            return;
        }

        const locString = this.formatAddress(data, lat, lon);
        this.currentLocation = locString;
        this.setLocationField(locString);
        Diagnostics.log('info', 'gps', `Adres gevonden in ${ms}ms: ${locString}`);
    },

    formatAddress(data: NominatimResponse, lat: number, lon: number): string {
        const a = data.address ?? {};
        const street = a.road || a.pedestrian || a.footway || a.industrial || a.neighbourhood || '';
        const number = a.house_number || '';
        const place = a.city || a.town || a.village || a.municipality || a.suburb || '';

        const streetPart = [street, number].filter(Boolean).join(' ').trim();
        const parts = [streetPart, place].filter((p) => p.length > 0);

        if (parts.length > 0) return parts.join(', ');
        if (data.display_name) return data.display_name.split(',').slice(0, 2).join(',').trim();
        return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
    },

    setLocationField(value: string): void {
        const locInput = document.getElementById('taskLocation') as HTMLInputElement | null;
        if (!locInput) return;
        locInput.value = value;
        locInput.dispatchEvent(new Event('input', { bubbles: true }));
        locInput.classList.add('bg-blue-100', 'dark:bg-blue-900');
        setTimeout(() => locInput.classList.remove('bg-blue-100', 'dark:bg-blue-900'), 1000);
    },

    /* ---------------------------------------------------------------- weer */

    async resolveWeather(lat: number, lon: number): Promise<void> {
        UI.showToast('🌤️ Weergegevens ophalen...');
        const url =
            `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}` +
            `&longitude=${lon.toFixed(4)}&current_weather=true`;

        const { data, error, attempts, ms } = await fetchJsonWithRetry<OpenMeteoResponse>(url, {
            timeoutMs: 7000,
            retries: 1,
        });

        if (!data?.current_weather) {
            Diagnostics.log('warn', 'weer', `Weer-API mislukt na ${attempts} poging(en) in ${ms}ms: ${error ?? 'geen data'}`);
            if (!this.useCachedWeather()) {
                UI.showToast('⚠️ Weerdata niet beschikbaar. LMRA gaat gewoon door.');
            }
            return;
        }

        const cw = data.current_weather;
        const weather: WeatherData = {
            temperature: cw.temperature,
            windspeed: cw.windspeed,
            weathercode: cw.weathercode,
            description: this.getWMODescription(cw.weathercode),
            isHazardous: this.isHazardous(cw.temperature, cw.windspeed, cw.weathercode),
            measuredAt: Date.now(),
        };

        this.currentWeather = weather;
        this.cacheWeather(weather);
        this.showWeatherWarning(weather);
        Diagnostics.log(
            'info',
            'weer',
            `Weer in ${ms}ms: ${weather.temperature}°C, ${weather.windspeed}km/h, ${weather.description}`
        );
    },

    isHazardous(temp: number, wind: number, code: number): boolean {
        return wind > 50 || temp > 35 || temp < -5 || [95, 96, 99].includes(code);
    },

    cacheWeather(weather: WeatherData): void {
        try {
            localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(weather));
        } catch {
            /* opslag vol: niet kritiek */
        }
    },

    /** Gebruikt laatst bekende weerdata (<1 uur oud) als terugvaloptie. */
    useCachedWeather(): boolean {
        try {
            const raw = localStorage.getItem(WEATHER_CACHE_KEY);
            if (!raw) return false;
            const cached = JSON.parse(raw) as WeatherData;
            const age = Date.now() - (cached.measuredAt ?? 0);
            if (age > WEATHER_CACHE_MAX_AGE_MS) {
                Diagnostics.log('debug', 'weer', 'Gecachte weerdata te oud, niet gebruikt');
                return false;
            }
            const minutes = Math.round(age / 60000);
            this.currentWeather = { ...cached, stale: true };
            this.showWeatherWarning(this.currentWeather, minutes);
            Diagnostics.log('info', 'weer', `Laatst bekende weerdata gebruikt (${minutes} min oud)`);
            return true;
        } catch {
            return false;
        }
    },

    /* ------------------------------------------------------------------ UI */

    setButtonBusy(busy: boolean): void {
        const btn = document.getElementById('btnUseGPS') as HTMLButtonElement | null;
        if (!btn) return;
        btn.disabled = busy;
        btn.classList.toggle('opacity-60', busy);
        btn.classList.toggle('animate-pulse', busy);
    },

    showWeatherWarning(weather: WeatherData, staleMinutes?: number): void {
        const container = document.getElementById('weatherWarningContainer');
        if (!container) return;

        container.classList.remove('hidden');

        const title = document.getElementById('weatherWarningTitle');
        const text = document.getElementById('weatherWarningText');
        const icon = document.getElementById('weatherWarningIcon');
        if (!title || !text || !icon) return;

        if (weather.isHazardous) {
            container.className =
                'mt-4 p-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 transition-all';
            icon.className = 'fa-solid fa-triangle-exclamation text-red-600 dark:text-red-400 text-xl';
            title.className = 'font-bold text-red-800 dark:text-red-400 text-sm';
            title.innerText = '⚠️ Gevaarlijke Weersomstandigheden!';
        } else {
            container.className =
                'mt-4 p-4 rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-900 transition-all';
            icon.className = 'fa-solid fa-cloud-sun text-[#00447c] dark:text-blue-400 text-xl';
            title.className = 'font-bold text-blue-800 dark:text-blue-400 text-sm';
            title.innerText = 'Actueel Weer';
        }

        const staleNote =
            weather.stale === true
                ? `<br><span class="text-amber-600 dark:text-amber-400">Laatst bekende meting${
                      typeof staleMinutes === 'number' ? ` (${staleMinutes} min oud)` : ''
                  }</span>`
                : '';

        text.innerHTML =
            `<strong>${weather.temperature}°C</strong> | Wind: <strong>${weather.windspeed} km/h</strong><br>` +
            `${weather.description}${staleNote}`;
    },

    clear(): void {
        this.currentWeather = null;
        this.currentLocation = null;
        const container = document.getElementById('weatherWarningContainer');
        if (container) container.classList.add('hidden');
    },

    getWMODescription(code: number): string {
        if (code === 0) return 'Heldere lucht';
        if (code === 1 || code === 2 || code === 3) return 'Gedeeltelijk bewolkt';
        if (code === 45 || code === 48) return 'Mistig';
        if (code >= 51 && code <= 55) return 'Motregen';
        if (code >= 56 && code <= 57) return 'IJzel (Gevaarlijk!)';
        if (code >= 61 && code <= 65) return 'Regen';
        if (code >= 66 && code <= 67) return 'IJzelregen (Gevaarlijk!)';
        if (code >= 71 && code <= 75) return 'Sneeuwval';
        if (code === 77) return 'Hagelkorrels';
        if (code >= 80 && code <= 82) return 'Regenbuien';
        if (code >= 85 && code <= 86) return 'Sneeuwbuien';
        if (code >= 95 && code <= 99) return 'Onweer (Gevaarlijk!)';
        return 'Onbekend weertype';
    },
};
