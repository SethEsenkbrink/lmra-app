import { neon } from '@neondatabase/serverless';

// LMRA Pro v8.2 - Sentinel Backend
// Security: Rate Limiting (Edge), Honeypot Check

export const handler = async (event, context) => {
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

    // --- HONEYPOT CHECK (SPAM TRAP) ---
    // Als 'contact_email' is ingevuld, is het een bot.
    // We sturen een 'succes' response zodat de bot denkt dat het gelukt is,
    // maar we slaan NIETS op in de database.
    if (data.contact_email && data.contact_email.length > 0) {
        console.warn(`Spam detectie: Honeypot trap geactiveerd door IP ${event.headers['client-ip']}`);
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Veilig opgeslagen in Sentinel Cloud" }),
            headers: { "Content-Type": "application/json" }
        };
    }

    // Validatie
    if (!data.monteur_naam || data.monteur_naam.length > 100) return { statusCode: 400, body: "Naam ongeldig" };
    if (!data.locatie || data.locatie.length > 100) return { statusCode: 400, body: "Locatie ongeldig" };

    // Opslaan
    await sql`
      INSERT INTO lmra_reports 
      (monteur_naam, locatie, werkorder, is_veilig, opmerkingen, afkeurpunten) 
      VALUES 
      (${data.monteur_naam}, ${data.locatie}, ${data.werkorder}, ${data.is_veilig}, ${data.opmerkingen}, ${JSON.stringify(data.afkeurpunten)})
    `;

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Veilig opgeslagen in Sentinel Cloud" }),
      headers: { "Content-Type": "application/json" }
    };

  } catch (error) {
    console.error("Fout bij opslaan rapport.");
    return { statusCode: 500, body: "Verwerkingsfout" };
  }
};