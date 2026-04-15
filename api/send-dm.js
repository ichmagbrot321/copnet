// api/send-dm.js – Vercel Serverless Function
// Empfängt POST von CopNet und schickt Discord-DMs via Bot-Token

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_API = 'https://discord.com/api/v10';

// Hilfsfunktion: Discord DM Channel erstellen oder holen
async function getDMChannel(discord_id) {
  const res = await fetch(`${DISCORD_API}/users/@me/channels`, {
    method: 'POST',
    headers: {
      'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ recipient_id: discord_id }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DM Channel Error: ${res.status} – ${err}`);
  }
  return res.json();
}

// Hilfsfunktion: Nachricht in Channel senden
async function sendMessage(channel_id, payload) {
  const res = await fetch(`${DISCORD_API}/channels/${channel_id}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Send Message Error: ${res.status} – ${err}`);
  }
  return res.json();
}

// ═══ DM TEMPLATES ════════════════════════════════════════════════
function buildEmbed(type, data) {
  const COLORS = {
    ok:   0x10b981,
    warn: 0xf59e0b,
    err:  0xf43f5e,
    blue: 0x0ea5e9,
    pur:  0x8b5cf6,
  };

  switch (type) {

    // ── WILLKOMMEN ───────────────────────────────────────────────
    case 'willkommen':
      return {
        embeds: [{
          title: '🎉 Willkommen bei CopNet Karlsruhe!',
          description: `Hey **${data.name}**!\n\nDein Bürger-Konto wurde erfolgreich erstellt.\n\n**Was jetzt?**\n→ Melde ein Fahrzeug an\n→ Beantrage deinen Führerschein\n→ Teile deine Akte mit einem Link`,
          color: COLORS.ok,
          fields: data.shareId ? [{ name: '🔗 Dein Akten-Link', value: `https://copnet-rho.vercel.app/?share=akte&id=${data.shareId}`, inline: false }] : [],
          footer: { text: 'CopNet Karlsruhe · Bürgerportal' },
          timestamp: new Date().toISOString(),
        }]
      };

    // ── STRAFANZEIGE ─────────────────────────────────────────────
    case 'strafanzeige':
      return {
        embeds: [{
          title: '📋 Neue Strafanzeige gegen dich',
          description: `Eine Strafanzeige wurde gegen dich gestellt.`,
          color: COLORS.err,
          fields: [
            { name: '👤 Beschuldigter', value: data.name || '–', inline: true },
            { name: '⚖️ Tatvorwurf', value: data.tatvorwurf || '–', inline: true },
            { name: '🔴 Schweregrad', value: data.schwere || '–', inline: true },
            { name: '👮 Beamter', value: data.beamter || '–', inline: true },
          ],
          footer: { text: 'CopNet Karlsruhe · Du kannst die Details unter copnet-rho.vercel.app einsehen.' },
          timestamp: new Date().toISOString(),
        }]
      };

    // ── AKTENEINTRAG ─────────────────────────────────────────────
    case 'akteneintrag':
      return {
        embeds: [{
          title: '📁 Neuer Akteneintrag',
          description: `Ein neuer Eintrag wurde zu deiner Akte hinzugefügt.`,
          color: COLORS.warn,
          fields: [
            { name: '📋 Typ', value: data.typ || '–', inline: true },
            { name: '⚖️ Betreff', value: data.tatvorwurf || '–', inline: true },
            { name: '👮 Beamter', value: data.beamter || '–', inline: true },
          ],
          footer: { text: 'CopNet Karlsruhe' },
          timestamp: new Date().toISOString(),
        }]
      };

    // ── ANZEIGE STATUS ───────────────────────────────────────────
    case 'anzeige_status':
      return {
        embeds: [{
          title: `✅ Strafanzeige ${data.status}`,
          description: `Die Strafanzeige gegen dich wurde auf **${data.status}** gesetzt.`,
          color: data.status === 'Abgeschlossen' ? COLORS.ok : COLORS.blue,
          fields: [
            { name: '⚖️ Tatvorwurf', value: data.tatvorwurf || '–', inline: true },
            { name: '👮 Beamter', value: data.beamter || '–', inline: true },
          ],
          footer: { text: 'CopNet Karlsruhe' },
          timestamp: new Date().toISOString(),
        }]
      };

    // ── BÜRGER STATUS ────────────────────────────────────────────
    case 'buerger_status':
      return {
        embeds: [{
          title: `⚠️ Bürger-Status geändert: ${data.status}`,
          description: `Dein Konto-Status wurde auf **${data.status}** gesetzt.`,
          color: data.status === 'Aktiv' ? COLORS.ok : COLORS.err,
          fields: [
            { name: '👮 Beamter', value: data.beamter || '–', inline: true },
          ],
          footer: { text: 'CopNet Karlsruhe' },
          timestamp: new Date().toISOString(),
        }]
      };

    // ── FAHRZEUG BESCHLAGNAHMT ───────────────────────────────────
    case 'fahrzeug_beschlagnahmt':
      return {
        embeds: [{
          title: '🔒 Fahrzeug beschlagnahmt!',
          description: `Dein Fahrzeug **${data.plate}** wurde von der Polizei beschlagnahmt.`,
          color: COLORS.err,
          fields: [
            { name: '🚗 Kennzeichen', value: data.plate || '–', inline: true },
            { name: '📋 Grund', value: data.grund || '–', inline: true },
            { name: '👮 Beamter', value: data.beamter || '–', inline: true },
          ],
          footer: { text: 'CopNet Karlsruhe · Wende dich an die zuständige Dienststelle.' },
          timestamp: new Date().toISOString(),
        }]
      };

    // ── FAHRZEUG FREIGEGEBEN ─────────────────────────────────────
    case 'fahrzeug_freigegeben':
      return {
        embeds: [{
          title: '✅ Fahrzeug freigegeben!',
          description: `Dein Fahrzeug **${data.plate}** wurde von der Polizei freigegeben.`,
          color: COLORS.ok,
          fields: [
            { name: '🚗 Kennzeichen', value: data.plate || '–', inline: true },
            { name: '👮 Beamter', value: data.beamter || '–', inline: true },
          ],
          footer: { text: 'CopNet Karlsruhe' },
          timestamp: new Date().toISOString(),
        }]
      };

    // ── FAHRZEUG GESTOHLEN ───────────────────────────────────────
    case 'fahrzeug_gestohlen':
      return {
        embeds: [{
          title: '🚨 Fahrzeug als gestohlen gemeldet!',
          description: `Dein Fahrzeug **${data.plate}** wurde als gestohlen gemeldet.`,
          color: COLORS.err,
          fields: [
            { name: '🚗 Kennzeichen', value: data.plate || '–', inline: true },
            { name: '👮 Gemeldet von', value: data.beamter || '–', inline: true },
          ],
          footer: { text: 'CopNet Karlsruhe · Falls du dein Fahrzeug noch besitzt, melde dich bei der Polizei.' },
          timestamp: new Date().toISOString(),
        }]
      };

    // ── FAHRZEUG GEFUNDEN ────────────────────────────────────────
    case 'fahrzeug_gefunden':
      return {
        embeds: [{
          title: '✅ Fahrzeug als gefunden markiert!',
          description: `Dein Fahrzeug **${data.plate}** wurde als gefunden markiert und der Status auf OK gesetzt.`,
          color: COLORS.ok,
          fields: [
            { name: '🚗 Kennzeichen', value: data.plate || '–', inline: true },
            { name: '👮 Beamter', value: data.beamter || '–', inline: true },
          ],
          footer: { text: 'CopNet Karlsruhe' },
          timestamp: new Date().toISOString(),
        }]
      };

    // ── FÜHRERSCHEIN AKTION ──────────────────────────────────────
    case 'fs_aktion': {
      const aktionMap = {
        abnehmen:     { title: '⚠️ Führerschein abgenommen!',    color: COLORS.warn, desc: 'Dein Führerschein wurde vorübergehend von der Polizei abgenommen.' },
        sperren:      { title: '🔒 Führerschein gesperrt!',       color: COLORS.err,  desc: 'Dein Führerschein wurde gesperrt.' },
        entziehen:    { title: '❌ Führerschein entzogen!',        color: COLORS.err,  desc: 'Dein Führerschein wurde permanent entzogen.' },
        erteilen:     { title: '✅ Führerschein wiedererteilt!',   color: COLORS.ok,   desc: 'Dein Führerschein wurde wiedererteilt und ist wieder gültig.' },
        punkte_add:   { title: '⚠️ Punkte hinzugefügt!',          color: COLORS.warn, desc: `${data.punkte || 1} Punkt(e) wurden deinem Führerschein-Konto hinzugefügt.` },
        punkte_reset: { title: '🔄 Punkte zurückgesetzt!',         color: COLORS.ok,   desc: 'Deine Führerschein-Punkte wurden auf 0 zurückgesetzt.' },
      };
      const info = aktionMap[data.aktion] || { title: '🪪 Führerschein-Aktion', color: COLORS.blue, desc: data.aktion };
      return {
        embeds: [{
          title: info.title,
          description: info.desc,
          color: info.color,
          fields: [
            ...(data.grund ? [{ name: '📋 Grund', value: data.grund, inline: false }] : []),
            ...(data.punkte_gesamt !== undefined ? [{ name: '📊 Punkte gesamt', value: `${data.punkte_gesamt}/8`, inline: true }] : []),
            { name: '👮 Beamter', value: data.von || '–', inline: true },
          ],
          footer: { text: 'CopNet Karlsruhe · Bei Fragen wende dich an die Polizei.' },
          timestamp: new Date().toISOString(),
        }]
      };
    }

    // ── PERSONALAKTE EINTRAG (Beamter) ───────────────────────────
    case 'personalakte_eintrag':
      return {
        embeds: [{
          title: `📂 Personalakten-Eintrag: ${data.typ || '–'}`,
          description: `Ein neuer Eintrag wurde zu deiner Personalakte hinzugefügt.`,
          color: data.typ === 'Beförderung' || data.typ === 'Lob' ? COLORS.ok : data.typ === 'Verwarnung' || data.typ === 'Abmahnung' ? COLORS.warn : COLORS.blue,
          fields: [
            { name: '📋 Betreff', value: data.betreff || '–', inline: false },
            ...(data.details ? [{ name: '📝 Details', value: data.details.substring(0, 300), inline: false }] : []),
            ...(data.neuerRang ? [{ name: '⬆️ Neuer Rang', value: data.neuerRang, inline: true }] : []),
            { name: '👮 Von', value: data.von || '–', inline: true },
          ],
          footer: { text: 'CopNet Karlsruhe · Personalverwaltung' },
          timestamp: new Date().toISOString(),
        }]
      };

    // ── EINSTELLUNG (neuer Beamter) ──────────────────────────────
    case 'einstellung':
      return {
        embeds: [{
          title: '🎖️ Willkommen bei der Polizei Karlsruhe!',
          description: `Du wurdest als Beamter im CopNet angelegt.\n\nDu kannst dich jetzt unter **copnet-rho.vercel.app** anmelden.`,
          color: COLORS.blue,
          fields: [
            { name: '👤 Name', value: data.name || '–', inline: true },
            { name: '🪪 Dienst-Nr.', value: data.dienst || '–', inline: true },
            { name: '🎖️ Rang', value: data.rang || '–', inline: true },
            { name: '👮 Eingestellt von', value: data.von || '–', inline: true },
          ],
          footer: { text: 'CopNet Karlsruhe · Polizei' },
          timestamp: new Date().toISOString(),
        }]
      };

    // ── KÜNDIGUNG ─────────────────────────────────────────────────
    case 'kuendigung':
      return {
        embeds: [{
          title: '❌ Kündigung / Account gelöscht',
          description: `Dein Beamten-Account wurde entfernt.`,
          color: COLORS.err,
          fields: [
            { name: '📋 Grund', value: data.grund || '–', inline: false },
            { name: '👮 Von', value: data.von || '–', inline: true },
          ],
          footer: { text: 'CopNet Karlsruhe' },
          timestamp: new Date().toISOString(),
        }]
      };

    // ── MOD AKTION ────────────────────────────────────────────────
    case 'mod_aktion': {
      const modMap = {
        verwarnung:     { title: '⚠️ Verwarnung',          color: COLORS.warn },
        suspendierung:  { title: '🔒 Suspendierung',        color: COLORS.err  },
        kuendigung:     { title: '❌ Kündigung',             color: COLORS.err  },
        befoerderung:   { title: '⬆️ Beförderung',          color: COLORS.ok   },
        entsperrung:    { title: '✅ Entsperrung / Aktiv',   color: COLORS.ok   },
      };
      const mod = modMap[data.aktion] || { title: '📋 Moderation', color: COLORS.blue };
      return {
        embeds: [{
          title: mod.title,
          description: data.grund || '–',
          color: mod.color,
          fields: [
            { name: '👮 Von', value: data.von || '–', inline: true },
          ],
          footer: { text: 'CopNet Karlsruhe · Personalverwaltung' },
          timestamp: new Date().toISOString(),
        }]
      };
    }

    // ── FALLBACK ─────────────────────────────────────────────────
    default:
      return {
        embeds: [{
          title: '📨 Nachricht von CopNet',
          description: `Typ: \`${type}\`\n\`\`\`json\n${JSON.stringify(data, null, 2).substring(0, 800)}\`\`\``,
          color: 0x0ea5e9,
          footer: { text: 'CopNet Karlsruhe' },
          timestamp: new Date().toISOString(),
        }]
      };
  }
}

// ═══ MAIN HANDLER ════════════════════════════════════════════════
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!DISCORD_BOT_TOKEN) {
    console.error('DISCORD_BOT_TOKEN not set!');
    return res.status(500).json({ error: 'Bot token not configured' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Invalid JSON' }); }
  }

  const { discord_id, type, data } = body || {};

  if (!discord_id || !type) {
    return res.status(400).json({ error: 'discord_id and type required' });
  }

  try {
    // 1. DM Channel öffnen
    const channel = await getDMChannel(discord_id.toString());

    // 2. Embed bauen
    const payload = buildEmbed(type, data || {});

    // 3. Senden
    await sendMessage(channel.id, payload);

    console.log(`✅ DM sent to ${discord_id} | type: ${type}`);
    return res.status(200).json({ ok: true, type, discord_id });

  } catch (err) {
    console.error(`❌ DM failed for ${discord_id} | type: ${type} | ${err.message}`);
    // Nicht 500 zurückgeben – CopNet soll trotzdem weiterlaufen
    return res.status(200).json({ ok: false, error: err.message, queued: false });
  }
}
