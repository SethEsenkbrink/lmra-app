import { neon } from '@neondatabase/serverless';

export const handler = async (event, context) => {
  // 1. Alleen POST toestaan
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  // 2. Beveiliging: Check wachtwoord
  const secretKey = event.headers['x-admin-secret'];
  const mySecret = process.env.ADMIN_PASSWORD || "geheim123";

  if (secretKey !== mySecret) {
    return { statusCode: 401, body: JSON.stringify({ error: "Niet geautoriseerd" }) };
  }

  try {
    const sql = neon(process.env.NETLIFY_DATABASE_URL);
    const data = JSON.parse(event.body);
    const id = data.id;

    if (!id) throw new Error("Geen ID meegegeven");

    // 3. Verwijder record uit DB
    await sql`
      DELETE FROM lmra_reports 
      WHERE id = ${id}
    `;

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Deleted" }),
      headers: { "Content-Type": "application/json" }
    };

  } catch (error) {
    console.error("Delete error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
      headers: { "Content-Type": "application/json" }
    };
  }
};
