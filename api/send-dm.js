// api/send-dm.js — Vercel Serverless Function
// Schreibt in Supabase bot_queue → Bot pollt und sendet DM
// Kein direkter Bot-Server nötig (funktioniert mit Infynix)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { discord_id, type, data } = req.body || {};
  if (!discord_id || !type) return res.status(400).json({ error: 'discord_id and type required' });

  const SUPABASE_URL        = process.env.SUPABASE_URL         || 'https://vekozqxmawzatvyofsxq.supabase.co';
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

  if (!SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_KEY not configured' });
  }

  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/bot_queue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        discord_id: discord_id.toString(),
        type,
        data: data || {},
        processed: false,
      }),
    });

    if (!r.ok) {
      const err = await r.text();
      console.error('Supabase queue insert failed:', err);
      return res.status(500).json({ error: 'Queue insert failed', detail: err });
    }

    const result = await r.json();
    return res.status(200).json({ ok: true, queued: true, id: result?.[0]?.id });

  } catch (e) {
    console.error('send-dm error:', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
