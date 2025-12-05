export default async (request, context) => {
  const url = new URL(request.url);
  const cookies = context.cookies;
  const authCookie = cookies.get('lmra_auth');
  const secretKey = Deno.env.get('ADMIN_ACCESS_TOKEN');

  // --- CONFIG CHECK ---
  if (!secretKey) {
    return new Response("CONFIG ERROR: ADMIN_ACCESS_TOKEN ontbreekt.", { status: 500 });
  }

  // --- 1. UITLOGGEN (Harde Reset) ---
  if (url.pathname === '/admin.html' && url.searchParams.get('action') === 'logout') {
    const headers = new Headers({
      'Location': '/admin.html',
      // Wis cookie in het verleden
      'Set-Cookie': 'lmra_auth=deleted; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Strict',
      // FORCEER de browser om data te wissen (Nucleaire optie)
      'Clear-Site-Data': '"cookies", "storage", "executionContexts"'
    });
    return new Response(null, { status: 302, headers });
  }

  // --- 2. INLOGGEN (Token Check) ---
  if (url.searchParams.has('code')) {
    const inputCode = url.searchParams.get('code');
    if (inputCode === secretKey) {
      const headers = new Headers({
        'Location': '/admin.html',
        'Set-Cookie': `lmra_auth=${secretKey}; Path=/; HttpOnly; Secure; SameSite=Strict`
      });
      return new Response(null, { status: 302, headers });
    }
  }

  // --- 3. TOEGANGSCONTROLE ---
  // HIER ZAT DE TYPFOUT, NU GECORRIGEERD NAAR 'const'
  const isAuthenticated = authCookie === secretKey;

  // Situatie A: De gebruiker is NIET ingelogd
  if (!isAuthenticated) {
    
    // Is dit een API call? Stuur JSON error voor de 'oneindige spinner' fix
    if (url.pathname.includes('/.netlify/functions/')) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Is dit de admin pagina? Toon het inlogscherm
    return new Response(`
      <!DOCTYPE html>
      <html lang="nl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sentinel Toegang</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet"/>
      </head>
      <body class="bg-slate-900 flex items-center justify-center h-screen font-sans text-white">
        <div class="bg-slate-800 p-8 rounded-xl shadow-2xl text-center max-w-sm w-full border border-slate-700">
            <div class="text-5xl text-blue-500 mb-6"><i class="fa-solid fa-user-shield"></i></div>
            <h1 class="text-xl font-bold mb-4">Sentinel Beheer</h1>
            <p class="text-slate-400 text-sm mb-6">Voer toegangscode in.</p>
            
            <form method="GET" action="/admin.html">
                <input type="password" name="code" placeholder="Code..." class="w-full p-3 rounded bg-slate-700 border border-slate-600 text-white mb-4 focus:ring-2 focus:ring-blue-500 outline-none text-center transition-all" required autofocus autocomplete="off">
                <button type="submit" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition shadow-lg">Inloggen</button>
            </form>
        </div>
      </body>
      </html>
    `, { 
      headers: { 'content-type': 'text/html', 'Cache-Control': 'no-store' } 
    });
  }

  // Situatie B: Gebruiker is WEL ingelogd -> Laat door
  return context.next();
};