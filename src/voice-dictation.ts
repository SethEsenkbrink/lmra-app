/* src/voice-dictation.ts - Handles Speech to Text via Web Speech API */
import { UI } from './ui';

export const VoiceDictation = {
    recognition: null as any,
    isListening: false,
    activeTargetId: null as string | null,

    init() {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn("Speech Recognition API wordt niet ondersteund in deze browser.");
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true; // Continue luisteren
        this.recognition.interimResults = true; // Laat tussenresultaten zien
        this.recognition.lang = 'nl-NL'; // Standaard Nederlands

        this.recognition.onstart = () => {
            this.isListening = true;
            this.updateBtnUI(true);
            UI.showToast("🎙️ Spraakherkenning gestart. Begin met spreken...");
        };

        this.recognition.onerror = (event: any) => {
            console.error("Spraakherkenning fout:", event.error);
            this.isListening = false;
            this.updateBtnUI(false);
            if (event.error === 'not-allowed') {
                UI.showToast("❌ Microfoontoegang geweigerd.");
            }
        };

        this.recognition.onend = () => {
            this.isListening = false;
            this.updateBtnUI(false);
        };

        this.recognition.onresult = (event: any) => {
            if (!this.activeTargetId) return;
            const target = document.getElementById(this.activeTargetId) as HTMLTextAreaElement | HTMLInputElement;
            if (!target) return;

            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            if (finalTranscript) {
                const startPos = target.selectionStart || target.value.length;
                const endPos = target.selectionEnd || target.value.length;
                
                target.value = target.value.substring(0, startPos)
                    + finalTranscript + ' '
                    + target.value.substring(endPos, target.value.length);
                
                // Cursor verplaatsen
                target.selectionStart = target.selectionEnd = startPos + finalTranscript.length + 1;
            }
        };
    },

    toggleDictation(targetId: string, btnId: string) {
        if (!this.recognition) {
            UI.showToast("❌ Spraakherkenning wordt niet ondersteund door deze browser.");
            return;
        }

        if (this.isListening) {
            this.recognition.stop();
            return;
        }

        this.activeTargetId = targetId;
        this.activeBtnId = btnId;
        
        try {
            this.recognition.start();
        } catch (e) {
            console.warn("Recognition already started", e);
        }
    },

    activeBtnId: null as string | null,

    updateBtnUI(isListening: boolean) {
        if (!this.activeBtnId) return;
        const btn = document.getElementById(this.activeBtnId);
        if (!btn) return;

        if (isListening) {
            btn.classList.add('text-red-500', 'animate-pulse');
            btn.classList.remove('text-slate-400');
        } else {
            btn.classList.remove('text-red-500', 'animate-pulse');
            btn.classList.add('text-slate-400');
        }
    }
};
