// Wspolna definicja nagran lektora dylematu: lista nagran, tekst kazdego z
// nich i jego odcisk. Uzywaja jej generator (scripts/generate-narration.mjs)
// i dane strony (src/_data/dylemat.js). Strona bierze tylko nagrania, ktorych
// odcisk w manifescie zgadza sie z obecnym tekstem, wiec po zmianie tresci
// ekran nigdy nie czyta starego nagrania nad nowym tekstem; idzie wtedy bez
// lektora, dopoki nagranie nie zostanie wygenerowane ponownie.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const LANG = "pl";
export const VOICE = "jvcMcno3QtjOzGtfpjoI"; // David - Deep Documentary Narrator
export const MODEL = "eleven_v3";
export const FORMAT = "mp3_44100_64";
export const SETTINGS = { stability: 0.5, similarity_boost: 0.8, speed: 0.9 };
// Pauza miedzy tytulem a tekstem i miedzy akapitami; v3 czyta wielokropek jako
// zawieszenie glosu.
const BREAK = " ... ";

// Ta sama granica zdan co w skrypcie strony.
const SENTENCE = /(?<=[.!?…](?:”|<\/strong>|<\/em>)*)\s+(?=[„"A-ZĄĆĘŁŃÓŚŹŻ<])/u;
const strip = (html) => html.replace(/<[^>]+>/g, "");
const ORDINAL = { I: "pierwszy", II: "drugi", III: "trzeci", IV: "czwarty", V: "piąty", VI: "szósty" };

// Nagranie to lista czesci. "sync" to akapity, ktorych zdania strona odslania
// w rytm lektora; "say" to tekst czytany bez odslaniania (tytul, rozdzial).
export function clips(d) {
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
    Object.entries(c.wasted || {}).forEach(([path, text]) => {
      add(`consequence-${key}-wasted-${path}`, [title(c.title), { sync: [...c.text.slice(0, -1), text] }]);
    });
  });
  Object.entries(d.notes).forEach(([key, text]) => add(`note-${key}`, [{ say: text }]));
  return list;
}

// Sklada tekst do lektora i zapamietuje, od ktorego znaku zaczyna sie kazde
// odslaniane zdanie.
export function compose(parts) {
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

// Odcisk tekstu i ustawien nagrania; zmiana ktoregokolwiek uniewaznia nagranie.
export const clipHash = (text) =>
  crypto.createHash("sha1").update(JSON.stringify([text, MODEL, VOICE, SETTINGS, FORMAT])).digest("hex").slice(0, 12);

// Nagrania do osadzenia na stronie: plik istnieje, a odcisk w manifescie
// zgadza sie z obecnym tekstem. "stale" to nagrania do ponownego
// wygenerowania (zglaszane przez walidacje buildu).
export function narrationFor(content) {
  const file = path.resolve(`narration/${LANG}.json`);
  if (!fs.existsSync(file)) return { clips: null, stale: [] };
  const manifest = JSON.parse(fs.readFileSync(file, "utf8")).clips;
  const current = Object.fromEntries(clips(content).map((clip) => [clip.id, clipHash(compose(clip.parts).text)]));
  const stale = [];
  const usable = Object.entries(manifest).filter(([id, clip]) => {
    if (!fs.existsSync(path.resolve("src/static" + clip.src))) return false;
    if (current[id] !== clip.hash) { stale.push(id); return false; }
    return true;
  });
  return {
    clips: usable.length ? Object.fromEntries(usable.map(([id, clip]) => [id, { src: clip.src, marks: clip.marks }])) : null,
    stale
  };
}
