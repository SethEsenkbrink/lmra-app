/**
 * src/voice-dictation.ts - Spraak-naar-tekst via Web Speech API
 *
 * Waarom herschreven: de oude versie voegde tekst in op basis van
 * selectionStart en verwerkte elk onresult-event los. Chrome op Android start
 * een 'continuous' sessie stilletjes opnieuw op en levert dan resultaten met een
 * lagere resultIndex opnieuw aan -> dezelfde zin werd 2x (of meer) ingevoegd.
 *
 * Nieuwe aanpak:
 *  - Bij de start wordt de bestaande veldtekst vastgelegd (baseText).
 *  - Elk definitief fragment wordt opgeslagen op een UNIEKE sleutel
 *    (sessieoffset + resultIndex). Hetzelfde fragment kan dus nooit twee keer
 *    in de tekst belanden, ook niet na een herstart.
 *  - Extra beveiliging: identieke fragmenten binnen 2 seconden worden genegeerd.
 *  - Het veld wordt telkens volledig opnieuw samengesteld:
 *      baseText + alle definitieve fragmenten + huidig tussenresultaat
 *  - Auto-herstart wanneer Android de sessie afkapt, met limiet en stiltetimer.
 */

import { UI } from './ui';
import { Diagnostics } from './diagnostics';

const MAX_RESTARTS = 30;
const SILENCE_TIMEOUT_MS = 25000;
const DUPLICATE_WINDOW_MS = 2000;

export const VoiceDictation = {
    recognition: null as any,
    supported: false,
    isListening: false,
    wantsToListen: false,
    activeTargetId: null as string | null,
    activeBtnId: null as string | null,

    baseText: '',
    finalChunks: new Map<number, string>(),
    indexOffset: 0,
    highestIndex: -1,
    restartCount: 0,
    lastChunk: '',
    lastChunkAt: 0,
    silenceTimer: null as number | null,

    init(): void {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            this.supported = false;
            Diagnostics.log('warn', 'spraak', 'Web Speech API niet ondersteund in deze browser');
            return;
        }

        this.supported = true;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'nl-NL';
        this.recognition.maxAlternatives = 1;

        this.recognition.onstart = () => {
            this.isListening = true;
            this.updateBtnUI(true);
            this.armSilenceTimer();
            if (this.restartCount === 0) {
                UI.showToast('🎙️ Spraak actief. Spreek rustig en duidelijk.');
            }
            Diagnostics.log('info', 'spraak', `Sessie gestart (herstart #${this.restartCount})`);
        };

        this.recognition.onresult = (event: any) => this.handleResult(event);

        this.recognition.onerror = (event: any) => {
            const code = String(event.error ?? 'onbekend');
            Diagnostics.log('warn', 'spraak', `Fout: ${code}`);

            if (code === 'not-allowed' || code === 'service-not-allowed') {
                this.wantsToListen = false;
                UI.showToast('❌ Microfoontoegang geweigerd. Sta de microfoon toe in je instellingen.');
            } else if (code === 'no-speech') {
                // Android meldt dit vaak; de sessie wordt hierna gewoon herstart.
                Diagnostics.log('debug', 'spraak', 'Geen spraak gedetecteerd, herstart volgt');
            } else if (code === 'network') {
                this.wantsToListen = false;
                UI.showToast('⚠️ Spraakherkenning heeft internet nodig. Typ de tekst handmatig.');
            } else if (code === 'aborted') {
                Diagnostics.log('debug', 'spraak', 'Sessie afgebroken');
            } else {
                UI.showToast(`⚠️ Spraakfout: ${code}`);
            }
        };

        this.recognition.onend = () => {
            this.isListening = false;
            this.clearSilenceTimer();

            if (this.wantsToListen && this.restartCount < MAX_RESTARTS) {
                // Android kapt continuous-sessies af. Indexen beginnen daarna
                // weer bij 0, dus schuif de offset op om dubbele tekst te voorkomen.
                this.indexOffset = this.indexOffset + this.highestIndex + 1;
                this.highestIndex = -1;
                this.restartCount++;
                Diagnostics.log('debug', 'spraak', `Auto-herstart ${this.restartCount}, offset nu ${this.indexOffset}`);
                setTimeout(() => {
                    if (!this.wantsToListen) return;
                    try {
                        this.recognition.start();
                    } catch (err) {
                        Diagnostics.log('warn', 'spraak', `Herstart mislukt: ${String(err)}`);
                        this.finishSession();
                    }
                }, 250);
                return;
            }

            this.finishSession();
        };
    },

    /* ------------------------------------------------------------ resultaat */

    handleResult(event: any): void {
        if (!this.activeTargetId) return;
        const target = this.getTarget();
        if (!target) return;

        this.armSilenceTimer();

        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const transcript = String(result[0]?.transcript ?? '').trim();
            if (!transcript) continue;

            if (this.highestIndex < i) this.highestIndex = i;

            if (result.isFinal) {
                const key = this.indexOffset + i;
                const now = Date.now();

                // Beveiliging tegen dubbele levering van hetzelfde fragment.
                const isRepeat = transcript === this.lastChunk && now - this.lastChunkAt < DUPLICATE_WINDOW_MS;
                if (isRepeat && !this.finalChunks.has(key)) {
                    Diagnostics.log('debug', 'spraak', `Dubbel fragment genegeerd: "${transcript.slice(0, 40)}"`);
                    continue;
                }

                this.finalChunks.set(key, transcript);
                this.lastChunk = transcript;
                this.lastChunkAt = now;
            } else {
                interim += `${transcript} `;
            }
        }

        this.render(target, interim.trim());
    },

    render(target: HTMLTextAreaElement | HTMLInputElement, interim: string): void {
        const finals = Array.from(this.finalChunks.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([, text]) => text);

        const spoken = [...finals, interim].filter((s) => s.length > 0).join(' ');
        const base = this.baseText.trim();
        let combined = [base, spoken].filter((s) => s.length > 0).join(' ');

        // maxlength geldt niet bij programmatisch vullen: zelf afkappen.
        const limit = target.maxLength;
        if (typeof limit === 'number' && limit > 0 && combined.length > limit) {
            combined = combined.slice(0, limit);
            Diagnostics.log('warn', 'spraak', `Tekst afgekapt op ${limit} tekens (maxlength van het veld)`);
        }

        target.value = combined;
        target.dispatchEvent(new Event('input', { bubbles: true }));

        // Cursor aan het einde houden zodat de gebruiker meeleest.
        try {
            target.selectionStart = target.selectionEnd = target.value.length;
        } catch {
            /* velden zonder selectie-ondersteuning negeren */
        }
        if (target instanceof HTMLTextAreaElement) {
            target.scrollTop = target.scrollHeight;
        }
    },

    /* -------------------------------------------------------------- sessie */

    toggleDictation(targetId: string, btnId: string): void {
        if (!this.supported || !this.recognition) {
            UI.showToast('❌ Spraakherkenning werkt niet in deze browser. Gebruik Chrome.');
            return;
        }

        if (this.wantsToListen) {
            this.stop();
            return;
        }

        const target = document.getElementById(targetId) as HTMLTextAreaElement | HTMLInputElement | null;
        if (!target) {
            Diagnostics.log('error', 'spraak', `Doelveld #${targetId} niet gevonden`);
            return;
        }

        // Verse sessie: alle tellers resetten.
        this.activeTargetId = targetId;
        this.activeBtnId = btnId;
        this.baseText = target.value ?? '';
        this.finalChunks.clear();
        this.indexOffset = 0;
        this.highestIndex = -1;
        this.restartCount = 0;
        this.lastChunk = '';
        this.lastChunkAt = 0;
        this.wantsToListen = true;

        try {
            this.recognition.start();
        } catch (err) {
            // start() gooit wanneer een vorige sessie nog niet is opgeruimd.
            Diagnostics.log('warn', 'spraak', `start() gooide fout, eerst afbreken: ${String(err)}`);
            try {
                this.recognition.abort();
            } catch {
                /* niets */
            }
            setTimeout(() => {
                if (!this.wantsToListen) return;
                try {
                    this.recognition.start();
                } catch (err2) {
                    this.wantsToListen = false;
                    UI.showToast('❌ Spraakherkenning kon niet starten.');
                    Diagnostics.log('error', 'spraak', `Tweede startpoging mislukt: ${String(err2)}`);
                }
            }, 400);
        }
    },

    stop(): void {
        this.wantsToListen = false;
        this.clearSilenceTimer();
        try {
            this.recognition?.stop();
        } catch {
            /* niets */
        }
    },

    /** Rondt af: tussenresultaat weghalen, alleen definitieve tekst bewaren. */
    finishSession(): void {
        this.wantsToListen = false;
        this.updateBtnUI(false);
        this.clearSilenceTimer();

        const target = this.getTarget();
        if (target) {
            this.render(target, '');
            const chunks = this.finalChunks.size;
            if (chunks > 0) {
                UI.showToast(`✅ ${chunks} fragment(en) ingesproken.`);
            }
            Diagnostics.log(
                'info',
                'spraak',
                `Sessie afgerond met ${chunks} fragment(en), ${this.restartCount} herstart(s)`
            );
        }
    },

    getTarget(): HTMLTextAreaElement | HTMLInputElement | null {
        if (!this.activeTargetId) return null;
        return document.getElementById(this.activeTargetId) as HTMLTextAreaElement | HTMLInputElement | null;
    },

    armSilenceTimer(): void {
        this.clearSilenceTimer();
        this.silenceTimer = window.setTimeout(() => {
            if (!this.wantsToListen) return;
            Diagnostics.log('info', 'spraak', 'Automatisch gestopt na stilte');
            UI.showToast('🎙️ Spraak automatisch gestopt (stilte).');
            this.stop();
        }, SILENCE_TIMEOUT_MS);
    },

    clearSilenceTimer(): void {
        if (this.silenceTimer !== null) {
            window.clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
        }
    },

    updateBtnUI(isListening: boolean): void {
        if (!this.activeBtnId) return;
        const btn = document.getElementById(this.activeBtnId);
        if (!btn) return;

        if (isListening) {
            btn.classList.add('text-red-500', 'animate-pulse');
            btn.classList.remove('text-slate-400');
            btn.setAttribute('title', 'Stop met inspreken');
        } else {
            btn.classList.remove('text-red-500', 'animate-pulse');
            btn.classList.add('text-slate-400');
            btn.setAttribute('title', 'Spraak-naar-tekst');
        }
    },
};
