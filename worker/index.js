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
  // Numer podejscia z tej samej przegladarki; brak oznacza pierwsze.
  const attempt = p.attempt ?? 1;
  if (!Number.isInteger(attempt) || attempt < 1 || attempt > 99) return null;

  return [
    new Date().toISOString(), p.version, p.client, p.path, p.difficulty, p.returnMode ?? null, p.lucja ?? null,
    p.objection ?? null, p.finalPath, p.difficultyReturn ?? null, p.difficultyLucja ?? null,
    p.difficultyObjection ?? null, p.decisionMs, JSON.stringify(timings), JSON.stringify(infoOpens),
    text(a.paid) || null, a.value || null, a.veyr ?? null, a.more || null, who.length ? who.join(",") : null,
    a.clarity ?? null, text(a.comment) || null, a.age || null, a.games || null, attempt
  ];
}

// Powiadomienie na Discord (#web) o kazdej zapisanej odpowiedzi. Adres
// webhooka jest sekretem Workera DISCORD_DILEMMA_WEBHOOK; bez niego Worker
// po prostu niczego nie wysyla. Blad Discorda nigdy nie psuje zapisu.
const PRODUCTION_HOST = "anatomyofmercy.com";
const LABELS = {
  stabilizacja: "metoda Agaty", tomasz: "dar Tomasza", veyr_zywy: "Veyr siłą, przeżył", veyr_zabity: "śmierć Veyra",
  seweryn: "rdzeń Seweryna", oddanie: "oddał materiał", przemkniecie: "przemknął", przebicie: "przebił się siłą",
  prawda: "prawda", zatajenie: "zatajenie", mimo_sprzeciwu: "leczył mimo sprzeciwu", rezygnacja: "uszanował odmowę"
};
const VALUE_LABELS = {
  zycie_lucji: "życie i zdrowie Łucji", wola_lucji: "wola Łucji", miasto: "ludzie za kordonem", dzieci: "dzieci z aneksu",
  nikogo_wiecej: "nie skrzywdzić nikogo więcej", prawda: "prawda", inne: "coś innego"
};
const quote = (value) => "„" + String(value).replace(/\s+/g, " ").slice(0, 300) + "”";

// Wiadomosc w stylu pozostalych powiadomien serwera (#github, #tablica):
// nadawca "Web • Dylemat • Anatomy of Mercy", embed z emoji w tytule,
// linkiem, kolorem projektu i znacznikiem czasu.
const EMBED_COLOR = 13936975;
const SENDER = "Web • Dylemat • Anatomy of Mercy";

// Zwraca krotki opis wyniku, uzywany tylko przez diagnostyke na podgladzie.
async function notify(env, url, row, p) {
  if (!env.DISCORD_DILEMMA_WEBHOOK) return "no_secret";
  const a = p.answers && typeof p.answers === "object" ? p.answers : {};
  const preview = url.host !== PRODUCTION_HOST;
  const attempt = row[24];
  const repeat = attempt > 1;
  const entry = (icon, label, choice, level) =>
    (choice ? `${icon} ${label}: **${LABELS[choice]}**${level ? ` · trudność ${level}/5` : ""}` : null);
  const { results } = await env.DYLEMAT_DB.prepare(
    "SELECT COUNT(*) AS n FROM dylemat_responses WHERE host = ?1 AND version LIKE ?2"
  ).bind(url.host, STATS_VERSION).all();
  const lines = [
    entry("🩸", "Droga", p.path, p.difficulty),
    entry("🚪", "Brama", p.returnMode, p.difficultyReturn),
    entry("🕯️", "Łucja", p.lucja, p.difficultyLucja),
    entry("✋", "Sprzeciw", p.objection, p.difficultyObjection),
    `⚖️ Koniec: **${LABELS[p.finalPath]}**`,
    text(a.paid) ? `💬 Kto zapłacił: ${quote(text(a.paid))}` : null,
    a.value ? `🎯 Najważniejsze: ${VALUE_LABELS[a.value]}` : null,
    a.veyr || a.clarity ? `📊 Racje Veyra: ${a.veyr ?? "-"}/5 · zrozumiałość: ${a.clarity ?? "-"}/5` : null,
    text(a.comment) ? `📝 Komentarz: ${quote(text(a.comment))}` : null
  ].filter(Boolean);
  const embed = {
    // Numer liczy wszystkie wypelnienia; powtorka ma wlasna ikone i numer
    // podejscia z tej samej przegladarki.
    title: `${preview ? "🧪" : repeat ? "🔁" : "🕯️"} Nowa odpowiedź #${results[0]?.n ?? "?"}`
      + (repeat ? ` (powtórka, przejście ${attempt})` : "") + (preview ? " (podgląd)" : ""),
    url: url.origin + "/pl/dylemat/",
    description: lines.join("\n").slice(0, 3800),
    color: EMBED_COLOR,
    footer: { text: `${p.client === "mobile" ? "telefon" : "komputer"} · wersja ${row[1]}${repeat ? " · powtórka" : ""}${preview ? " · " + url.host : ""}` },
    timestamp: row[0]
  };
  // Bez wzmianek: tekst od uzytkownika nie moze nikogo oznaczyc.
  const response = await fetch(env.DISCORD_DILEMMA_WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": "AnatomyOfMercy-Web (https://anatomyofmercy.com, 1.0)" },
    body: JSON.stringify({ username: SENDER, embeds: [embed], allowed_mentions: { parse: [] } })
  });
  if (response.ok) return "discord " + response.status;
  const detail = "discord " + response.status + " " + (await response.text()).slice(0, 200);
  console.error(detail);
  return detail;
}

async function saveResponse(request, env, url, ctx) {
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
       paid, value, veyr, more, who, clarity, comment, age, games, attempt, host)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(...row, url.host).run();
  const sending = notify(env, url, row, payload).catch((error) => {
    // Komunikat bledu fetch moze zawierac adres webhooka, czyli sekret.
    const message = String((error && error.message) || error).replace(/https?:\/\/\S+/g, "[adres]");
    console.error("notify", message);
    return "error " + message;
  });
  // Diagnostyka tylko poza produkcja: z naglowkiem X-Debug-Notify odpowiedz
  // czeka na Discorda i podaje jego wynik (bez adresu webhooka).
  if (url.host !== PRODUCTION_HOST && request.headers.get("X-Debug-Notify") === "1") {
    return json({ ok: true, notify: await sending }, 201);
  }
  ctx.waitUntil(sending);
  return json({ ok: true }, 201);
}

// Zbiorcze liczby dla ekranu "Jak wybrali inni": tylko ten sam adres strony
// i ta sama glowna wersja tresci. Ponizej trzech odpowiedzi nic nie
// zdradzamy, zeby pierwsze osoby nie widzialy wyborow konkretnych znajomych.
async function stats(request, env, url) {
  if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405);
  // Wszystkie wypelnienia, takze powtorki; numer podejscia jest w bazie, wiec
  // pierwsze decyzje mozna policzyc osobno przy ocenie testu.
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
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api/dylemat") return saveResponse(request, env, url, ctx);
    if (url.pathname === "/api/dylemat/stats") return stats(request, env, url);
    if (url.pathname.startsWith("/api/")) return json({ error: "not_found" }, 404);
    return env.ASSETS.fetch(request);
  }
};
