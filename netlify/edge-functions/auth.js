export default async (request, context) => {
  try {
    const url = new URL(request.url);
    
    // DEFINITIE: Welke pagina's zijn beveiligd?
    if (url.pathname === '/admin.html' || url.pathname.includes('/get-reports') || url.pathname.includes('/delete-report')) {
      
      // Haal de cookie op
      const cookies = context.cookies;
      const authCookie = cookies.get('lmra_auth');
      
      // Haal geheime code op
      const secretKey = Deno.env.get('ADMIN_ACCESS_TOKEN');

      // CRUCIALE CHECK: Is de variabele wel ingesteld in Netlify?
      if (!secretKey) {
        return new Response("CONFIG ERROR: ADMIN_ACCESS_TOKEN ontbreekt in Netlify instellingen. Ga naar Site Settings > Environment Variables.", { 
            status: 500,
            headers: { "Content-Type": "text/plain" } 
        });
      }

      // 1. Is de gebruiker al ingelogd? (Cookie check)
      if (authCookie === secretKey) {
        return context.next();
      }

      // 2. INLOGGEN: Is dit een inlogpoging? (?code=...)
      if (url.pathname === '/admin.html' && url.searchParams.get('code')) {
          const inputCode = url.searchParams.get('code');
          
          if (inputCode === secretKey) {
              // Code is goed! We bouwen de redirect en cookie handmatig (veiliger)
              
              // Maak de cookie string
              const cookieString = `lmra_auth=${secretKey}; Path=/; Max-Age=604800; Secure; HttpOnly; SameSite=Strict`;
              
              // Stuur direct terug naar admin.html (zonder ?code=)
              return new Response(null, {
                  status: 302,
                  headers: {
                      'Location': '/admin.html',
                      'Set-Cookie': cookieString
                  }
              });
          }
      }

      // 3. GEEN TOEGANG? Toon inlogscherm
      if (url.pathname === '/admin.html') {
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
                  <div class="text-5xl text-blue-500 mb-6"><i class="fa-solid fa-shield-halved"></i></div>
                  <h1 class="text-xl font-bold mb-4">Sentinel Beheer</h1>
                  <p class="text-slate-400 text-sm mb-6">Sessie verlopen of ongeldig.</p>
                  
                  <form method="GET" action="/admin.html">
                      <input type="password" name="code" placeholder="Voer toegangscode in..." class="w-full p-3 rounded bg-slate-700 border border-slate-600 text-white mb-4 focus:ring-2 focus:ring-blue-500 outline-none text-center transition-all" required autofocus>
                      <button type="submit" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition shadow-lg">Inloggen</button>
                  </form>
                  <p class="text-xs text-slate-600 mt-6">v8.2 Secure Access</p>
              </div>
            </body>
            </html>
          `, {
            headers: { 'content-type': 'text/html' }
          });
      }

      // 4. Blokkeer API toegang
      return new Response("Geen toegang: Sessie verlopen.", { status: 401 });
    }

    return context.next();

  } catch (error) {
    // Vang de crash op en toon de echte foutmelding op het scherm
    return new Response(`Edge Function Error: ${error.message}\n\n${error.stack}`, { 
        status: 500,
        headers: { "Content-Type": "text/plain" }
    });
  }
};