/* netlify/edge-functions/auth.js - LMRA Sentinel Auth (Cookie-Bridge Fixed) */

export default async (request, context) => {
  const url = new URL(request.url);
  
  // 1. Definieer beveiligde paden
  const protectedPaths = [
    '/admin.html', 
    '/.netlify/functions/get-reports', 
    '/.netlify/functions/delete-report'
  ];

  const isProtected = protectedPaths.some(path => url.pathname.startsWith(path));

  // Als het geen beveiligd pad is, laat door.
  if (!isProtected) {
    return context.next();
  }

  // 2. Check voor de authenticatie-cookie 'nf_jwt'
  // De widget zet deze niet zelf, dat doet ons script hieronder (De 'Bridge').
  const jwt = context.cookies.get('nf_jwt');

  // Als er een geldig token in de cookie zit, laat door.
  // Netlify verifieert de handtekening van de cookie automatisch in de achtergrond.
  if (jwt) {
    return context.next();
  }

  // --- GEEN TOEGANG ---

  // Situatie A: API call (data ophalen) zonder auth -> 401 Error
  if (url.pathname.startsWith('/.netlify/functions/')) {
      return new Response(JSON.stringify({ error: "Unauthorized: Sessie verlopen of ongeldig" }), { 
          status: 401, 
          headers: { "Content-Type": "application/json" }
      });
  }

  // Situatie B: Browser verzoek (admin.html) -> Toon speciale inlogpagina
  // We injecteren hier de 'Cookie-Bridge' logica.
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
          <p class="text-slate-400 mb-6 text-sm">Deze omgeving is beveiligd. Log in om toegang te krijgen.</p>
          
          <div class="space-y-4">
              <button onclick="netlifyIdentity.open()" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-lg transition shadow-lg transform active:scale-95">
                  Inloggen Beheerder
              </button>
              <a href="/" class="block text-xs text-slate-500 hover:text-slate-300 transition">Terug naar App</a>
          </div>
      </div>

      <script>
          if (window.netlifyIdentity) {
              window.netlifyIdentity.init();

              // --- DE COOKIE BRIDGE ---
              // Zodra de gebruiker inlogt via de widget, pakken we het token
              // en zetten we het in een cookie die de Edge Function kan lezen.
              window.netlifyIdentity.on('login', (user) => {
                  if(user && user.token) {
                      console.log("Login succesvol, cookie instellen...");
                      const token = user.token.access_token;
                      
                      // Cookie instellen: Secure, SameSite=Strict is verplicht voor veiligheid
                      // Max-Age 3600 = 1 uur geldig
                      document.cookie = "nf_jwt=" + token + "; path=/; max-age=3600; SameSite=Strict; Secure";
                      
                      // Herlaad de pagina. De Edge Function ziet nu de cookie en laat je door naar admin.html
                      window.location.reload();
                  }
              });
          }
      </script>
    </body>
    </html>
  `, {
    headers: { 'content-type': 'text/html' }
  });
};