const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const KEY = 'scores';
const LIMIT = 10;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  });
}

function sanitizeEntry(input) {
  const name = String(input?.name || 'BANANA')
    .toUpperCase()
    .replace(/[^A-Z0-9 _-]/g, '')
    .slice(0, 12) || 'BANANA';
  const score = Math.max(0, Math.floor(Number(input?.score || 0)));
  const level = Math.max(1, Math.min(10, Math.floor(Number(input?.level || 1))));
  const grazes = Math.max(0, Math.floor(Number(input?.grazes || 0)));
  return { name, score, level, grazes, date: shortDate(new Date()) };
}

function shortDate(date) {
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
}

async function readScores(env) {
  const raw = await env.LEADERBOARD.get(KEY);
  const scores = raw ? JSON.parse(raw) : [];
  return Array.isArray(scores) ? scores : [];
}

function sortScores(scores) {
  return scores
    .filter((entry) => typeof entry?.score === 'number')
    .sort((a, b) => b.score - a.score || b.level - a.level || b.grazes - a.grazes)
    .slice(0, LIMIT);
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });
    if (!env.LEADERBOARD) return json({ error: 'LEADERBOARD KV binding missing' }, 500);

    if (request.method === 'GET') {
      return json({ scores: sortScores(await readScores(env)) });
    }

    if (request.method === 'POST') {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: 'invalid json' }, 400);
      }
      const scores = sortScores([...(await readScores(env)), sanitizeEntry(body)]);
      await env.LEADERBOARD.put(KEY, JSON.stringify(scores));
      return json({ scores });
    }

    return json({ error: 'method not allowed' }, 405);
  }
};
