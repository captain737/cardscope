// parse-search — Supabase Edge Function proxying Groq for the AI search
// bar. Holds the GROQ_API_KEY server-side (never shipped to browsers) and
// turns a free-text card description into filter ids from the CardScope
// vocabulary.
//
// Deploy (one time, from the cardscope directory):
//   npx supabase functions deploy parse-search --no-verify-jwt
//   npx supabase secrets set GROQ_API_KEY=gsk_...
// Then set in cardscope/.env:
//   VITE_SEARCH_PARSER_URL=https://<project-ref>.supabase.co/functions/v1/parse-search
//
// Cost math at ~1k visits/day: the frontend is local-first (the synonym
// table answers most queries offline), so only ambiguous queries land
// here — typically a few hundred calls/day at ~200 tokens each, far
// inside Groq's free tier and Supabase's 500k invocations/month.

const FILTER_IDS = [
  'travel', 'dining', 'business', 'premium', 'low-apr', 'gas', 'flights',
  'cashback', 'groceries', 'no-fee', 'students', 'balance', 'hotels',
  'lounge', 'personal',
];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, authorization, x-client-info, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), { status: 405, headers: CORS });
  }

  let query: string;
  try {
    const body = await req.json();
    query = String(body.query ?? '').slice(0, 300);
  } catch {
    return new Response(JSON.stringify({ error: 'invalid JSON' }), { status: 400, headers: CORS });
  }
  if (query.trim().length < 3) {
    return new Response(JSON.stringify({ filters: [] }), { headers: { ...CORS, 'content-type': 'application/json' } });
  }

  const groqKey = Deno.env.get('GROQ_API_KEY');
  if (!groqKey) {
    return new Response(JSON.stringify({ error: 'GROQ_API_KEY not configured' }), { status: 500, headers: CORS });
  }

  const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${groqKey}` },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      temperature: 0,
      max_tokens: 80,
      messages: [{
        role: 'user',
        content:
          `A user described the credit card they want: "${query}"\n\n` +
          `Which of these filter tags apply? ${FILTER_IDS.join(', ')}\n\n` +
          `Respond with ONLY a JSON array of matching tag strings (empty array if none), no other text.`,
      }],
    }),
  });

  if (!resp.ok) {
    return new Response(JSON.stringify({ filters: [], error: `groq ${resp.status}` }), {
      status: 502,
      headers: { ...CORS, 'content-type': 'application/json' },
    });
  }

  const data = await resp.json();
  let filters: string[] = [];
  try {
    const raw = data.choices?.[0]?.message?.content ?? '[]';
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    if (Array.isArray(parsed)) {
      filters = parsed.filter((f: unknown) => typeof f === 'string' && FILTER_IDS.includes(f));
    }
  } catch {
    filters = [];
  }

  return new Response(JSON.stringify({ filters }), {
    headers: { ...CORS, 'content-type': 'application/json' },
  });
});
