export default async (request, context) => {
  try {
    const url = new URL(request.url);
    
    // ---------------------------------------------------------
    // 0. LOGOUT HANDLER (De "Uitlogknop" stuurt je hierheen)
    // ---------------------------------------------------------
    if (url.pathname === '/admin.html' && url.searchParams.get('action') === 'logout') {
        
        // We sturen een commando terug om de cookie direct te vernietigen (Max-Age=0)
        const clearCookie = `lmra_auth=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;

        return new Response(null, {
            status: 302, // Redirect
            headers: {
                'Location': '/admin.html', // Stuur terug naar de login pagina
                'Set-Cookie': clearCookie  // DIT wist de cookie uit de browser
            }
        });
    }

    // ---------------------------------------------------------
    // BEVEILIGINGS CHECK
    // ---------------------------------------------------------
    if (url.pathname === '/admin.html' || url.pathname.includes('/get-reports') || url.pathname.includes('/delete-report')) {
      
      const cookies = context.cookies;
      const authCookie = cookies.get('lmra_auth');
      const secretKey = Deno.env.get('ADMIN_ACCESS_TOKEN');

      if (!secretKey) {
        return new Response("CONFIG ERROR: ADMIN_ACCESS_TOKEN ontbreekt in Netlify.", { status: 500 });
      }

      // 1. Is de gebruiker al ingelogd?
      if (authCookie === secretKey) {
        return context.next();
      }

      // 2. INLOGGEN: Code check
      if (url.pathname === '/admin.html' && url.searchParams.get('code')) {
          const inputCode = url.searchParams.get('code');
          
          if (inputCode === secretKey) {
              // Code is goed! 
              // LET OP: Geen 'Max-Age' meer = Sessie cookie (weg als browser sluit)
              const cookieString = `lmra_auth=${secretKey}; Path=/; HttpOnly; Secure; SameSite=Strict`;
              
              return new Response(null, {
                  status: 302,
                  headers: {
                      'Location': '/admin.html',
                      'Set-Cookie': cookieString
                  }
              });
          }
      }

      // 3. GEEN TOEGANG? Toon inlogscherm (Vervangt admin.html)
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
          `, { headers: { 'content-type': 'text/html' } });
      }

      // 4. Blokkeer API toegang
      return new Response("Geen toegang.", { status: 401 });
    }

    return context.next();

  } catch (error) {
    return new Response(`Server Error: ${error.message}`, { status: 500 });
  }
};