import { neon } from '@neondatabase/serverless';

export const handler = async (event, context) => {
  // Geen auth check meer nodig hier, Edge Function beschermt deze route
  try {
    const sql = neon(process.env.NETLIFY_DATABASE_URL);
    const reports = await sql`SELECT * FROM lmra_reports ORDER BY created_at DESC LIMIT 100`;

    return {
      statusCode: 200,
      body: JSON.stringify(reports),
      headers: { "Content-Type": "application/json" }
    };

  } catch (error) {
    console.error("DB Fout:", error);
    return { statusCode: 500, body: JSON.stringify({ error: "Database fout" }) };
  }
};