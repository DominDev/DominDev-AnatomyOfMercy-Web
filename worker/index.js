// Worker strony. Wszystko poza /api/* obsluguja statyczne zasoby bez udzialu
// tego kodu (assets.run_worker_first w wrangler.jsonc). API ma dwa punkty
// interaktywnego dylematu (/pl/dylemat/): zapis anonimowego wyniku i
// zbiorcze statystyki wyborow.
//
// Zapisujemy tylko to, co wysyla strona i co przejdzie walidacje ponizej:
// wybory z zamknietych list, skale 1-5, czasy na ekranach i krotkie
// odpowiedzi tekstowe. Bez adresu IP, ciasteczek i naglowkow przegladarki.

const PATHS = ["stabilizacja", "tomasz", "veyr_zywy", "veyr_zabity", "seweryn"];
const RETURNS = ["oddanie", "przemkniecie", "przebicie"];
const LUCJA = ["prawda", "zatajenie"];
const OBJECTION = ["mimo_sprzeciwu", "rezygnacja"];
const CLIENTS = ["mobile", "desktop"];
const SCREENS = ["gate", "opening", "chapters", "A", "B", "C", "D", "E", "F", "G", "H", "decision", "difficulty",
  "return", "difficultyReturn", "lucja", "difficultyLucja", "objection", "difficultyObjection", "consequence",
  "questions"];
// Grupy przypomnien (ikona i) i wartosci, ktore moga w nich wystapic.
const INFO = {
  decision: PATHS,
  return: RETURNS,
  lucja: LUCJA,
  objection: OBJECTION
};
const VALUES = ["", "zycie_lucji", "wola_lucji", "miasto", "dzieci", "nikogo_wiecej", "prawda", "inne"];
const MORE = ["", "tak", "nie"];
const WHO = ["lucja", "tomasz", "veyr", "agata", "seweryn", "dzieci", "julian"];
const AGES = ["", "poniżej 18", "18-24", "25-34", "35-44", "45-54", "55 i więcej"];
const GAMES = ["", "tak, często", "czasem", "rzadko albo wcale"];
// Statystyki licza tylko odpowiedzi do tej samej glownej wersji tresci.
const STATS_VERSION = "2.%";
const MIN_STATS = 3;
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

const none = (value) => value === null || value === undefined;
const oneOf = (value, list) => list.includes(value);
const count = (value) => Number.isInteger(value) && value >= 0 && value <= MAX_MS;
const step = (value) => Number.isInteger(value) && value >= 1 && value <= 5;
const text = (value) => (typeof value === "string" ? value.trim().slice(0, MAX_TEXT) : "");

// Spojnosc galezi, dokladnie jak w skrypcie strony:
// - stabilizacja od razu albo oddanie materialu przy bramie: bez rozmowy z
//   Lucja, droga koncowa to stabilizacja;
// - po powrocie z materialem wybor wobec Lucji jest obowiazkowy;
// - prawda o drodze innej niz Tomasz wywoluje sprzeciw, a rezygnacja konczy
//   sie stabilizacja; w pozostalych przypadkach sprzeciwu nie ma.
function branchOk(p) {
  if (!oneOf(p.path, PATHS) || !oneOf(p.finalPath, PATHS)) return false;
  if (p.path === "stabilizacja") {
    return none(p.returnMode) && none(p.lucja) && none(p.objection) && p.finalPath === "stabilizacja";
  }
  if (!oneOf(p.returnMode, RETURNS)) return false;
  if (p.returnMode === "oddanie") {
    return none(p.lucja) && none(p.objection) && p.finalPath === "stabilizacja";
  }
  if (!oneOf(p.lucja, LUCJA)) return false;
  if (p.lucja === "prawda" && p.path !== "tomasz") {
    if (!oneOf(p.objection, OBJECTION)) return false;
    return p.finalPath === (p.objection === "rezygnacja" ? "stabilizacja" : p.path);
  }
  return none(p.objection) && p.finalPath === p.path;
}

// Kazdy wybor, ktory gracz faktycznie podjal, ma swoja ocene trudnosci 1-5;
// wybor, do ktorego nie doszedl, nie moze jej miec.
function difficultyOk(p) {
  const pairs = [[p.path, p.difficulty], [p.returnMode, p.difficultyReturn], [p.lucja, p.difficultyLucja],
    [p.objection, p.difficultyObjection]];
  return pairs.every(([choice, level]) => (none(choice) ? none(level) : step(level)));
}

function record(value, accept) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const out = {};
  for (const [key, item] of Object.entries(value)) {
    if (!accept(key, item)) return null;
    out[key] = item;
  }
  return out;
}

// Zwraca wiersz do zapisu albo null, gdy cokolwiek odbiega od tego, co strona
// moze wyslac.
function validate(p) {
  if (!p || typeof p !== "object") return null;
  if (typeof p.version !== "string" || !/^\d+\.\d+$/.test(p.version)) return null;
  if (!oneOf(p.client, CLIENTS) || !count(p.decisionMs) || !branchOk(p) || !difficultyOk(p)) return null;
  const timings = record(p.timings, (key, value) => SCREENS.includes(key) && count(value));
  const infoOpens = record(p.infoOpens, (key, value) => {
    const [group, option] = key.split(":");
    return Object.hasOwn(INFO, group) && INFO[group].includes(option) && Number.isInteger(value) && value >= 1 && value <= 100;
  });
  if (!timings || !infoOpens) return null;

  const a = p.answers && typeof p.answers === "object" ? p.answers : {};
  const scaleOrNone = (value) => none(value) || step(value);
  if (!oneOf(a.value ?? "", VALUES) || !oneOf(a.more ?? "", MORE) || !oneOf(a.age ?? "", AGES) || !oneOf(a.games ?? "", GAMES)) return null;
  if (!scaleOrNone(a.veyr) || !scaleOrNone(a.clarity)) return null;
  const who = a.who ?? [];
  if (!Array.isArray(who) || who.some((w) => !WHO.includes(w)) || new Set(who).size !== who.length) return null;
  if (who.length && a.more !== "tak") return null;

  return [
    new Date().toISOString(), p.version, p.client, p.path, p.difficulty, p.returnMode ?? null, p.lucja ?? null,
    p.objection ?? null, p.finalPath, p.difficultyReturn ?? null, p.difficultyLucja ?? null,
    p.difficultyObjection ?? null, p.decisionMs, JSON.stringify(timings), JSON.stringify(infoOpens),
    text(a.paid) || null, a.value || null, a.veyr ?? null, a.more || null, who.length ? who.join(",") : null,
    a.clarity ?? null, text(a.comment) || null, a.age || null, a.games || null
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
  await env.DYLEMAT_DB.prepare(
    `INSERT INTO dylemat_responses (created_at, version, client, path, difficulty, return_mode, lucja, objection,
       final_path, difficulty_return, difficulty_lucja, difficulty_objection, decision_ms, timings, info_opens,
       paid, value, veyr, more, who, clarity, comment, age, games, host)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(...row, url.host).run();
  return json({ ok: true }, 201);
}

// Zbiorcze liczby dla ekranu "Jak wybrali inni": tylko ten sam adres strony
// i ta sama glowna wersja tresci. Ponizej trzech odpowiedzi nic nie
// zdradzamy, zeby pierwsze osoby nie widzialy wyborow konkretnych znajomych.
async function stats(request, env, url) {
  if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405);
  const where = "WHERE host = ?1 AND version LIKE ?2";
  const [paths, summary, truth] = await env.DYLEMAT_DB.batch([
    env.DYLEMAT_DB.prepare(`SELECT path, COUNT(*) AS n FROM dylemat_responses ${where} GROUP BY path`).bind(url.host, STATS_VERSION),
    env.DYLEMAT_DB.prepare(`SELECT COUNT(*) AS n, AVG(difficulty) AS difficulty FROM dylemat_responses ${where}`).bind(url.host, STATS_VERSION),
    env.DYLEMAT_DB.prepare(`SELECT lucja, COUNT(*) AS n FROM dylemat_responses ${where} AND lucja IS NOT NULL GROUP BY lucja`).bind(url.host, STATS_VERSION)
  ]);
  const n = summary.results[0]?.n ?? 0;
  if (n < MIN_STATS) return json({ enough: false }, 200);
  const byKey = (rows, key) => Object.fromEntries(rows.map((row) => [row[key], row.n]));
  return json({
    enough: true,
    n,
    paths: byKey(paths.results, "path"),
    difficulty: Math.round(summary.results[0].difficulty * 10) / 10,
    truth: byKey(truth.results, "lucja")
  }, 200);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/dylemat") return saveResponse(request, env, url);
    if (url.pathname === "/api/dylemat/stats") return stats(request, env, url);
    if (url.pathname.startsWith("/api/")) return json({ error: "not_found" }, 404);
    return env.ASSETS.fetch(request);
  }
};
