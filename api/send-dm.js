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
      // ── BESTEHENDE TYPEN ──────────────────────────────────────
      case 'welcome':
      case 'willkommen':
        embed.title = '👤 Willkommen im Karlsruhe RP';
        embed.description = `Hallo **${data.name}**, dein Charakter-Profil wurde erfolgreich erstellt!\n\nDeine Akte ist nun im CopNet verfügbar.`;
        embed.color = 0x22c55e;
        break;

      case 'provisioning':
        embed.title = '🔐 Deine Dienst-Zugangsdaten';
        embed.description = `Willkommen bei der **${data.dept}**!\n\n**Dienst-Nr:** \`${data.dNr}\`\n**Passwort:** \`${data.password}\``;
        embed.color = 0xf59e0b;
        break;

      case 'strafanzeige':
        embed.title = '📋 Neue Strafanzeige gegen dich';
        embed.description = `Gegen dich wurde eine Strafanzeige erstellt.`;
        embed.color = 0xef4444;
        embed.fields = [
          { name: 'Tatvorwurf', value: data.tatvorwurf || '–' },
          { name: 'Schweregrad', value: data.schwere || '–', inline: true },
          { name: 'Beamter', value: data.beamter || '–', inline: true },
        ];
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

      // ── COPNET: AKTENEINTRAG ──────────────────────────────────
      case 'akteneintrag':
        embed.title = '📁 Neuer Akteneintrag';
        embed.description = `In deiner Akte wurde ein neuer Eintrag hinterlegt.`;
        embed.color = 0xf59e0b;
        embed.fields = [
          { name: 'Typ', value: data.typ || '–', inline: true },
          { name: 'Beamter', value: data.beamter || '–', inline: true },
          { name: 'Tatvorwurf / Betreff', value: data.tatvorwurf || '–' },
        ];
        break;

      // ── COPNET: ANZEIGE STATUS ────────────────────────────────
      case 'anzeige_status':
        embed.title = '📋 Strafanzeige aktualisiert';
        embed.description = `Der Status deiner Strafanzeige hat sich geändert.`;
        embed.color = data.status === 'Abgeschlossen' ? 0x22c55e : 0xf59e0b;
        embed.fields = [
          { name: 'Tatvorwurf', value: data.tatvorwurf || '–' },
          { name: 'Neuer Status', value: data.status || '–', inline: true },
          { name: 'Beamter', value: data.beamter || '–', inline: true },
        ];
        break;

      // ── COPNET: BÜRGER STATUS ─────────────────────────────────
      case 'buerger_status':
        embed.title = data.status === 'Gesperrt' ? '🔒 Konto gesperrt' : '✅ Konto entsperrt';
        embed.description = `Dein Bürger-Account wurde ${data.status === 'Gesperrt' ? 'gesperrt' : 'wieder aktiviert'}.`;
        embed.color = data.status === 'Gesperrt' ? 0xef4444 : 0x22c55e;
        embed.fields = [
          { name: 'Name', value: data.name || '–', inline: true },
          { name: 'Status', value: data.status || '–', inline: true },
          { name: 'Beamter', value: data.beamter || '–', inline: true },
        ];
        break;

      // ── COPNET: FÜHRERSCHEIN AKTION ───────────────────────────
      case 'fs_aktion': {
        const fsColors = {
          abnehmen: 0xf59e0b,
          sperren: 0xef4444,
          entziehen: 0xef4444,
          erteilen: 0x22c55e,
          punkte_add: 0xf97316,
          punkte_reset: 0x3b82f6,
        };
        const fsTitles = {
          abnehmen: '⚠️ Führerschein abgenommen',
          sperren: '🔒 Führerschein gesperrt',
          entziehen: '❌ Führerschein entzogen',
          erteilen: '✅ Führerschein wiedererteilt',
          punkte_add: '⚠️ Punkte eingetragen',
          punkte_reset: '🔄 Punkte zurückgesetzt',
        };
        embed.title = fsTitles[data.aktion] || '🪪 Führerschein-Aktion';
        embed.color = fsColors[data.aktion] || 0x5865F2;
        embed.fields = [{ name: 'Beamter', value: data.von || '–', inline: true }];
        if (data.grund) embed.fields.push({ name: 'Grund', value: data.grund });
        if (data.punkte !== undefined) embed.fields.push({ name: 'Punkte', value: `+${data.punkte} (gesamt: ${data.punkte_gesamt}/8)`, inline: true });
        break;
      }

      // ── COPNET: FAHRZEUG BESCHLAGNAHMT ────────────────────────
      case 'fahrzeug_beschlagnahmt':
        embed.title = '🔒 Fahrzeug beschlagnahmt';
        embed.description = `Dein Fahrzeug wurde beschlagnahmt.`;
        embed.color = 0xf97316;
        embed.fields = [
          { name: 'Kennzeichen', value: data.plate || '–', inline: true },
          { name: 'Beamter', value: data.beamter || '–', inline: true },
          { name: 'Grund', value: data.grund || '–' },
        ];
        break;

      // ── COPNET: FAHRZEUG FREIGEGEBEN ──────────────────────────
      case 'fahrzeug_freigegeben':
        embed.title = '✅ Fahrzeug freigegeben';
        embed.description = `Dein Fahrzeug wurde freigegeben.`;
        embed.color = 0x22c55e;
        embed.fields = [
          { name: 'Kennzeichen', value: data.plate || '–', inline: true },
          { name: 'Beamter', value: data.beamter || '–', inline: true },
        ];
        break;

      // ── COPNET: EINSTELLUNG (neuer Beamter) ───────────────────
      case 'einstellung':
        embed.title = '🎖️ Willkommen bei der Polizei Karlsruhe';
        embed.description = `Du wurdest eingestellt. Hier sind deine Zugangsdaten für das CopNet.`;
        embed.color = 0x0ea5e9;
        embed.fields = [
          { name: 'Name', value: data.name || '–', inline: true },
          { name: 'Dienst-Nr', value: data.dienst || '–', inline: true },
          { name: 'Rang', value: data.rang || '–', inline: true },
          { name: 'Eingestellt von', value: data.von || '–', inline: true },
        ];
        break;

      // ── COPNET: KÜNDIGUNG ─────────────────────────────────────
      case 'kuendigung':
        embed.title = '❌ Dienstverhältnis beendet';
        embed.description = `Dein Dienstverhältnis wurde beendet.`;
        embed.color = 0xef4444;
        embed.fields = [
          { name: 'Name', value: data.name || '–', inline: true },
          { name: 'Grund', value: data.grund || '–' },
          { name: 'Von', value: data.von || '–', inline: true },
        ];
        break;

      // ── COPNET: MODERATION (DM an Beamte) ────────────────────
      case 'mod_aktion': {
        const modColors = { suspendierung: 0xf97316, entsperrung: 0x22c55e, kuendigung: 0xef4444, verwarnung: 0xf59e0b };
        const modTitles = { suspendierung: '🔒 Suspendierung', entsperrung: '✅ Entsperrung', kuendigung: '❌ Kündigung', verwarnung: '⚠️ Verwarnung' };
        embed.title = modTitles[data.aktion] || '⚠️ Moderationsaktion';
        embed.color = modColors[data.aktion] || 0x5865F2;
        embed.fields = [
          { name: 'Aktion', value: data.aktion || '–', inline: true },
          { name: 'Von', value: data.von || '–', inline: true },
          { name: 'Grund', value: data.grund || '–' },
        ];
        break;
      }

      // ── COPNET: PERSONALAKTE EINTRAG ──────────────────────────
      case 'personalakte_eintrag':
        embed.title = '📂 Neuer Personalakten-Eintrag';
        embed.description = `In deiner Personalakte wurde ein neuer Eintrag hinterlegt.`;
        embed.color = 0x0ea5e9;
        embed.fields = [
          { name: 'Typ', value: data.typ || '–', inline: true },
          { name: 'Von', value: data.von || '–', inline: true },
          { name: 'Betreff', value: data.betreff || '–' },
        ];
        if (data.neuerRang) embed.fields.push({ name: '⬆️ Neuer Rang', value: data.neuerRang });
        if (data.details) embed.fields.push({ name: 'Details', value: data.details.substring(0, 200) });
        break;

      // ── RETTUNGSNET: PATIENT / BEHANDLUNG ────────────────────
      case 'behandlung':
        embed.title = '🏥 Behandlungsbericht';
        embed.description = `Ein Behandlungsbericht wurde in deiner Akte hinterlegt.`;
        embed.color = 0x3b82f6;
        embed.fields = [
          { name: 'Diagnose', value: data.diagnose || '–' },
          { name: 'Typ', value: data.typ || '–', inline: true },
          { name: 'Outcome', value: data.outcome || '–', inline: true },
          { name: 'Sanitäter', value: data.bearbeiter || '–', inline: true },
        ];
        break;

      // ── JUSTIZNETZ: VORLADUNG ─────────────────────────────────
      case 'vorladung':
        embed.title = '✉️ Gerichtliche Vorladung';
        embed.description = data.text_inhalt || 'Du wurdest vorgeladen.';
        embed.color = 0xf59e0b;
        embed.fields = [
          { name: 'Typ', value: data.typ || '–', inline: true },
        ];
        if (data.verfahren_az) embed.fields.push({ name: 'Aktenzeichen', value: data.verfahren_az, inline: true });
        break;

      // ── JUSTIZNETZ: URTEIL ────────────────────────────────────
      case 'urteil':
        embed.title = '🔨 Urteil verkündet';
        embed.description = `In deinem Verfahren wurde ein Urteil gesprochen.`;
        embed.color = data.urteil === 'Freispruch' ? 0x22c55e : 0xef4444;
        embed.fields = [
          { name: 'Aktenzeichen', value: data.az || '–', inline: true },
          { name: 'Entscheidung', value: data.urteil || '–', inline: true },
        ];
        if (data.strafmass) embed.fields.push({ name: 'Strafmaß', value: data.strafmass });
        if (data.begruendung) embed.fields.push({ name: 'Begründung', value: data.begruendung.substring(0, 300) });
        break;

      // ── FALLBACK ──────────────────────────────────────────────
      default:
        embed.title = 'CAD Benachrichtigung';
        embed.description = data.message || JSON.stringify(data);
        break;
    }

    // Footer bei allen Embeds
    embed.footer = { text: 'Karlsruhe RP · CopNet/RettungsNet/JustizNet' };

    await sendRequest(`${DISCORD_API}/channels/${channel.id}/messages`, 'POST', { embeds: [embed] });
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
