// api/discord-auth.js
const SUPABASE_URL = 'https://vekozqxmawzatvyofsxq.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const CLIENT_ID     = '1458870244365041849';
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const GUILD_ID      = '1421878116271251558';
const REDIRECT_URI  = 'https://copnet-rho.vercel.app/';

function getIP(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}
async function sbGet(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  });
  return r.json();
}
async function sbPost(path, body) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(body)
  });
}
async function sbPatch(path, body) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

async function checkBan(discord_id, ip) {
  if (discord_id) {
    const rows = await sbGet(`bans?discord_id=eq.${discord_id}&active=eq.true&select=*&limit=1`);
    if (Array.isArray(rows) && rows.length > 0) {
      const b = rows[0];
      if (b.expires_at && new Date(b.expires_at) < new Date()) {
        await sbPatch(`bans?id=eq.${b.id}`, { active: false });
      } else {
        return b;
      }
    }
  }
  if (ip && ip !== 'unknown') {
    const rows = await sbGet(`bans?ip=eq.${encodeURIComponent(ip)}&active=eq.true&select=*&limit=1`);
    if (Array.isArray(rows) && rows.length > 0) {
      const b = rows[0];
      if (b.expires_at && new Date(b.expires_at) < new Date()) {
        await sbPatch(`bans?id=eq.${b.id}`, { active: false });
      } else {
        return b;
      }
    }
  }
  return null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { code } = req.body || {};
  if (!code) return res.status(400).json({ error: 'code required' });
  if (!CLIENT_SECRET) return res.status(500).json({ error: 'DISCORD_CLIENT_SECRET not set' });
  if (!SUPABASE_KEY) return res.status(500).json({ error: 'SUPABASE_SERVICE_KEY not set' });

  const ip = getIP(req);

  // IP-Ban BEFORE Discord exchange – blocks anyone hitting the page
  const earlyBan = await checkBan(null, ip);
  if (earlyBan) {
    return res.status(403).json({
      error: 'banned',
      reason: earlyBan.reason || 'Kein Grund angegeben',
      banned_by: earlyBan.banned_by || '–',
      banned_at: earlyBan.banned_at,
      expires_at: earlyBan.expires_at || null,
      ban_type: 'ip',
    });
  }

  try {
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
        grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return res.status(400).json({ error: 'Token exchange failed', detail: tokenData });
    }

    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const user = await userRes.json();
    if (!user.id) return res.status(400).json({ error: 'Could not fetch user', detail: user });

    // Account + IP ban check
    const ban = await checkBan(user.id, ip);
    if (ban) {
      await sbPost('ban_logs', { discord_id: user.id, username: user.username, ip, action: 'blocked_login' }).catch(() => {});
      return res.status(403).json({
        error: 'banned',
        reason: ban.reason || 'Kein Grund angegeben',
        banned_by: ban.banned_by || '–',
        banned_at: ban.banned_at,
        expires_at: ban.expires_at || null,
        ban_type: ban.discord_id ? 'account' : 'ip',
      });
    }

    // Must be in guild – use Bot Token so no extra OAuth scope needed
    const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
    let roles = [], displayName = user.username;
    const memberRes = await fetch(
      `https://discord.com/api/guilds/${GUILD_ID}/members/${user.id}`,
      { headers: { Authorization: `Bot ${BOT_TOKEN}` } }
    );
    if (!memberRes.ok) {
      return res.status(403).json({ error: 'not_in_guild', message: 'Du bist kein Mitglied des Karlsruhe RP Servers!' });
    }
    const m = await memberRes.json();
    roles = m.roles || [];
    if (m.nick) displayName = m.nick;

    // Save visit log (ip stored here → can ban later by IP even without account)
    await sbPost('visit_logs', { discord_id: user.id, username: displayName, ip, action: 'login_success' }).catch(() => {});

    return res.status(200).json({
      discord_id: user.id, username: displayName || user.username,
      avatar: user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : null,
      email: user.email || null, roles, ip,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
}
