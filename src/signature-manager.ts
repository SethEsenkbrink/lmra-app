/**
 * src/signature-manager.ts - Digitale handtekening
 *
 * Waarom herschreven (3 harde bugs in de oude versie):
 *  1. canvas.width werd op (containerbreedte - 32) gezet terwijl de CSS-breedte
 *     100% was. Bitmap en CSS-formaat liepen dus uiteen -> de streek kwam op een
 *     andere plek terecht dan waar je tikte.
 *  2. Elke window-resize (o.a. het openen van het toetsenbord op Android) zette
 *     canvas.width opnieuw en WISTE daarmee de handtekening.
 *  3. In dark mode werd met wit geschreven. Die PNG kwam onzichtbaar in het
 *     witte PDF-rapport terecht.
 *
 * Oplossing: streken worden als vectorpunten bewaard (genormaliseerd 0-1), niet
 * als bitmap. Bij elke resize wordt scherp opnieuw getekend zonder verlies, en
 * de export rendert altijd donkere inkt op een witte achtergrond.
 */

import { Diagnostics } from './diagnostics';

interface Point {
    x: number; // 0-1 relatief aan de breedte
    y: number; // 0-1 relatief aan de hoogte
}

const MAX_DPR = 3;
const LINE_WIDTH_CSS = 2.2;

export const SignatureManager = {
    canvas: null as HTMLCanvasElement | null,
    ctx: null as CanvasRenderingContext2D | null,
    strokes: [] as Point[][],
    currentStroke: null as Point[] | null,
    activePointerId: null as number | null,
    cssWidth: 0,
    cssHeight: 0,
    resizeTimer: null as number | null,
    observer: null as ResizeObserver | null,

    get isEmpty(): boolean {
        return this.strokes.length === 0;
    },

    /* ---------------------------------------------------------------- init */

    init(canvasId: string, clearBtnId: string, undoBtnId: string = 'btnUndoSignature'): void {
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
        if (!this.canvas) {
            Diagnostics.log('warn', 'handtekening', `Canvas #${canvasId} niet gevonden`);
            return;
        }

        this.ctx = this.canvas.getContext('2d');
        if (!this.ctx) {
            Diagnostics.log('error', 'handtekening', 'Canvas 2D context niet beschikbaar');
            return;
        }

        // touch-action moet uit staan, anders scrollt de pagina tijdens tekenen.
        this.canvas.style.touchAction = 'none';

        this.syncSize();
        this.setupPointerEvents();

        // ResizeObserver in plaats van window.resize: reageert ook wanneer het
        // element van breedte verandert door layout, en negeert scroll-events.
        if (typeof ResizeObserver !== 'undefined') {
            this.observer = new ResizeObserver(() => this.onResize());
            this.observer.observe(this.canvas);
        } else {
            window.addEventListener('resize', () => this.onResize());
        }

        // Themawissel: opnieuw tekenen met de juiste inktkleur.
        const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
        if (typeof darkQuery.addEventListener === 'function') {
            darkQuery.addEventListener('change', () => this.redraw());
        }

        document.getElementById(clearBtnId)?.addEventListener('click', () => this.clear());
        document.getElementById(undoBtnId)?.addEventListener('click', () => this.undo());
    },

    /* ------------------------------------------------------------ afmeting */

    /** Zet de bitmapgrootte gelijk aan CSS-grootte x DPR. Tekent daarna opnieuw. */
    syncSize(): boolean {
        if (!this.canvas || !this.ctx) return false;
        const rect = this.canvas.getBoundingClientRect();
        if (rect.width < 1 || rect.height < 1) {
            // Canvas staat (nog) verborgen: later opnieuw proberen.
            return false;
        }

        const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
        const targetW = Math.round(rect.width * dpr);
        const targetH = Math.round(rect.height * dpr);

        this.cssWidth = rect.width;
        this.cssHeight = rect.height;

        if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
            this.canvas.width = targetW;
            this.canvas.height = targetH;
        }

        // 1 eenheid in de tekencontext = 1 CSS-pixel.
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.redraw();
        return true;
    },

    onResize(): void {
        if (this.resizeTimer !== null) window.clearTimeout(this.resizeTimer);
        this.resizeTimer = window.setTimeout(() => {
            this.resizeTimer = null;
            if (!this.canvas) return;
            const rect = this.canvas.getBoundingClientRect();
            // Alleen opnieuw opbouwen bij een echte maatwijziging.
            if (Math.abs(rect.width - this.cssWidth) < 1 && Math.abs(rect.height - this.cssHeight) < 1) return;
            this.syncSize();
        }, 120);
    },

    inkColor(): string {
        return document.documentElement.classList.contains('dark') ? '#f8fafc' : '#0f172a';
    },

    applyStrokeStyle(): void {
        if (!this.ctx) return;
        this.ctx.strokeStyle = this.inkColor();
        this.ctx.lineWidth = LINE_WIDTH_CSS;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
    },

    /* ----------------------------------------------------------- tekenen */

    setupPointerEvents(): void {
        const canvas = this.canvas;
        if (!canvas) return;

        if ('PointerEvent' in window) {
            canvas.addEventListener('pointerdown', (e) => this.onDown(e));
            canvas.addEventListener('pointermove', (e) => this.onMove(e));
            canvas.addEventListener('pointerup', (e) => this.onUp(e));
            canvas.addEventListener('pointercancel', (e) => this.onUp(e));
            canvas.addEventListener('pointerleave', (e) => this.onUp(e));
            return;
        }

        // Terugvaloptie voor oude browsers zonder PointerEvent.
        canvas.addEventListener('mousedown', (e) => this.onDown(e as unknown as PointerEvent));
        canvas.addEventListener('mousemove', (e) => this.onMove(e as unknown as PointerEvent));
        canvas.addEventListener('mouseup', (e) => this.onUp(e as unknown as PointerEvent));
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.onDown(this.touchToPointer(e));
        }, { passive: false });
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.onMove(this.touchToPointer(e));
        }, { passive: false });
        canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.onUp(this.touchToPointer(e));
        }, { passive: false });
    },

    touchToPointer(e: TouchEvent): PointerEvent {
        const t = e.touches[0] || e.changedTouches[0];
        return { clientX: t?.clientX ?? 0, clientY: t?.clientY ?? 0, pointerId: 1 } as PointerEvent;
    },

    toNormalized(e: PointerEvent): Point | null {
        if (!this.canvas || this.cssWidth === 0 || this.cssHeight === 0) return null;
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        return { x: Math.min(Math.max(x, 0), 1), y: Math.min(Math.max(y, 0), 1) };
    },

    onDown(e: PointerEvent): void {
        // Canvas kan verborgen zijn geweest bij init; maat nu alsnog bepalen.
        if (this.cssWidth === 0 && !this.syncSize()) return;

        const point = this.toNormalized(e);
        if (!point) return;

        this.activePointerId = e.pointerId ?? null;
        if (this.canvas && typeof this.canvas.setPointerCapture === 'function' && e.pointerId !== undefined) {
            try {
                this.canvas.setPointerCapture(e.pointerId);
            } catch {
                /* niet kritiek */
            }
        }

        this.currentStroke = [point];
        this.strokes.push(this.currentStroke);
        this.drawDot(point);
    },

    onMove(e: PointerEvent): void {
        if (!this.currentStroke) return;
        if (this.activePointerId !== null && e.pointerId !== undefined && e.pointerId !== this.activePointerId) return;

        const point = this.toNormalized(e);
        if (!point) return;

        const previous = this.currentStroke[this.currentStroke.length - 1];
        this.currentStroke.push(point);
        this.drawSegment(previous, point);
    },

    onUp(e: PointerEvent): void {
        if (!this.currentStroke) return;
        if (this.canvas && typeof this.canvas.releasePointerCapture === 'function' && e.pointerId !== undefined) {
            try {
                this.canvas.releasePointerCapture(e.pointerId);
            } catch {
                /* niet kritiek */
            }
        }
        if (this.currentStroke.length < 2) {
            Diagnostics.log('debug', 'handtekening', 'Enkel punt gezet');
        }
        this.currentStroke = null;
        this.activePointerId = null;
    },

    drawDot(p: Point): void {
        if (!this.ctx) return;
        this.applyStrokeStyle();
        this.ctx.beginPath();
        this.ctx.arc(p.x * this.cssWidth, p.y * this.cssHeight, LINE_WIDTH_CSS / 2, 0, Math.PI * 2);
        this.ctx.fillStyle = this.inkColor();
        this.ctx.fill();
    },

    drawSegment(from: Point, to: Point): void {
        if (!this.ctx) return;
        this.applyStrokeStyle();
        this.ctx.beginPath();
        this.ctx.moveTo(from.x * this.cssWidth, from.y * this.cssHeight);
        this.ctx.lineTo(to.x * this.cssWidth, to.y * this.cssHeight);
        this.ctx.stroke();
    },

    /** Tekent alle bewaarde streken opnieuw (scherp, zonder bitmapverlies). */
    redraw(): void {
        if (!this.ctx || !this.canvas) return;
        this.ctx.clearRect(0, 0, this.cssWidth, this.cssHeight);
        this.applyStrokeStyle();
        for (const stroke of this.strokes) {
            if (stroke.length === 1) {
                this.drawDot(stroke[0]);
                continue;
            }
            this.ctx.beginPath();
            stroke.forEach((p, i) => {
                const x = p.x * this.cssWidth;
                const y = p.y * this.cssHeight;
                if (i === 0) this.ctx!.moveTo(x, y);
                else this.ctx!.lineTo(x, y);
            });
            this.ctx.stroke();
        }
    },

    /* ------------------------------------------------------------- acties */

    clear(): void {
        this.strokes = [];
        this.currentStroke = null;
        this.redraw();
    },

    undo(): void {
        if (this.strokes.length === 0) return;
        this.strokes.pop();
        this.redraw();
    },

    /**
     * Export voor het PDF-rapport: altijd donkere inkt op wit, 2x resolutie.
     * Zo blijft de handtekening leesbaar ook als in dark mode is getekend.
     */
    getBase64(): string | null {
        if (this.strokes.length === 0) return null;

        const scale = 2;
        const width = Math.max(Math.round(this.cssWidth), 200);
        const height = Math.max(Math.round(this.cssHeight), 80);

        const out = document.createElement('canvas');
        out.width = width * scale;
        out.height = height * scale;
        const octx = out.getContext('2d');
        if (!octx) return null;

        octx.setTransform(scale, 0, 0, scale, 0, 0);
        octx.fillStyle = '#ffffff';
        octx.fillRect(0, 0, width, height);
        octx.strokeStyle = '#0f172a';
        octx.fillStyle = '#0f172a';
        octx.lineWidth = LINE_WIDTH_CSS;
        octx.lineCap = 'round';
        octx.lineJoin = 'round';

        for (const stroke of this.strokes) {
            if (stroke.length === 1) {
                octx.beginPath();
                octx.arc(stroke[0].x * width, stroke[0].y * height, LINE_WIDTH_CSS / 2, 0, Math.PI * 2);
                octx.fill();
                continue;
            }
            octx.beginPath();
            stroke.forEach((p, i) => {
                const x = p.x * width;
                const y = p.y * height;
                if (i === 0) octx.moveTo(x, y);
                else octx.lineTo(x, y);
            });
            octx.stroke();
        }

        return out.toDataURL('image/png');
    },

    /** Behouden voor compatibiliteit: themawissel vraagt een hertekening. */
    updateThemeColor(): void {
        this.redraw();
    },
};
