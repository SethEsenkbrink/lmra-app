/* src/photo-manager.ts - Handles capturing and compressing photo evidence */
import { UI } from './ui';

export const PhotoManager = {
    photos: [] as string[],
    maxPhotos: 3,

    init() {
        const btnAdd = document.getElementById('btnTakePhoto');
        const fileInput = document.getElementById('photoInput') as HTMLInputElement;

        if (btnAdd && fileInput) {
            btnAdd.addEventListener('click', () => {
                if (this.photos.length >= this.maxPhotos) {
                    UI.showToast(`⚠️ Maximaal ${this.maxPhotos} foto's toegestaan.`);
                    return;
                }
                fileInput.click();
            });

            fileInput.addEventListener('change', async (e) => {
                const target = e.target as HTMLInputElement;
                if (!target.files || target.files.length === 0) return;

                const file = target.files[0];
                try {
                    const compressedBase64 = await this.compressImage(file);
                    this.addPhoto(compressedBase64);
                } catch (err) {
                    console.error("Fout bij verwerken foto:", err);
                    UI.showToast("❌ Foto verwerken mislukt.");
                }
                
                // Reset input zodat dezelfde foto nogmaals gekozen kan worden indien nodig
                target.value = '';
            });
        }
    },

    compressImage(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 800;
                    const MAX_HEIGHT = 800;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if(ctx) {
                        ctx.drawImage(img, 0, 0, width, height);
                        resolve(canvas.toDataURL('image/jpeg', 0.7)); // 70% quality JPEG
                    } else {
                        reject(new Error("Cannot get canvas context"));
                    }
                };
                img.onerror = (e) => reject(e);
            };
            reader.onerror = (e) => reject(e);
        });
    },

    addPhoto(base64: string) {
        if (this.photos.length >= this.maxPhotos) return;
        this.photos.push(base64);
        this.renderPreviews();
    },

    removePhoto(index: number) {
        this.photos.splice(index, 1);
        this.renderPreviews();
    },

    clear() {
        this.photos = [];
        this.renderPreviews();
    },

    getPhotos(): string[] {
        return [...this.photos];
    },

    renderPreviews() {
        const container = document.getElementById('photoPreviewContainer');
        const emptyState = document.getElementById('photoEmptyState');
        const btnAdd = document.getElementById('btnAddPhoto');
        if (!container || !emptyState) return;

        container.innerHTML = '';

        if (this.photos.length === 0) {
            container.classList.add('hidden');
            emptyState.classList.remove('hidden');
        } else {
            container.classList.remove('hidden');
            emptyState.classList.add('hidden');

            this.photos.forEach((photoUrl, index) => {
                const wrap = document.createElement('div');
                wrap.className = "relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 aspect-video shadow-sm";
                
                const img = document.createElement('img');
                img.src = photoUrl;
                img.className = "w-full h-full object-cover";
                
                const delBtn = document.createElement('button');
                delBtn.className = "absolute top-1 right-1 bg-red-500/80 hover:bg-red-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs backdrop-blur-sm transition-colors";
                delBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
                delBtn.onclick = () => this.removePhoto(index);

                wrap.appendChild(img);
                wrap.appendChild(delBtn);
                container.appendChild(wrap);
            });
        }
        
        if (btnAdd) {
            if (this.photos.length >= this.maxPhotos) {
                btnAdd.classList.add('opacity-50', 'cursor-not-allowed');
            } else {
                btnAdd.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        }
    }
};
