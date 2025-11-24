import { neon } from '@neondatabase/serverless';

export const handler = async (event, context) => {
  // 1. Veiligheidscheck: Alleen POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    // 2. Database configuratie check
    const dbUrl = process.env.NETLIFY_DATABASE_URL;
    if (!dbUrl) {
      console.error("CRITICAL: Geen database URL geconfigureerd in Netlify.");
      return { statusCode: 500, body: JSON.stringify({ error: "Server configuratie fout" }) };
    }

    const sql = neon(dbUrl);
    
    // 3. Data uitpakken
    let data;
    try {
      data = JSON.parse(event.body);
    } catch (e) {
      return { statusCode: 400, body: JSON.stringify({ error: "Ongeldige JSON data" }) };
    }

    const { monteur_naam, locatie, werkorder, is_veilig, opmerkingen, afkeurpunten } = data;

    // --- NIEUW: Server-side Validatie (Extra slot op de deur) ---
    // We vertrouwen de frontend niet blindelings.
    if (!monteur_naam || monteur_naam.length > 100) {
      return { statusCode: 400, body: JSON.stringify({ error: "Naam ongeldig of te lang" }) };
    }
    if (!locatie || locatie.length > 100) {
      return { statusCode: 400, body: JSON.stringify({ error: "Locatie ongeldig of te lang" }) };
    }
    // -----------------------------------------------------------

    // 4. Opslaan
    await sql`
      INSERT INTO lmra_reports 
      (monteur_naam, locatie, werkorder, is_veilig, opmerkingen, afkeurpunten) 
      VALUES 
      (${monteur_naam}, ${locatie}, ${werkorder}, ${is_veilig}, ${opmerkingen}, ${JSON.stringify(afkeurpunten)})
    `;

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Succesvol en veilig opgeslagen!" }),
      headers: { "Content-Type": "application/json" }
    };

  } catch (error) {
    console.error("Backend Fout:", error); // Dit komt in je Netlify logs
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server fout verwerking" }), // Geef geen technische details terug aan gebruiker
      headers: { "Content-Type": "application/json" }
    };
  }
};
