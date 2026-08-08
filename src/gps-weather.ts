/* src/gps-weather.ts - Handles GPS Location and Open-Meteo Weather Data */
import { UI } from './ui';

export interface WeatherData {
    temperature: number;
    windspeed: number;
    weathercode: number;
    description: string;
    isHazardous: boolean;
}

export const GPSWeather = {
    currentWeather: null as WeatherData | null,
    currentLocation: null as string | null,

    init() {
        const btnGPS = document.getElementById('btnUseGPS');
        if (btnGPS) {
            btnGPS.addEventListener('click', () => this.fetchLocationAndWeather());
        }
    },

    async fetchLocationAndWeather() {
        if (!navigator.geolocation) {
            UI.showToast("❌ GPS wordt niet ondersteund.");
            return;
        }

        UI.showToast("📍 Locatie ophalen...");
        
        navigator.geolocation.getCurrentPosition(async (pos) => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            
            try {
                // 1. Haal locatie string op (Reverse Geocoding via Nominatim - Free, no API key)
                const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
                const geoData = await geoRes.json();
                
                let locString = "Onbekende locatie";
                if (geoData && geoData.address) {
                    const road = geoData.address.road || geoData.address.pedestrian || "";
                    const houseNumber = geoData.address.house_number || "";
                    const city = geoData.address.city || geoData.address.town || geoData.address.village || "";
                    
                    locString = `${road} ${houseNumber}, ${city}`.trim().replace(/^,\s*/, '');
                    if(locString === ',') locString = "Locatie gevonden";
                }
                
                this.currentLocation = locString;
                
                const locInput = document.getElementById('taskLocation') as HTMLInputElement;
                if (locInput) {
                    locInput.value = locString;
                    // Trigger animatie
                    locInput.classList.add('bg-blue-100', 'dark:bg-blue-900');
                    setTimeout(() => locInput.classList.remove('bg-blue-100', 'dark:bg-blue-900'), 1000);
                }

                UI.showToast("🌤️ Weergegevens ophalen...");

                // 2. Haal weer op (Open-Meteo - Free, no API key)
                const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
                const weatherData = await weatherRes.json();

                if (weatherData && weatherData.current_weather) {
                    const temp = weatherData.current_weather.temperature;
                    const wind = weatherData.current_weather.windspeed; // km/h
                    const code = weatherData.current_weather.weathercode;
                    
                    // Bepaal of het gevaarlijk is (bijv. wind > 50km/h, of temp > 35, of temp < 0)
                    const isHazardous = wind > 50 || temp > 35 || temp < -5 || [95, 96, 99].includes(code); // 95+ = Onweer
                    
                    this.currentWeather = {
                        temperature: temp,
                        windspeed: wind,
                        weathercode: code,
                        description: this.getWMODescription(code),
                        isHazardous: isHazardous
                    };

                    this.showWeatherWarning(this.currentWeather);
                }

            } catch (e) {
                console.error("Fout bij ophalen GPS/Weer:", e);
                UI.showToast("⚠️ Kon geen weer/adres ophalen.");
            }
        }, (err) => {
            console.error("GPS Error:", err);
            UI.showToast("❌ GPS Toegang geweigerd of mislukt.");
        }, {
            enableHighAccuracy: true,
            timeout: 10000
        });
    },

    showWeatherWarning(weather: WeatherData) {
        const container = document.getElementById('weatherWarningContainer');
        if (!container) return;

        container.classList.remove('hidden');
        
        const title = document.getElementById('weatherWarningTitle');
        const text = document.getElementById('weatherWarningText');
        const icon = document.getElementById('weatherWarningIcon');
        
        if (!title || !text || !icon) return;

        if (weather.isHazardous) {
            container.className = "mt-4 p-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 transition-all";
            icon.className = "fa-solid fa-triangle-exclamation text-red-600 dark:text-red-400 text-xl";
            title.className = "font-bold text-red-800 dark:text-red-400 text-sm";
            title.innerText = "⚠️ Gevaarlijke Weersomstandigheden!";
        } else {
            container.className = "mt-4 p-4 rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-900 transition-all";
            icon.className = "fa-solid fa-cloud-sun text-[#00447c] dark:text-blue-400 text-xl";
            title.className = "font-bold text-blue-800 dark:text-blue-400 text-sm";
            title.innerText = "Actueel Weer";
        }

        text.innerHTML = `<strong>${weather.temperature}°C</strong> | Wind: <strong>${weather.windspeed} km/h</strong><br>${weather.description}`;
    },

    clear() {
        this.currentWeather = null;
        this.currentLocation = null;
        const container = document.getElementById('weatherWarningContainer');
        if (container) container.classList.add('hidden');
    },

    getWMODescription(code: number): string {
        // WMO Weather interpretation codes
        if (code === 0) return "Heldere lucht";
        if (code === 1 || code === 2 || code === 3) return "Gedeeltelijk bewolkt";
        if (code === 45 || code === 48) return "Mistig";
        if (code >= 51 && code <= 55) return "Motregen";
        if (code >= 61 && code <= 65) return "Regen";
        if (code >= 71 && code <= 75) return "Sneeuwval";
        if (code >= 80 && code <= 82) return "Regenbuien";
        if (code >= 95 && code <= 99) return "Onweer (Gevaarlijk!)";
        return "Onbekend weertype";
    }
};
