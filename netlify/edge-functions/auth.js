export default async (request, context) => {
  try {
    const url = new URL(request.url);
    
    // --- 0. UITLOGGEN (Harde Reset) ---
    if (url.pathname === '/admin.html' && url.searchParams.get('action') === 'logout') {
        
        // We sturen headers terug die de browser dwingen ALLES te vergeten
        return new Response(`
            <!DOCTYPE html>
            <html lang="nl">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="refresh" content="2;url=/admin.html">
                <title>Uitloggen...</title>
                <script src="https://cdn.tailwindcss.com"></script>
            </head>
            <body class="bg-slate-900 flex flex-col items-center justify-center h-screen font-sans text-white">
                <div class="text-4xl mb-4">🔒</div>
                <h1 class="text-xl font-bold">Je bent veilig uitgelogd.</h1>
                <p class="text-slate-400 text-sm mt-2">Je wordt teruggestuurd...</p>
            </body>
            </html>
        `, {
            status: 200,
            headers: {
                'Content-Type': 'text/html',
                // Wis de cookie expliciet
                'Set-Cookie': 'lmra_auth=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Strict',
                // Vertel de browser om cache en cookies te wissen (moderne browsers)
                'Clear-Site-Data': '"cookies", "storage"',
                // Voorkom caching van deze pagina
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
    }

    // --- 1. BEVEILIGINGSCHECK ---
    // Geldt voor de admin pagina EN de database functies
    if (url.pathname === '/admin.html' || url.pathname.includes('/get-reports') || url.pathname.includes('/delete-report')) {
      
      const cookies = context.cookies;
      const authCookie = cookies.get('lmra_auth');
      const secretKey = Deno.env.get('ADMIN_ACCESS_TOKEN');

      // Veiligheid: Als er geen key is ingesteld, blokkeer alles.
      if (!secretKey) {
        return new Response("CONFIG ERROR: ADMIN_ACCESS_TOKEN ontbreekt in Netlify instellingen.", { status: 500 });
      }

      // Check: Is de cookie geldig?
      if (authCookie === secretKey) {
        return context.next(); // Ja? Doorlopen.
      }

      // --- 2. INLOGGEN ---
      if (url.pathname === '/admin.html' && url.searchParams.get('code')) {
          const inputCode = url.searchParams.get('code');
          
          if (inputCode === secretKey) {
              // Code is juist -> Zet sessie cookie (vervalt bij afsluiten browser)
              const response = await context.next();
              const cookieString = `lmra_auth=${secretKey}; Path=/; HttpOnly; Secure; SameSite=Strict`;
              
              // Redirect naar schone admin URL
              return new Response(null, {
                  status: 302,
                  headers: {
                      'Location': '/admin.html',
                      'Set-Cookie': cookieString
                  }
              });
          }
      }

      // --- 3. TOON INLOGSCHERM (Als je niet bent ingelogd) ---
      if (url.pathname === '/admin.html') {
          return new Response(`
            <!DOCTYPE html>
            <html lang="nl">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
              <title>Sentinel Toegang</title>
              <script src="https://cdn.tailwindcss.com"></script>
              <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet"/>
            </head>
            <body class="bg-slate-900 flex items-center justify-center h-screen font-sans text-white">
              <div class="bg-slate-800 p-8 rounded-xl shadow-2xl text-center max-w-sm w-full border border-slate-700">
                  <div class="text-5xl text-blue-500 mb-6"><i class="fa-solid fa-user-shield"></i></div>
                  <h1 class="text-xl font-bold mb-4">Sentinel Beheer</h1>
                  <p class="text-slate-400 text-sm mb-6">Toegangscode vereist.</p>
                  
                  <form method="GET" action="/admin.html">
                      <input type="password" name="code" placeholder="Code..." class="w-full p-3 rounded bg-slate-700 border border-slate-600 text-white mb-4 focus:ring-2 focus:ring-blue-500 outline-none text-center transition-all" required autofocus autocomplete="off">
                      <button type="submit" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition shadow-lg">Inloggen</button>
                  </form>
                  <p class="text-xs text-slate-600 mt-6">v8.2 Secure Access</p>
              </div>
            </body>
            </html>
          `, { 
            headers: { 'content-type': 'text/html', 'Cache-Control': 'no-store' } 
          });
      }

      // 4. Blokkeer directe API toegang zonder geldige sessie
      return new Response("Geen toegang.", { status: 401 });
    }

    return context.next();

  } catch (error) {
    return new Response(`Server Error: ${error.message}`, { status: 500 });
  }
};