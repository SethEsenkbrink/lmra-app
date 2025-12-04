import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

export const handler = async (event, context) => {
  // 1. Haal de cookies uit de request headers
  const cookies = parse(event.headers.cookie || "");
  const token = cookies.auth_token;

  // 2. Check of er een token is en of deze geldig is (met jouw JWT_SECRET)
  if (!token) {
    return { statusCode: 401, body: JSON.stringify({ message: "Niet ingelogd" }) };
  }

  try {
    // Dit verifieert de handtekening van de cookie. Als er mee geknoeid is, faalt dit.
    jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return { statusCode: 401, body: JSON.stringify({ message: "Sessie verlopen of ongeldig" }) };
  }

  // 3. Als we hier zijn, is de gebruiker veilig ingelogd. Haal data op.
  try {
    const sql = neon(process.env.NETLIFY_DATABASE_URL);
    // Haal de 100 nieuwste rapporten op
    const reports = await sql`SELECT * FROM lmra_reports ORDER BY created_at DESC LIMIT 100`;

    return {
      statusCode: 200,
      body: JSON.stringify(reports),
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
    };

  } catch (error) {
    console.error("DB Fout:", error);
    return { statusCode: 500, body: "Data Fout" };
  }
};