import { neon } from '@neondatabase/serverless';

// LMRA Pro v8.2 - Sentinel Backend
// Features: Rate Limiting (Edge), Honeypot, Idempotency Check (Anti-Duplicate)

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

    // 1. HONEYPOT CHECK (SPAM TRAP)
    if (data.contact_email && data.contact_email.length > 0) {
        console.warn(`Spam detectie: Honeypot trap geactiveerd door IP ${event.headers['client-ip']}`);
        return {
            statusCode: 200, 
            body: JSON.stringify({ message: "Veilig opgeslagen" }), // Fake success
            headers: { "Content-Type": "application/json" }
        };
    }

    // 2. IDEMPOTENCY CHECK (Voorkom dubbele inzendingen)
    if (data.report_id) {
        const existing = await sql`SELECT id FROM lmra_reports WHERE report_id = ${data.report_id} LIMIT 1`;
        
        if (existing.length > 0) {
            console.log(`Duplicaat gedetecteerd voor ID ${data.report_id}. Genegeerd.`);
            return {
                statusCode: 200,
                body: JSON.stringify({ message: "Reeds verwerkt (Duplicaat)" }),
                headers: { "Content-Type": "application/json" }
            };
        }
    }

    // 3. VALIDATIE
    if (!data.monteur_naam || data.monteur_naam.length > 100) return { statusCode: 400, body: "Naam ongeldig" };
    if (!data.locatie || data.locatie.length > 100) return { statusCode: 400, body: "Locatie ongeldig" };

    // 4. OPSLAAN
    if (data.report_id) {
        await sql`
          INSERT INTO lmra_reports 
          (report_id, monteur_naam, locatie, werkorder, is_veilig, opmerkingen, afkeurpunten) 
          VALUES 
          (${data.report_id}, ${data.monteur_naam}, ${data.locatie}, ${data.werkorder}, ${data.is_veilig}, ${data.opmerkingen}, ${JSON.stringify(data.afkeurpunten)})
        `;
    } else {
        // Fallback
        await sql`
          INSERT INTO lmra_reports 
          (monteur_naam, locatie, werkorder, is_veilig, opmerkingen, afkeurpunten) 
          VALUES 
          (${data.monteur_naam}, ${data.locatie}, ${data.werkorder}, ${data.is_veilig}, ${data.opmerkingen}, ${JSON.stringify(data.afkeurpunten)})
        `;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Veilig opgeslagen in Sentinel Cloud" }),
      headers: { "Content-Type": "application/json" }
    };

  } catch (error) {
    console.error("Fout bij opslaan rapport:", error);
    if (error.code === '23505') { 
        return { statusCode: 200, body: JSON.stringify({ message: "Reeds verwerkt" }) };
    }
    return { statusCode: 500, body: "Verwerkingsfout" };
  }
};