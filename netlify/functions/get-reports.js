import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';

// LMRA Pro v8.0 - Admin Backend
export const handler = async (event, context) => {
  const secretInput = event.headers['x-admin-secret'] || "";
  const realSecret = process.env.ADMIN_PASSWORD;

  if (!realSecret) {
    console.error("CRITICAL: ADMIN_PASSWORD ontbreekt.");
    return { statusCode: 500, body: "Config Fout" };
  }

  const bufferInput = Buffer.from(secretInput + "");
  const bufferReal = Buffer.from(realSecret + "");
  
  let match = false;
  if (bufferInput.length === bufferReal.length) {
      match = crypto.timingSafeEqual(bufferInput, bufferReal);
  }

  if (!match) {
    await new Promise(resolve => setTimeout(resolve, 200)); 
    return { statusCode: 401, body: "Niet geautoriseerd" };
  }

  try {
    const sql = neon(process.env.NETLIFY_DATABASE_URL);
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