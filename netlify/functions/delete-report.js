import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';

export const handler = async (event, context) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  // 1. Veilige Authenticatie
  const secretInput = event.headers['x-admin-secret'] || "";
  const realSecret = process.env.ADMIN_PASSWORD;

  if (!realSecret) {
    console.error("CRITICAL: ADMIN_PASSWORD ontbreekt");
    return { statusCode: 500, body: "Configuratie Fout" };
  }

  const bufferInput = Buffer.from(secretInput + "");
  const bufferReal = Buffer.from(realSecret + "");
  
  let match = false;
  if (bufferInput.length === bufferReal.length) {
      match = crypto.timingSafeEqual(bufferInput, bufferReal);
  }

  if (!match) {
    await new Promise(resolve => setTimeout(resolve, 500)); // 500ms vertraging bij delete
    return { statusCode: 401, body: "Niet geautoriseerd" };
  }

  try {
    const sql = neon(process.env.NETLIFY_DATABASE_URL);
    const data = JSON.parse(event.body);
    const id = data.id;

    if (!id) return { statusCode: 400, body: "Geen ID" };

    // SQL Parameterization (voorkomt SQL Injection, zat er al in, maar belangrijk)
    await sql`DELETE FROM lmra_reports WHERE id = ${id}`;

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
