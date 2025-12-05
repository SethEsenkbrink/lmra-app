export default async (request, context) => {
  const url = new URL(request.url);
  
  // We beveiligen de admin pagina EN de data-functies
  if (url.pathname === '/admin.html' || url.pathname.includes('/get-reports') || url.pathname.includes('/delete-report')) {
    
    // Check voor de cookie
    const cookies = context.cookies;
    const authCookie = cookies.get('lmra_auth');
    
    // Haal de geheime code uit de omgevingsvariabelen
    const secretKey = Deno.env.get('ADMIN_ACCESS_TOKEN');

    // Als de geheime sleutel nog niet is ingesteld in Netlify, blokkeer alles voor veiligheid
    if (!secretKey) {
        return new Response("CRITICAL ERROR: ADMIN_ACCESS_TOKEN not set in Netlify Environment Variables.", { status: 500 });
    }

    // 1. Is de gebruiker al ingelogd? (Cookie matcht met secret)
    if (authCookie === secretKey) {
      return context.next(); // Laat door naar de echte pagina/functie
    }

    // 2. Probeert de gebruiker in te loggen? (Formulier submit)
    if (url.pathname === '/admin.html' && url.searchParams.get('code')) {
        const inputCode = url.searchParams.get('code');
        
        if (inputCode === secretKey) {
            // Code is goed! Zet de cookie (7 dagen geldig)
            const response = await context.next();
            context.cookies.set({
                name: 'lmra_auth',
                value: secretKey,
                path: '/',
                httpOnly: true, // Javascript kan hier niet bij (veilig)
                secure: true,
                sameSite: 'Strict',
                maxAge: 60 * 60 * 24 * 7 
            });
            
            // Refresh de pagina naar een schone URL
            return new Response(null, {
                status: 302,
                headers: {
                    'Location': '/admin.html',
                    'Set-Cookie': context.cookies.toString()
                }
            });
        }
    }

    // 3. Geen toegang? Toon het inlogscherm (vervangt de admin.html)
    if (url.pathname === '/admin.html') {
        return new Response(`
          <!DOCTYPE html>
          <html lang="nl">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Beveiligde Toegang - LMRA Pro</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet"/>
          </head>
          <body class="bg-slate-900 flex items-center justify-center h-screen font-sans text-white">
            <div class="bg-slate-800 p-8 rounded-xl shadow-2xl text-center max-w-sm w-full border border-slate-700">
                <div class="text-5xl text-blue-500 mb-6"><i class="fa-solid fa-shield-halved"></i></div>
                <h1 class="text-xl font-bold mb-4">Sentinel Beheer</h1>
                <p class="text-slate-400 text-sm mb-6">Toegang beperkt tot bevoegden.</p>
                <form method="GET" action="/admin.html">
                    <input type="password" name="code" placeholder="Voer toegangscode in..." class="w-full p-3 rounded bg-slate-700 border border-slate-600 text-white mb-4 focus:ring-2 focus:ring-blue-500 outline-none text-center" required autofocus>
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

    // 4. Blokkeer directe API toegang zonder cookie
    return new Response("Geen toegang: Sessie verlopen of ongeldig.", { status: 401 });
  }

  return context.next();
};