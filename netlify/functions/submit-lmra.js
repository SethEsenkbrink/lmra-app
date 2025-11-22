import { neon } from '@netlify/neon';

export default async (req, context) => {
  // 1. Alleen POST verzoeken toestaan (veiligheid)
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    // 2. Verbinden met de database
    // Netlify haalt zelf de geheime sleutels op die we eerder zagen
    const sql = neon(process.env.NETLIFY_DATABASE_URL);

    // 3. De data uit de app lezen
    const data = await req.json();
    const { monteur_naam, locatie, werkorder, is_veilig, opmerkingen, afkeurpunten } = data;

    // 4. De SQL Query uitvoeren
    // We sturen de data naar de kolommen die je net in Neon hebt gemaakt
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
