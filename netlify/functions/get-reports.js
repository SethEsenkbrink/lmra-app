import { neon } from '@neondatabase/serverless';

export const handler = async (event, context) => {
  // STAP 1: Authenticatie Check
  // Netlify Identity stopt de gebruikersinfo automatisch in context.clientContext
  // Als 'user' leeg is, is er geen geldig token meegestuurd.
  const user = context.clientContext && context.clientContext.user;

  if (!user) {
    return { 
      statusCode: 401, 
      body: JSON.stringify({ error: "Niet geautoriseerd. Log in via Netlify Identity." }) 
    };
  }

  // STAP 2: Data Ophalen
  try {
    const sql = neon(process.env.NETLIFY_DATABASE_URL);
    // Haal de laatste 100 rapporten op
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