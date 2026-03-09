// api/discord-auth.js
// Vercel Serverless Function – Token Exchange für Discord OAuth
// Speichern unter: /api/discord-auth.js in deinem Vercel Projekt
//
// SETUP:
// 1. Diese Datei in /api/discord-auth.js in deinem Repo speichern
// 2. In Vercel Dashboard → Settings → Environment Variables:
//    DISCORD_CLIENT_SECRET = <dein Discord Client Secret>
// 3. Pushen → fertig

const DISCORD_CLIENT_ID    = '1443410909098807337';
const DISCORD_REDIRECT_URI = 'https://copnet-rho.vercel.app';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', 'https://copnet-rho.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Kein Code übergeben' });
  }

  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  if (!clientSecret) {
    return res.status(500).json({ error: 'DISCORD_CLIENT_SECRET fehlt in Vercel Environment Variables' });
  }

  try {
    // Token Exchange bei Discord
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     DISCORD_CLIENT_ID,
        client_secret: clientSecret,
        grant_type:    'authorization_code',
        code:          code,
        redirect_uri:  DISCORD_REDIRECT_URI,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      return res.status(400).json({ error: 'Token Exchange fehlgeschlagen', details: err });
    }

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return res.status(400).json({ error: 'Kein Access Token erhalten', raw: tokenData });
    }

    // Nutzerdaten von Discord holen
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userRes.ok) {
      return res.status(400).json({ error: 'Nutzerinfo fehlgeschlagen' });
    }

    const user = await userRes.json();

    return res.status(200).json({
      id:          user.id,
      username:    user.username,
      global_name: user.global_name,
      avatar:      user.avatar,
      email:       user.email,
    });

  } catch (err) {
    return res.status(500).json({ error: 'Interner Fehler', details: err.message });
  }
}
