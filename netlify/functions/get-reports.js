import { neon } from '@neondatabase/serverless';
import crypto from 'crypto'; // Node.js crypto library voor veiligheid

export const handler = async (event, context) => {
  // 1. Haal wachtwoorden op
  const secretInput = event.headers['x-admin-secret'] || "";
  const realSecret = process.env.ADMIN_PASSWORD;

  // 2. Kritieke Check: Is er wel een wachtwoord ingesteld op de server?
  // Zo niet: Blokkeer alles (Fail Secure). Geen fallback naar "geheim123"!
  if (!realSecret) {
    console.error("CRITICAL: ADMIN_PASSWORD variabele ontbreekt in Netlify!");
    return { statusCode: 500, body: "Server Configuratie Fout" };
  }

  // 3. Constant-Time Vergelijking (Tegen Timing Attacks)
  // We maken buffers van de strings om ze veilig te vergelijken
  const bufferInput = Buffer.from(secretInput + ""); // Forceer string
  const bufferReal = Buffer.from(realSecret + "");

  // Alleen vergelijken als lengtes gelijk zijn (anders lekt lengte info, maar dat is acceptabel risico hier)
  let match = false;
  if (bufferInput.length === bufferReal.length) {
      match = crypto.timingSafeEqual(bufferInput, bufferReal);
  }

  if (!match) {
    // We vertellen niet WAT er fout is, alleen DAT het fout is
    // We voegen een kleine vertraging toe om brute-force te vertragen (simulatie)
    await new Promise(resolve => setTimeout(resolve, 200)); 
    return { statusCode: 401, body: "Niet geautoriseerd" };
  }

  try {
    const sql = neon(process.env.NETLIFY_DATABASE_URL);

    // Haal laatste 100 op
    const reports = await sql`
      SELECT * FROM lmra_reports 
      ORDER BY created_at DESC 
      LIMIT 100
    `;

    return {
      statusCode: 200,
      body: JSON.stringify(reports),
      headers: { 
        "Content-Type": "application/json",
        "Cache-Control": "no-store" // Niet opslaan in browser cache (veiligheid)
      }
    };

  } catch (error) {
    console.error("DB Fout:", error);
    return { statusCode: 500, body: "Data ophaal fout" };
  }
};
