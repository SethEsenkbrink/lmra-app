import { neon } from '@neondatabase/serverless';

export default async (req, context) => {
  // 1. Alleen POST verzoeken toestaan (veiligheid)
  // Dit voorkomt dat mensen via de browserbalk per ongeluk data sturen
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    // 2. Verbinden met de database
    // We gebruiken nu de officiële Neon serverless driver
    // Netlify haalt zelf de geheime sleutel (NETLIFY_DATABASE_URL) op uit de instellingen
    const sql = neon(process.env.NETLIFY_DATABASE_URL);

    // 3. De data uit de app lezen
    const data = await req.json();
    const { monteur_naam, locatie, werkorder, is_veilig, opmerkingen, afkeurpunten } = data;

    // 4. De SQL Query uitvoeren
    // We sturen de data naar de kolommen die je in Neon hebt aangemaakt
    await sql`
      INSERT INTO lmra_reports 
      (monteur_naam, locatie, werkorder, is_veilig, opmerkingen, afkeurpunten) 
      VALUES 
      (${monteur_naam}, ${locatie}, ${werkorder}, ${is_veilig}, ${opmerkingen}, ${JSON.stringify(afkeurpunten)})
    `;

    // 5. Succes terugmelden aan de app
    return new Response(JSON.stringify({ message: "Opgeslagen in cloud!" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Database error:", error);
    return new Response(JSON.stringify({ error: "Fout bij opslaan: " + error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
