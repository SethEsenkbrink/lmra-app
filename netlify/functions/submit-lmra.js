import { neon } from '@neondatabase/serverless';

// Hulpfunctie: Maak input onschadelijk (Sanitization)
// Dit verandert <script> in &lt;script&gt; zodat het niet uitvoerbaar is
const escapeHtml = (unsafe) => {
    if (typeof unsafe !== 'string') return unsafe;
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
};

export const handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const dbUrl = process.env.NETLIFY_DATABASE_URL;
    if (!dbUrl) {
      // Geen specifieke error naar buiten lekken, alleen in server log
      console.error("CRITICAL: Database URL ontbreekt.");
      return { statusCode: 500, body: "Server Fout" };
    }

    const sql = neon(dbUrl);
    
    // Data parsen
    let data;
    try {
      data = JSON.parse(event.body);
    } catch (e) {
      return { statusCode: 400, body: "Ongeldige data" };
    }

    // Input valideren & schoonmaken (Sanitization)
    // We cleanen ELK veld dat tekst bevat
    const cleanNaam = escapeHtml(data.monteur_naam);
    const cleanLocatie = escapeHtml(data.locatie);
    const cleanWO = escapeHtml(data.werkorder);
    const cleanOpmerkingen = escapeHtml(data.opmerkingen);
    const cleanAfkeur = escapeHtml(JSON.stringify(data.afkeurpunten)); // Eerst stringify, dan cleanen

    // Server-side validatie (lengte checks)
    if (!cleanNaam || cleanNaam.length > 100) return { statusCode: 400, body: "Naam ongeldig" };
    if (!cleanLocatie || cleanLocatie.length > 100) return { statusCode: 400, body: "Locatie ongeldig" };

    // Opslaan in DB met de SCHONE variabelen
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
