import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  try {
    const { username, password } = JSON.parse(event.body);
    const sql = neon(process.env.NETLIFY_DATABASE_URL);

    // 1. Zoek gebruiker
    const users = await sql`SELECT * FROM users WHERE username = ${username}`;
    const user = users[0];

    if (!user) {
      return { statusCode: 401, body: JSON.stringify({ message: "Ongeldige gegevens" }) };
    }

    // 2. Check wachtwoord hash (Veilig!)
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return { statusCode: 401, body: JSON.stringify({ message: "Ongeldige gegevens" }) };
    }

    // 3. Maak JWT Token (Sessie bewijs)
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET, // Zorg dat je deze toevoegt in Netlify Env Vars!
      { expiresIn: '8h' }
    );

    // 4. Stuur cookie terug (HttpOnly = niet te stelen via XSS)
    const myCookie = serialize('auth_token', token, {
      secure: true,
      httpOnly: true,
      path: '/',
      sameSite: 'Strict',
      maxAge: 8 * 60 * 60 // 8 uur
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