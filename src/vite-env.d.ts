/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Globale constanten
declare const __APP_VERSION__: string;

// Module definitie voor jspdf-autotable
declare module 'jspdf-autotable' {
    import { jsPDF } from 'jspdf';
    
    // We vertellen TypeScript dat deze functie bestaat en een jsPDF instantie + opties verwacht
    export default function autoTable(doc: jsPDF, options: any): void;
}