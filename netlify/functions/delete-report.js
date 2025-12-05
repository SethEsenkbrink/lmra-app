import { neon } from '@neondatabase/serverless';

export const handler = async (event, context) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  // 1. Auth Check via Netlify Identity
  const user = context.clientContext && context.clientContext.user;
  if (!user) {
    return { statusCode: 401, body: "Niet geautoriseerd" };
  }

  try {
    const sql = neon(process.env.NETLIFY_DATABASE_URL);
    const data = JSON.parse(event.body);
    
    if (!data.id) return { statusCode: 400, body: "Geen ID opgegeven" };

    // 2. Verwijder item
    await sql`DELETE FROM lmra_reports WHERE id = ${data.id}`;

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Succesvol verwijderd" }),
      headers: { "Content-Type": "application/json" }
    };

  } catch (error) {
    console.error("Delete Fout:", error);
    return { statusCode: 500, body: "Server fout bij verwijderen" };
  }
};