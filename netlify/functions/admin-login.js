import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';

export const handler = async (event) => {
  // FIX 1: Sta browser pre-checks toe (voorkomt "Method Not Allowed")
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      },
      body: ""
    };
  }

  // Alleen POST toestaan voor de echte login
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const body = JSON.parse(event.body);
    // FIX 2: Haal per ongelukke spaties weg (trim)
    const username = String(body.username).trim();
    const password = String(body.password).trim();

    const sql = neon(process.env.NETLIFY_DATABASE_URL);
    
    // Zoek gebruiker
    const users = await sql`SELECT * FROM users WHERE username = ${username}`;
    const user = users[0];

    if (!user) {
      return { statusCode: 401, body: JSON.stringify({ message: "Gebruiker niet gevonden" }) };
    }

    // Check wachtwoord
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return { statusCode: 401, body: JSON.stringify({ message: "Wachtwoord onjuist" }) };
    }

    // Maak sessie
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '8h' });

    const myCookie = serialize('auth_token', token, {
      secure: true,
      httpOnly: true,
      path: '/',
      sameSite: 'Strict',
      maxAge: 8 * 60 * 60
    });

    return {
      statusCode: 200,
      headers: {
        'Set-Cookie': myCookie,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: "Ingelogd" })
    };

  } catch (error) {
    console.error("Login Fout:", error);
    return { statusCode: 500, body: "Server Fout" };
  }
};