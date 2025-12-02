import { neon } from '@neondatabase/serverless';

// Rate Limiting (5 requests per minuut per IP)
const rateLimit = new Map();

export const handler = async (event, context) => {
  const ip = event.headers['client-ip'] || 'unknown';
  const now = Date.now();
  const windowStart = now - 60000;
  const requestTimestamps = rateLimit.get(ip) || [];
  const recentRequests = requestTimestamps.filter(t => t > windowStart);
  
  if (recentRequests.length >= 5) {
    return { statusCode: 429, body: "Te veel verzoeken. Probeer het later opnieuw." };
  }
  
  recentRequests.push(now);
  rateLimit.set(ip, recentRequests);

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const dbUrl = process.env.NETLIFY_DATABASE_URL;
    if (!dbUrl) {
      console.error("CRITICAL: Database URL ontbreekt.");
      return { statusCode: 500, body: "Server Fout" };
    }

    const sql = neon(dbUrl);
    
    let data;
    try {
      data = JSON.parse(event.body);
    } catch (e) {
      return { statusCode: 400, body: "Ongeldige data" };
    }

    // Validatie (Backend)
    if (!data.monteur_naam || data.monteur_naam.length > 100) return { statusCode: 400, body: "Naam ongeldig" };
    if (!data.locatie || data.locatie.length > 100) return { statusCode: 400, body: "Locatie ongeldig" };

    // Data opslaan (Neon driver regelt de SQL-injectie preventie automatisch)
    // Let op: we slaan afkeurpunten nu op als JSON string
    await sql`
      INSERT INTO lmra_reports 
      (monteur_naam, locatie, werkorder, is_veilig, opmerkingen, afkeurpunten) 
      VALUES 
      (${data.monteur_naam}, ${data.locatie}, ${data.werkorder}, ${data.is_veilig}, ${data.opmerkingen}, ${JSON.stringify(data.afkeurpunten)})
    `;

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Veilig opgeslagen" }),
      headers: { "Content-Type": "application/json" }
    };

  } catch (error) {
    console.error("Backend Fout:", error);
    return { statusCode: 500, body: "Verwerkingsfout" };
  }
};