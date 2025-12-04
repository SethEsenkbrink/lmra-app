import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';

// LMRA Pro v8.0 - Admin Backend (Delete)
export const handler = async (event, context) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  const secretInput = event.headers['x-admin-secret'] || "";
  const realSecret = process.env.ADMIN_PASSWORD;

  if (!realSecret) return { statusCode: 500, body: "Config Fout" };

  const bufferInput = Buffer.from(secretInput + "");
  const bufferReal = Buffer.from(realSecret + "");
  
  let match = false;
  if (bufferInput.length === bufferReal.length) {
      match = crypto.timingSafeEqual(bufferInput, bufferReal);
  }

  if (!match) {
    await new Promise(resolve => setTimeout(resolve, 500)); 
    return { statusCode: 401, body: "Niet geautoriseerd" };
  }

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