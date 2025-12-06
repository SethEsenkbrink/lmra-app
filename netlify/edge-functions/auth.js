/* netlify/edge-functions/auth.js - LMRA Sentinel Auth (Short Session) */

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
  const jwt = context.cookies.get('nf_jwt');

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

              window.netlifyIdentity.on('login', (user) => {
                  if(user && user.token) {
                      const token = user.token.access_token;
                      // SESSIE UPDATE: Nu slechts 15 minuten geldig (900 seconden)
                      document.cookie = "nf_jwt=" + token + "; path=/; max-age=900; SameSite=Strict; Secure";
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