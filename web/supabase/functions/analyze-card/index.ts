// analyze-card — Supabase Edge Function proxying Groq for the "AI advisor"
// note shown under a best-match card. Holds GROQ_API_KEY server-side (never
// shipped to browsers) and writes a short, personalized reason the card fits
// the user's wallet — grounded in the deterministic bullets the app already
// computed, so it stays accurate and just adds natural-language + perk insight.
//
// Deploy (one time, from the cardscope directory):
//   npx supabase functions deploy analyze-card --no-verify-jwt
//   npx supabase secrets set GROQ_API_KEY=gsk_...
// Then set in cardscope/.env (and Vercel env):
//   VITE_ADVISOR_URL=https://<project-ref>.supabase.co/functions/v1/analyze-card
//
// Cost: one Groq call per best-match reveal, cached client-side per
// (card + profile). llama-3.1-8b-instant at ~250 tokens — well inside Groq's
// free tier and Supabase's 500k invocations/month.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, authorization, x-client-info, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'content-type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  let card: Record<string, unknown>, profile: Record<string, unknown>;
  try {
    const body = await req.json();
    card = body.card ?? {};
    profile = body.profile ?? {};
  } catch {
    return json({ error: 'invalid JSON' }, 400);
  }

  const groqKey = Deno.env.get('GROQ_API_KEY');
  if (!groqKey) return json({ note: null, error: 'GROQ_API_KEY not configured' }, 500);

  const owned = Array.isArray(profile.ownedCardNames) && profile.ownedCardNames.length
    ? (profile.ownedCardNames as string[]).join(', ')
    : 'no cards yet';
  const spend = profile.spend && typeof profile.spend === 'object'
    ? Object.entries(profile.spend as Record<string, number>)
        .filter(([, v]) => Number(v) > 0).map(([k, v]) => `${k} $${v}/mo`).join(', ')
    : 'unknown';
  const bullets = Array.isArray(profile.whyBullets) ? (profile.whyBullets as string[]).join(' ') : '';

  const prompt =
    `You are a concise, friendly credit-card advisor. Write a short note for a user viewing a recommended card.\n\n` +
    `USER\n` +
    `- Current cards: ${owned}\n` +
    `- Monthly spend: ${spend}\n` +
    `- Reward preference: ${profile.rewardPref ?? 'no preference'}; max annual fee $${profile.maxFee ?? 'n/a'}; credit ${profile.credit ?? 'unknown'}\n\n` +
    `RECOMMENDED CARD\n` +
    `- ${card.name} by ${card.issuer}; annual fee ${card.annualFee}\n` +
    `- Rewards: ${card.rewards}\n` +
    `- Top perk: ${card.topPerk}\n` +
    `- Sign-up bonus: ${card.bonus}\n` +
    `- Tags: ${Array.isArray(card.tags) ? (card.tags as string[]).join(', ') : ''}\n\n` +
    `FACTS ALREADY SHOWN (do not repeat or contradict these): ${bullets}\n\n` +
    `Write EXACTLY 2 sentences (max ~45 words total) explaining why this is a smart addition for THIS user. ` +
    `Highlight one concrete complement — a spending category it boosts for them, or a perk they likely lack ` +
    `(e.g. lounge access, travel protections, transferable points). Be specific and warm. ` +
    `No markdown, no bullet points, no preamble, no restating the card name.`;

  let resp: Response;
  try {
    resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        temperature: 0.4,
        max_tokens: 140,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
  } catch (e) {
    return json({ note: null, error: `groq fetch failed: ${e}` }, 502);
  }

  if (!resp.ok) return json({ note: null, error: `groq ${resp.status}` }, 502);

  const data = await resp.json();
  const note = String(data.choices?.[0]?.message?.content ?? '').trim().replace(/^["']|["']$/g, '');
  return json({ note: note || null });
});
