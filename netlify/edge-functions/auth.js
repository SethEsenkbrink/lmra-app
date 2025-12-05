export default async (request, context) => {
  const url = new URL(request.url);
  
  // Definieer welke paden beveiligd moeten zijn
  // Dit vervangt de losse [[edge_functions]] regels in netlify.toml niet, maar handelt de logica af.
  const protectedPaths = [
    '/admin.html', 
    '/.netlify/functions/get-reports', 
    '/.netlify/functions/delete-report'
  ];

  // Check of het huidige pad beveiligd moet worden
  const isProtected = protectedPaths.some(path => url.pathname.startsWith(path));

  // Als het geen beveiligd pad is (bijv. index.html of submit-lmra), laat door.
  if (!isProtected) {
    return context.next();
  }

  // --- IDENTITY CHECK ---
  // Netlify Identity zet automatisch een cookie 'nf_jwt' na succesvol inloggen.
  const jwt = context.cookies.get('nf_jwt');

  // GEEN GELDIG TOKEN? -> BLOKKEREN
  if (!jwt) {
    
    // Situatie A: Het is een API call (bijv. data ophalen). Stuur JSON 401.
    if (url.pathname.startsWith('/.netlify/functions/')) {
        return new Response(JSON.stringify({ error: "Unauthorized: Sessie verlopen" }), { 
            status: 401, 
            headers: { "Content-Type": "application/json" }
        });
    }

    // Situatie B: Het is een browser request (admin.html). Toon het inlogscherm.
    // We serveren hier HTML direct vanuit de Edge Function zodat de echte admin.html verborgen blijft.
    return new Response(`
      <!DOCTYPE html>
      <html lang="nl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sentinel Login</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://identity.netlify.com/v1/netlify-identity-widget.js"></script>
        <style>body { background-color: #0f172a; color: white; font-family: sans-serif; }</style>
      </head>
      <body class="flex items-center justify-center h-screen flex-col gap-6">
        <div class="bg-slate-800 p-8 rounded-xl shadow-2xl text-center max-w-sm w-full border border-slate-700">
            <div class="text-5xl text-blue-500 mb-6"><i class="fa-solid fa-shield-halved"></i></div>
            <h1 class="text-2xl font-bold mb-2">Sentinel Beveiliging</h1>
            <p class="text-slate-400 mb-6 text-sm">Deze omgeving is beveiligd met Netlify Identity (RBAC).</p>
            
            <div class="space-y-4">
                <button onclick="netlifyIdentity.open()" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-lg transition shadow-lg transform active:scale-95">
                    Inloggen Beheerder
                </button>
                <a href="/" class="block text-xs text-slate-500 hover:text-slate-300 transition">Terug naar App</a>
            </div>
        </div>

        <script>
            // Initialiseer widget
            netlifyIdentity.init();

            // Zodra login succesvol is, herlaad de pagina.
            // Omdat de cookie 'nf_jwt' dan is gezet, laat de Edge Function ons de volgende keer wel door.
            netlifyIdentity.on('login', () => {
                window.location.reload();
            });
        </script>
      </body>
      </html>
    `, {
      headers: { 'content-type': 'text/html' }
    });
  }

  // WEL GELDIG TOKEN? -> Laat verzoek door naar de echte content (admin.html of functie)
  return context.next();
};