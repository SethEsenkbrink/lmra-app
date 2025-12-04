import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

export const handler = async (event, context) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  // 1. Beveiliging: Check de cookie
  const cookies = parse(event.headers.cookie || "");
  const token = cookies.auth_token;

  if (!token) return { statusCode: 401, body: "Niet ingelogd" };

  try {
    jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return { statusCode: 401, body: "Ongeldige sessie" };
  }

  // 2. Uitvoeren van de verwijdering
  try {
    const sql = neon(process.env.NETLIFY_DATABASE_URL);
    const data = JSON.parse(event.body);
    
    if (!data.id) return { statusCode: 400, body: "Geen ID" };

    await sql`DELETE FROM lmra_reports WHERE id = ${data.id}`;

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Verwijderd" }),
      headers: { "Content-Type": "application/json" }
    };

  } catch (error) {
    console.error("Delete Fout:", error);
    return { statusCode: 500, body: "Fout bij verwijderen" };
  }
};