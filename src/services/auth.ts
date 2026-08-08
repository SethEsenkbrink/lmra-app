/* src/services/auth.ts - Instant Zero-Friction Launcher */

export const AuthService = {
    async init(onUnlock: () => void): Promise<void> {
        // Direct ontgrendelen zonder drempel of PIN-inlogscherm
        onUnlock();
    }
};