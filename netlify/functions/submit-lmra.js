import { neon } from '@neondatabase/serverless';

// Hulpfunctie: Maak input onschadelijk (Sanitization)
const escapeHtml = (unsafe) => {
    if (typeof unsafe !== 'string') return unsafe;
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
};

// Rate Limiting (Simpel in-memory, let op: resets bij nieuwe lambda instance)
const rateLimit = new Map();

export const handler = async (event, context) => {
  // Rate Limit Check (5 requests per minuut per IP)
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

  // Methode check
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

    // Input valideren & schoonmaken
    const cleanNaam = escapeHtml(data.monteur_naam);
    const cleanLocatie = escapeHtml(data.locatie);
    const cleanWO = escapeHtml(data.werkorder);
    const cleanOpmerkingen = escapeHtml(data.opmerkingen);
    const cleanAfkeur = escapeHtml(JSON.stringify(data.afkeurpunten));

    if (!cleanNaam || cleanNaam.length > 100) return { statusCode: 400, body: "Naam ongeldig" };
    if (!cleanLocatie || cleanLocatie.length > 100) return { statusCode: 400, body: "Locatie ongeldig" };

    await sql`
      INSERT INTO lmra_reports 
      (monteur_naam, locatie, werkorder, is_veilig, opmerkingen, afkeurpunten) 
      VALUES 
      (${cleanNaam}, ${cleanLocatie}, ${cleanWO}, ${data.is_veilig}, ${cleanOpmerkingen}, ${cleanAfkeur})
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
