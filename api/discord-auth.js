// api/discord-auth.js — Vercel Serverless Function
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { code } = req.body || {};
  if (!code) return res.status(400).json({ error: 'code required' });

  // ── Diese drei Werte müssen in Vercel Environment Variables gesetzt sein ──
  const CLIENT_ID     = process.env.DISCORD_CLIENT_ID     || '1458870244365041849';
  const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
  const GUILD_ID      = process.env.GUILD_ID              || '1421878116271251558';

  // WICHTIG: Diese URI muss EXAKT mit der in Discord Developer Portal → OAuth2 → Redirects übereinstimmen
  // Kein trailing slash vergessen / hinzufügen je nachdem was dort steht
  const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'https://copnet-rho.vercel.app/';

  if (!CLIENT_SECRET) {
    console.error('DISCORD_CLIENT_SECRET nicht gesetzt!');
    return res.status(500).json({ error: 'Server misconfigured: CLIENT_SECRET missing' });
  }

  try {
    // 1. Code gegen Token tauschen
    const tokenBody = new URLSearchParams({
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type:    'authorization_code',
      code,
      redirect_uri:  REDIRECT_URI,   // muss exakt mit Authorization-URL übereinstimmen
    });

    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    tokenBody,
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      console.error('Token exchange failed:', JSON.stringify(tokenData));
      // Gibt den Discord-Fehler direkt zurück damit du ihn im Browser siehst
      return res.status(400).json({
        error:  'Token exchange failed',
        detail: tokenData,        // z.B. { error: 'invalid_grant', ... }
      });
    }

    const accessToken = tokenData.access_token;

    // 2. User-Info holen
    const userRes  = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const user = await userRes.json();

    if (!user.id) {
      return res.status(400).json({ error: 'Could not fetch user info', detail: user });
    }

    // 3. Guild-Member-Info holen (für Rollen + Nickname)
    let roles       = [];
    let displayName = user.username;

    try {
      const memberRes = await fetch(
        `https://discord.com/api/users/@me/guilds/${GUILD_ID}/member`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (memberRes.ok) {
        const memberData = await memberRes.json();
        roles       = memberData.roles || [];
        if (memberData.nick) displayName = memberData.nick;
      } else {
        // Kein Member des Servers → trotzdem weiter (Bürger-Login funktioniert auch so)
        console.warn('Guild member fetch failed:', memberRes.status);
      }
    } catch (e) {
      console.warn('Guild member fetch error:', e.message);
    }

    // 4. Alles zurückgeben
    return res.status(200).json({
      discord_id:     user.id,
      username:       displayName || user.username,
      discriminator:  user.discriminator,
      avatar:         user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
        : null,
      email:          user.email || null,
      roles,
    });

  } catch (err) {
    console.error('Discord auth error:', err);
    return res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
}
