// --- NIEUWE LOGOUT FUNCTIE (Cookie-Aware) ---
function handleLogout() {
    if (!confirm("Weet u zeker dat u wilt uitloggen?")) return;
    
    if (window.netlifyIdentity) {
        // 1. Log uit bij de widget (cleart localstorage)
        window.netlifyIdentity.logout();
        
        // 2. Luister naar het logout event
        window.netlifyIdentity.on('logout', () => {
            // 3. CRUCIAAL: Verwijder de cookie handmatig door datum in verleden te zetten
            document.cookie = "nf_jwt=; path=/; max-age=0; SameSite=Strict; Secure";
            
            // 4. Herlaad de pagina -> Edge Function ziet geen cookie meer -> Toont login scherm
            window.location.reload();
        });
    } else {
        // Fallback: Forceer cookie verwijdering
        document.cookie = "nf_jwt=; path=/; max-age=0; SameSite=Strict; Secure";
        window.location.reload();
    }
}