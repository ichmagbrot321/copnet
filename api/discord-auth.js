// /api/discord-auth.js
// Vercel Serverless Function – Discord OAuth + Guild Roles

const DISCORD_CLIENT_ID = '1443410909098807337'
const DEFAULT_REDIRECT = 'https://copnet-rho.vercel.app'
const DEFAULT_GUILD = '1421878116271251558'

export default async function handler(req, res) {

  // CORS
  res.setHeader('Access-Control-Allow-Origin', 'https://copnet-rho.vercel.app')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { code, redirect_uri } = req.body || {}

  if (!code) {
    return res.status(400).json({ error: 'OAuth code fehlt' })
  }

  const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET
  const GUILD_ID = process.env.GUILD_ID || DEFAULT_GUILD
  const REDIRECT = redirect_uri || process.env.DISCORD_REDIRECT_URI || DEFAULT_REDIRECT

  if (!CLIENT_SECRET) {
    return res.status(500).json({
      error: 'DISCORD_CLIENT_SECRET fehlt in Vercel Environment Variables'
    })
  }

  try {

    // 1️⃣ Token Exchange
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT
      })
    })

    if (!tokenRes.ok) {
      const text = await tokenRes.text()
      return res.status(400).json({
        error: 'Token exchange fehlgeschlagen',
        details: text
      })
    }

    const tokenData = await tokenRes.json()

    if (!tokenData.access_token) {
      return res.status(400).json({
        error: 'Kein Access Token erhalten',
        raw: tokenData
      })
    }

    const accessToken = tokenData.access_token

    // 2️⃣ User Daten holen
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    })

    if (!userRes.ok) {
      return res.status(400).json({
        error: 'Discord User Anfrage fehlgeschlagen'
      })
    }

    const user = await userRes.json()

    // 3️⃣ Guild Member Daten (Rollen)
    let roles = []
    let displayName = user.global_name || user.username

    try {

      const memberRes = await fetch(
        `https://discord.com/api/users/@me/guilds/${GUILD_ID}/member`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      )

      if (memberRes.ok) {
        const member = await memberRes.json()

        roles = member.roles || []

        if (member.nick) {
          displayName = member.nick
        }
      }

    } catch (err) {
      console.warn("Guild Member konnte nicht geladen werden:", err.message)
    }

    // 4️⃣ Avatar URL bauen
    let avatar = null
    if (user.avatar) {
      avatar = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
    }

    // 5️⃣ Response
    return res.status(200).json({

      discord_id: user.id,

      username: displayName,
      global_name: user.global_name,
      discriminator: user.discriminator,

      avatar,

      email: user.email,

      roles

    })

  } catch (err) {

    console.error("Discord Auth Fehler:", err)

    return res.status(500).json({
      error: 'Internal Server Error',
      details: err.message
    })

  }
}
