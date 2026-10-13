// Generuje nagrania lektora do interaktywnego dylematu (/pl/dylemat/) przez
// ElevenLabs i zapisuje manifest z momentem wejscia kazdego zdania.
//
// Uruchomienie (klucz tylko w zmiennej srodowiskowej, nigdy w repozytorium):
//   ELEVENLABS_API_KEY=... node scripts/generate-narration.mjs [--dry] [--texts] [--force] [id ...]
//
// Kazdy ekran ma wlasne nagranie, wiec strona moze przerwac lektora przy
// zmianie karty i nigdy nie czyta tekstu z innego ekranu. Nagranie, ktorego
// tekst i ustawienia sie nie zmienily, nie jest generowane ponownie (kredyty).
// Podzial na zdania jest ten sam co w src/assets/js/dylemat.js; manifest
// podaje czas startu kazdego zdania w kolejnosci, w jakiej strona je odslania.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import dylemat from "../src/_data/dylemat.js";

const LANG = "pl";
const VOICE = "jvcMcno3QtjOzGtfpjoI"; // David - Deep Documentary Narrator
const MODEL = "eleven_v3";
const FORMAT = "mp3_44100_64";
const SETTINGS = { stability: 0.5, similarity_boost: 0.8, speed: 0.9 };
const OUT_DIR = path.resolve(`src/static/assets/audio/lektor/${LANG}`);
const MANIFEST = path.resolve(`narration/${LANG}.json`);
// Pauza miedzy tytulem a tekstem i miedzy akapitami; v3 czyta wielokropek jako
// zawieszenie glosu.
const BREAK = " ... ";

// Ta sama granica zdan co w skrypcie strony.
const SENTENCE = /(?<=[.!?…](?:”|<\/strong>|<\/em>)*)\s+(?=[„"A-ZĄĆĘŁŃÓŚŹŻ<])/u;
const strip = (html) => html.replace(/<[^>]+>/g, "");
const ORDINAL = { I: "pierwszy", II: "drugi", III: "trzeci", IV: "czwarty", V: "piąty", VI: "szósty" };

// Nagranie to lista czesci. "sync" to akapity, ktorych zdania strona odslania
// w rytm lektora; "say" to tekst czytany bez odslaniania (tytul, rozdzial).
function clips() {
  const d = dylemat;
  const list = [];
  const add = (id, parts) => list.push({ id, parts });
  const title = (text) => ({ say: text.endsWith("?") || text.endsWith(".") || text.endsWith("”") ? text : text + "." });

  add("opening-lines", [{ sync: d.opening.lines, lines: true }]);
  add("opening-title", [{ say: d.opening.title + "." }, { say: d.opening.slogan }, { say: d.welcome.lead }]);
  Object.keys(d.chapters).forEach((roman) => {
    add(`chapter-${roman}`, [{ say: `Rozdział ${ORDINAL[roman]}.` }, { say: d.chapters[roman] + "." }]);
  });
  d.scenes.forEach((s) => add(`scene-${s.id}`, [title(s.title), { sync: s.text }]));
  add("decision", [{ sync: d.decision.text }, title(d.decision.title)]);
  add("return", [title(d.returnChoice.title), { sync: d.returnChoice.text }]);
  add("lucja", [{ sync: d.lucja.text }]);
  Object.entries(d.lucja.stakes).forEach(([key, text]) => add(`lucja-stakes-${key}`, [{ sync: [text] }]));
  Object.entries(d.objection.text).forEach(([key, text]) => add(`objection-${key}`, [{ sync: [text, d.objection.close] }]));
  Object.entries(d.consequences).forEach(([key, c]) => {
    add(`consequence-${key}`, [title(c.title), { sync: c.text }]);
    if (c.wasted) add(`consequence-${key}-wasted`, [title(c.title), { sync: [...c.text.slice(0, -1), c.wasted] }]);
  });
  Object.entries(d.notes).forEach(([key, text]) => add(`note-${key}`, [{ say: text }]));
  return list;
}

// Sklada tekst do lektora i zapamietuje, od ktorego znaku zaczyna sie kazde
// odslaniane zdanie.
function compose(parts) {
  let text = "";
  const starts = [];
  const gap = () => { if (text) text += BREAK; };
  parts.forEach((part) => {
    if (part.say) { gap(); text += strip(part.say); return; }
    part.sync.forEach((paragraph) => {
      gap();
      const sentences = part.lines ? [paragraph] : paragraph.split(SENTENCE);
      sentences.forEach((sentence, i) => {
        if (i) text += " ";
        starts.push(text.length);
        text += strip(sentence);
      });
    });
  });
  return { text, starts };
}

async function speak(text) {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE}/with-timestamps?output_format=${FORMAT}`,
    {
      method: "POST",
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ text, model_id: MODEL, language_code: LANG, voice_settings: SETTINGS })
    }
  );
  if (!response.ok) throw new Error(`ElevenLabs ${response.status}: ${(await response.text()).slice(0, 300)}`);
  return response.json();
}

async function main() {
  if (!process.env.ELEVENLABS_API_KEY && !process.argv.includes("--dry") && !process.argv.includes("--texts")) throw new Error("Brak ELEVENLABS_API_KEY w srodowisku.");
  const args = process.argv.slice(2);
  // --texts wypisuje tekst kazdego nagrania jako JSON, np. do porownania z
  // transkrypcja nagran.
  if (args.includes("--texts")) {
    console.log(JSON.stringify(Object.fromEntries(clips().map((clip) => [clip.id, compose(clip.parts).text])), null, 2));
    return;
  }
  const force = args.includes("--force");
  const dry = args.includes("--dry");
  const only = args.filter((a) => !a.startsWith("--"));
  const manifest = fs.existsSync(MANIFEST)
    ? JSON.parse(fs.readFileSync(MANIFEST, "utf8"))
    : { voice: VOICE, model: MODEL, language: LANG, clips: {} };
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(MANIFEST), { recursive: true });

  let spent = 0;
  for (const clip of clips()) {
    if (only.length && !only.includes(clip.id)) continue;
    const { text, starts } = compose(clip.parts);
    const hash = crypto.createHash("sha1").update(JSON.stringify([text, MODEL, VOICE, SETTINGS, FORMAT])).digest("hex").slice(0, 12);
    const file = path.join(OUT_DIR, `${clip.id}.mp3`);
    const known = manifest.clips[clip.id];
    if (!force && known && known.hash === hash && fs.existsSync(file)) continue;
    if (dry) { spent += text.length; console.log(`${clip.id}: ${text.length} znakow, ${starts.length} zdan | ${text.slice(0, 70)}`); continue; }

    const result = await speak(text);
    const a = result.alignment;
    if (!a || a.characters.length !== text.length) {
      throw new Error(`${clip.id}: wyrownanie ma ${a ? a.characters.length : 0} znakow zamiast ${text.length}`);
    }
    fs.writeFileSync(file, Buffer.from(result.audio_base64, "base64"));
    const round = (n) => Math.round(n * 100) / 100;
    manifest.clips[clip.id] = {
      src: `/assets/audio/lektor/${LANG}/${clip.id}.mp3`,
      duration: round(a.character_end_times_seconds.at(-1)),
      marks: starts.map((i) => round(a.character_start_times_seconds[i])),
      hash
    };
    spent += text.length;
    console.log(`${clip.id}: ${text.length} znakow, ${manifest.clips[clip.id].duration} s, ${starts.length} zdan`);
    fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
  }
  console.log(`Gotowe. Wygenerowano ${spent} znakow.`);
}

main().catch((error) => { console.error(error.message); process.exit(1); });
