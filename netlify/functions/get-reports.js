import { neon } from '@neondatabase/serverless';

export const handler = async (event, context) => {
  // 1. Beveiliging: Check op een "geheim wachtwoord" in de headers
  // Dit is een simpele beveiliging.
  const secretKey = event.headers['x-admin-secret'];
  const mySecret = process.env.ADMIN_PASSWORD || "geheim123"; // Fallback wachtwoord

  if (secretKey !== mySecret) {
    return { statusCode: 401, body: JSON.stringify({ error: "Niet geautoriseerd" }) };
  }

  try {
    const sql = neon(process.env.NETLIFY_DATABASE_URL);

    // 2. Haal de laatste 50 rapporten op (nieuwste eerst)
    const reports = await sql`
      SELECT * FROM lmra_reports 
      ORDER BY created_at DESC 
      LIMIT 50
    `;

    return {
      statusCode: 200,
      body: JSON.stringify(reports),
      headers: { "Content-Type": "application/json" }
    };

  } catch (error) {
    console.error("Fout bij ophalen data:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
      headers: { "Content-Type": "application/json" }
    };
  }
};
