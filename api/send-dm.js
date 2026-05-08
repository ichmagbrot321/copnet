// api/send-dm.js
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_API = 'https://discord.com/api/v10';

async function sendRequest(url, method, body) {
  const res = await fetch(url, {
    method,
    headers: { 'Authorization': `Bot ${DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

export default async function handler(req, res) {
  const { discord_id, type, data } = req.body;
  try {
    const channel = await sendRequest(`${DISCORD_API}/users/@me/channels`, 'POST', { recipient_id: discord_id });
    let embed = { title: 'CAD Benachrichtigung', color: 0x5865F2, timestamp: new Date().toISOString() };

    switch(type) {
      case 'welcome':
        embed.title = '👤 Willkommen im Karlsruhe RP';
        embed.description = `Hallo ${data.name}, dein Charakter-Profil wurde erfolgreich erstellt!`;
        embed.color = 0x22c55e;
        break;
      case 'provisioning':
        embed.title = '🔐 Deine Dienst-Zugangsdaten';
        embed.description = `Willkommen bei der **${data.dept}**!\n\n**Dienst-Nr:** \`${data.dNr}\`\n**Passwort:** \`${data.password}\``;
        embed.color = 0xf59e0b;
        break;
      case 'strafanzeige':
        embed.title = '📋 Neue Strafanzeige erhalten';
        embed.description = `Gegen dich wurde eine Strafanzeige erstellt.\n\n**Tatvorwurf:** ${data.tatvorwurf}\n**Beamter:** ${data.officer}`;
        embed.color = 0xef4444;
        break;
      case 'gericht':
        embed.title = '⚖️ Gerichtliche Vorladung';
        embed.description = `Du wurdest zu einem Verfahren geladen.\n\n**Aktenzeichen:** ${data.az}\n**Grund:** ${data.grund}`;
        embed.color = 0x8b5cf6;
        break;
      case 'medical':
        embed.title = '🏥 Medizinischer Bericht';
        embed.description = `Ein neuer Behandlungsbericht wurde in deiner Akte hinterlegt.\n\n**Diagnose:** ${data.diag}\n**Behandler:** ${data.medic}`;
        embed.color = 0x3b82f6;
        break;
      case 'admin_action':
        embed.title = '⚠️ Admin-Moderation';
        embed.description = `Dein Account wurde moderiert.\n\n**Aktion:** ${data.action}\n**Grund:** ${data.reason}`;
        embed.color = 0x000000;
        break;
    }

    await sendRequest(`${DISCORD_API}/channels/${channel.id}/messages`, 'POST', { embeds: [embed] });
    res.status(200).json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
}
