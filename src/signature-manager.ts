/* src/signature-manager.ts - Handles Digital Signature Canvas */
export const SignatureManager = {
    canvas: null as HTMLCanvasElement | null,
    ctx: null as CanvasRenderingContext2D | null,
    isDrawing: false,
    isEmpty: true,

    init(canvasId: string, clearBtnId: string) {
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        if (!this.canvas) return;
        
        this.ctx = this.canvas.getContext('2d');
        if (!this.ctx) return;

        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        this.setupEventListeners();

        const clearBtn = document.getElementById(clearBtnId);
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clear());
        }
    },

    resizeCanvas() {
        if (!this.canvas) return;
        // Make it visually match the container size but keep resolution sharp
        const rect = this.canvas.parentElement?.getBoundingClientRect();
        if (rect) {
            this.canvas.width = rect.width - 32; // padding
            this.canvas.height = 128; // h-32 = 128px
        }
        
        if (this.ctx) {
            this.ctx.strokeStyle = document.documentElement.classList.contains('dark') ? '#ffffff' : '#0f172a';
            this.ctx.lineWidth = 2;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
        }
    },

    setupEventListeners() {
        if (!this.canvas) return;
        
        // Mouse Events
        this.canvas.addEventListener('mousedown', (e) => this.startPosition(e));
        this.canvas.addEventListener('mouseup', () => this.endPosition());
        this.canvas.addEventListener('mousemove', (e) => this.draw(e));
        this.canvas.addEventListener('mouseleave', () => this.endPosition());

        // Touch Events
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.canvas?.dispatchEvent(mouseEvent);
        }, { passive: false });

        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            const mouseEvent = new MouseEvent('mouseup', {});
            this.canvas?.dispatchEvent(mouseEvent);
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.canvas?.dispatchEvent(mouseEvent);
        }, { passive: false });
    },

    startPosition(e: MouseEvent) {
        this.isDrawing = true;
        this.draw(e);
    },

    endPosition() {
        this.isDrawing = false;
        if (this.ctx) this.ctx.beginPath();
    },

    draw(e: MouseEvent) {
        if (!this.isDrawing || !this.ctx || !this.canvas) return;
        this.isEmpty = false;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.ctx.lineTo(x, y);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
    },

    clear() {
        if (!this.ctx || !this.canvas) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.beginPath();
        this.isEmpty = true;
    },

    getBase64(): string | null {
        if (this.isEmpty || !this.canvas) return null;
        return this.canvas.toDataURL('image/png');
    },

    updateThemeColor() {
        if (!this.ctx) return;
        this.ctx.strokeStyle = document.documentElement.classList.contains('dark') ? '#ffffff' : '#0f172a';
    }
};
