// api/discord-auth.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { code } = req.body || {};
  if (!code) return res.status(400).json({ error: 'code required' });

  const CLIENT_ID     = '1458870244365041849';
  const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || 'HMfl6irSfmiX_rMS001VN0cHwhJfksqo';
  const GUILD_ID      = process.env.GUILD_ID || '1421878116271251558';
  const REDIRECT_URI  = 'https://copnet-rho.vercel.app/';

  try {
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type:    'authorization_code',
        code,
        redirect_uri:  REDIRECT_URI,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      console.error('Token exchange failed:', JSON.stringify(tokenData));
      return res.status(400).json({ error: 'Token exchange failed', detail: tokenData });
    }

    const accessToken = tokenData.access_token;

    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const user = await userRes.json();
    if (!user.id) return res.status(400).json({ error: 'Could not fetch user', detail: user });

    let roles = [];
    let displayName = user.username;
    try {
      const memberRes = await fetch(
        `https://discord.com/api/users/@me/guilds/${GUILD_ID}/member`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (memberRes.ok) {
        const m = await memberRes.json();
        roles = m.roles || [];
        if (m.nick) displayName = m.nick;
      }
    } catch (e) {
      console.warn('Guild member fetch failed:', e.message);
    }

    return res.status(200).json({
      discord_id:    user.id,
      username:      displayName || user.username,
      avatar:        user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : null,
      email:         user.email || null,
      roles,
    });

  } catch (err) {
    console.error('Discord auth error:', err);
    return res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
}
