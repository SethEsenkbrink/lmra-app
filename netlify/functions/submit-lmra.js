import { neon } from '@neondatabase/serverless';

// We gebruiken hier de universele 'handler' schrijfwijze die altijd werkt op Netlify
export const handler = async (event, context) => {
  
  // 1. Veiligheidscheck: Alleen POST verzoeken toestaan
  // Let op: 'event.httpMethod' is de klassieke manier om dit te checken
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    // 2. Controleren of de database sleutel aanwezig is
    const dbUrl = process.env.NETLIFY_DATABASE_URL;
    if (!dbUrl) {
      console.error("Geen database URL gevonden!");
      throw new Error("Database configuratie ontbreekt in Netlify.");
    }

    // 3. Verbinden met Neon
    const sql = neon(dbUrl);

    // 4. Data uitpakken (Parsing)
    // We gebruiken JSON.parse(event.body), dit is de meest veilige manier
    const data = JSON.parse(event.body);
    const { monteur_naam, locatie, werkorder, is_veilig, opmerkingen, afkeurpunten } = data;

    // 5. De SQL Query uitvoeren
    await sql`
      INSERT INTO lmra_reports 
      (monteur_naam, locatie, werkorder, is_veilig, opmerkingen, afkeurpunten) 
      VALUES 
      (${monteur_naam}, ${locatie}, ${werkorder}, ${is_veilig}, ${opmerkingen}, ${JSON.stringify(afkeurpunten)})
    `;

    // 6. Succes terugmelden
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Succesvol opgeslagen in Neon DB!" }),
      headers: { "Content-Type": "application/json" }
    };

  } catch (error) {
    // Dit zorgt dat we de fout terugzien in de logs als het misgaat
    console.error("Fout in backend functie:", error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server fout: " + error.message }),
      headers: { "Content-Type": "application/json" }
    };
  }
};
