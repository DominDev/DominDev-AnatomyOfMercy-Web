// Worker strony. Wszystko poza /api/* obsluguja statyczne zasoby bez udzialu
// tego kodu (assets.run_worker_first w wrangler.jsonc). Jedynym punktem API
// jest zapis anonimowego wyniku interaktywnej proby dylematu (/proba/).
//
// Zapisujemy tylko to, co wysyla strona i co przejdzie walidacje ponizej:
// wybory z zamknietych list, czasy na kartach, krotkie odpowiedzi tekstowe.
// Bez adresu IP, ciasteczek i naglowkow przegladarki.

const PATHS = ["stabilizacja", "tomasz", "veyr_zywy", "veyr_zabity", "seweryn"];
const RETURNS = ["oddanie", "przemkniecie", "przebicie"];
const LUCJA = ["prawda", "zatajenie"];
const OBJECTION = ["mimo_sprzeciwu", "rezygnacja"];
const CLIENTS = ["mobile", "desktop"];
const SCREENS = ["intro", "A", "B", "C", "D", "E", "F", "G", "H", "decision", "overview", "return", "lucja",
  "objection", "consequence", "questions", "end"];
const AGES = ["", "poniżej 18", "18-24", "25-34", "35-44", "45-54", "55 i więcej"];
const GAMES = ["", "tak, często", "czasem", "rzadko albo wcale"];
const MAX_BODY = 20000;
const MAX_TEXT = 2000;
const MAX_MS = 6 * 60 * 60 * 1000;

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer"
    }
  });
}

const oneOf = (value, list, optional) => (optional && (value === null || value === undefined)) || list.includes(value);
const count = (value) => Number.isInteger(value) && value >= 0 && value <= MAX_MS;
const text = (value) => (typeof value === "string" ? value.trim().slice(0, MAX_TEXT) : "");

// Zwraca wiersz do zapisu albo null, gdy cokolwiek odbiega od tego, co strona
// moze wyslac. Spojnosc galezi sprawdzamy tak samo jak w skrypcie strony.
function validate(p) {
  if (!p || typeof p !== "object") return null;
  if (typeof p.version !== "string" || p.version.length > 10) return null;
  if (!oneOf(p.path, PATHS) || !oneOf(p.finalPath, PATHS) || !oneOf(p.client, CLIENTS)) return null;
  if (!oneOf(p.returnMode, RETURNS, true) || !oneOf(p.lucja, LUCJA, true) || !oneOf(p.objection, OBJECTION, true)) return null;
  const donor = p.path !== "stabilizacja";
  if (donor !== (p.returnMode !== null && p.returnMode !== undefined)) return null;
  if (!count(p.decisionMs) || !Number.isInteger(p.rereads) || p.rereads < 0 || p.rereads > 100) return null;
  if (!p.timings || typeof p.timings !== "object") return null;
  const timings = {};
  for (const [key, value] of Object.entries(p.timings)) {
    if (!SCREENS.includes(key) || !count(value)) return null;
    timings[key] = value;
  }
  const a = p.answers && typeof p.answers === "object" ? p.answers : {};
  if (!AGES.includes(a.age ?? "") || !GAMES.includes(a.games ?? "")) return null;
  return [
    new Date().toISOString(), p.version, p.client, p.path, p.returnMode ?? null, p.lucja ?? null,
    p.objection ?? null, p.finalPath, p.decisionMs, p.rereads, JSON.stringify(timings),
    text(a.q1), text(a.q2), text(a.q3), text(a.q4), text(a.q5), a.age || null, a.games || null
  ];
}

async function saveResponse(request, env, url) {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  // Tylko z naszej wlasnej strony: przegladarka zawsze wysyla Origin przy POST.
  if (request.headers.get("Origin") !== url.origin) return json({ error: "forbidden" }, 403);
  if (!(request.headers.get("Content-Type") || "").startsWith("application/json")) return json({ error: "unsupported" }, 415);
  const raw = await request.text();
  if (raw.length > MAX_BODY) return json({ error: "too_large" }, 413);
  let payload;
  try { payload = JSON.parse(raw); } catch { return json({ error: "bad_json" }, 400); }
  const row = validate(payload);
  if (!row) return json({ error: "invalid" }, 400);
  // Host odroznia wydanie produkcyjne od podgladow galezi, ktore pisza do tej
  // samej bazy.
  await env.PROBA_DB.prepare(
    `INSERT INTO responses (created_at, version, client, path, return_mode, lucja, objection, final_path,
       decision_ms, rereads, timings, q1, q2, q3, q4, q5, age, games, host)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(...row, url.host).run();
  return json({ ok: true }, 201);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/proba") return saveResponse(request, env, url);
    if (url.pathname.startsWith("/api/")) return json({ error: "not_found" }, 404);
    return env.ASSETS.fetch(request);
  }
};
