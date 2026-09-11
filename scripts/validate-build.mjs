import fs from "node:fs";
import path from "node:path";

// Ten sam modul, z ktorego korzysta budowanie, wiec kontrola sprawdza adres
// faktycznie uzyty w wydaniu, a nie zaszyta na sztywno domene produkcyjna.
import site from "../src/_data/site.js";

const requiredFiles = [
  "dist/index.html",
  "dist/pl/index.html",
  "dist/404.html",
  "dist/assets/css/main.css",
  "dist/assets/js/main.js",
  "dist/robots.txt"
];

const missingFiles = requiredFiles.filter((file) => !fs.existsSync(path.resolve(file)));

if (missingFiles.length > 0) {
  console.error("Build validation failed. Missing files:");
  for (const file of missingFiles) {
    console.error(`- ${file}`);
  }
  process.exit(1);
}

const english = fs.readFileSync(path.resolve("dist/index.html"), "utf8");
const polish = fs.readFileSync(path.resolve("dist/pl/index.html"), "utf8");

const assertions = [
  [english.includes('<html lang="en">'), "English page is missing lang=en."],
  [polish.includes('<html lang="pl">'), "Polish page is missing lang=pl."],
  [english.includes('hreflang="pl"'), "English page is missing the Polish alternate."],
  [polish.includes('hreflang="en"'), "Polish page is missing the English alternate."],
  [english.includes(`<link rel="canonical" href="${site.url}/">`), `English canonical URL is missing or is not ${site.url}/.`],
  [polish.includes(`<link rel="canonical" href="${site.url}/pl/">`), `Polish canonical URL is missing or is not ${site.url}/pl/.`],
  [!/^https?:\/\/[^/]+\/$/.test(site.url) && !site.url.endsWith("/"), `Site URL must not end with a slash: ${site.url}`]
];

// Wydanie podgladowe wskazuje samo siebie jako adres kanoniczny, wiec nie moze
// byc indeksowane. Inaczej w wynikach wyszukiwania stanelyby dwie strony o tej
// samej tresci, a ta pod adresem roboczym przetrwalaby publikacje domeny.
const robots = fs.readFileSync(path.resolve("dist/robots.txt"), "utf8");
assertions.push([
  site.isProduction ? robots.includes("Allow: /") : robots.includes("Disallow: /"),
  site.isProduction
    ? "Production robots.txt must allow indexing."
    : `Non production build at ${site.url} must disallow indexing in robots.txt.`
]);

const contentAssertions = [
  [!/<h[1-3][^>]*>\s*<\/h[1-3]>/.test(english), "English page contains an empty heading."],
  [!/<h[1-3][^>]*>\s*<\/h[1-3]>/.test(polish), "Polish page contains an empty heading."],
  [!/<a[^>]*class="[^"]*button[^"]*"[^>]*>\s*<\/a>/.test(english), "English page contains an empty button."],
  [!/<a[^>]*class="[^"]*button[^"]*"[^>]*>\s*<\/a>/.test(polish), "Polish page contains an empty button."],
  [(english.match(/class="story-card"/g) ?? []).length === 4, "English page must render four story cards."],
  [(polish.match(/class="story-card"/g) ?? []).length === 4, "Polish page must render four story cards."],
  [english.includes('class="hero__scene"'), "English hero is missing the project character artwork."],
  [polish.includes('class="hero__scene"'), "Polish hero is missing the project character artwork."],
  [english.includes('data-preloader'), "English page is missing the branded preloader."],
  [polish.includes('data-preloader'), "Polish page is missing the branded preloader."],
  [english.includes('class="page-frame"'), "English page is missing the ornamental frame."],
  [polish.includes('class="page-frame"'), "Polish page is missing the ornamental frame."],
  [(english.match(/class="story-card__cover"/g) ?? []).length === 4, "English stories must render four covers."],
  [(polish.match(/class="story-card__cover"/g) ?? []).length === 4, "Polish stories must render four covers."]
];

assertions.push(...contentAssertions);
for (const [name, html] of [["English", english], ["Polish", polish]]) {
  assertions.push([(html.match(/class="vignettes__item"/g) ?? []).length === 4, name + " must contain four illustrated vignettes."]);
  const images = [...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map(match => match[1]);
  for (const image of images) {
    assertions.push([fs.existsSync(path.join("dist", image)), name + " image missing: " + image]);
  }
  assertions.push([html.includes("data-intro-skip"), name + " entrance must have a skip control."]);
  // Podglad linku w komunikatorach jest kryterium ukonczenia MVP.
  const image = html.match(/property="og:image" content="([^"]+)"/);
  assertions.push([Boolean(image), name + " page is missing og:image."]);
  if (image) {
    const local = image[1].replace(site.url, "");
    assertions.push([fs.existsSync(path.join("dist", local)), name + " og:image file is missing: " + local]);
  }
  assertions.push([html.includes('name="twitter:card"'), name + " page is missing the Twitter card type."]);
}

// Kolejnosc naglowkow: zaden h3 nie moze poprzedzac pierwszego h2, poniewaz
// czytnik ekranu odczytywalby podpunkty przed ich naglowkiem nadrzednym.
for (const [name, html] of [["English", english], ["Polish", polish]]) {
  const levels = [...html.matchAll(/<h([1-6])[\s>]/g)].map(match => Number(match[1]));
  let previous = 0;
  let skipped = null;
  for (const level of levels) {
    if (previous && level > previous + 1) {
      skipped = `h${previous} followed by h${level}`;
      break;
    }
    previous = level;
  }
  assertions.push([skipped === null, `${name} heading order skips a level: ${skipped}.`]);
  assertions.push([html.includes('class="stories__note"'), `${name} stories section is missing the single status note.`]);
  assertions.push([!html.includes("story-card__status"), `${name} still repeats the per card status label.`]);
}

// Obie wersje jezykowe musza miec dokladnie te same klucze i te same liczby
// elementow w listach. Zmiana tylko po jednej stronie jest bledem budowania,
// nie drobiazgiem do zauwazenia pozniej.
const translations = JSON.parse(fs.readFileSync(path.resolve("src/_data/i18n.json"), "utf8"));

function describe(value, prefix = "") {
  if (Array.isArray(value)) {
    return [`${prefix}[]=${value.length}`, ...value.flatMap((item, index) => describe(item, `${prefix}[${index}]`))];
  }
  if (value && typeof value === "object") {
    return Object.keys(value).sort().flatMap(key => describe(value[key], prefix ? `${prefix}.${key}` : key));
  }
  return [prefix];
}

// Jedyny zamierzony wyjatek: angielska karta opowiadania podaje pod tytulem
// oryginalny tytul polski. Na polskiej stronie tytul juz nim jest.
const intentionalEnglishOnly = [
  "stories.items[0].original",
  "stories.items[1].original",
  "stories.items[2].original",
  "stories.items[3].original"
];

const englishKeys = describe(translations.en);
const polishKeys = describe(translations.pl);
const onlyEnglish = englishKeys.filter(key => !polishKeys.includes(key) && !intentionalEnglishOnly.includes(key));
const onlyPolish = polishKeys.filter(key => !englishKeys.includes(key));

assertions.push([onlyEnglish.length === 0, "Keys present only in English: " + onlyEnglish.join(", ")]);
assertions.push([onlyPolish.length === 0, "Keys present only in Polish: " + onlyPolish.join(", ")]);

for (const [language, tree] of [["English", translations.en], ["Polish", translations.pl]]) {
  const empty = describe(tree).filter(key => {
    const value = key.split(/\.|\[|\]/).filter(Boolean).reduce((node, part) => node?.[part], tree);
    return typeof value === "string" && value.trim() === "";
  });
  assertions.push([empty.length === 0, `${language} has empty strings: ${empty.join(", ")}`]);
}

// Nakladka menu mobilnego jest potomkiem naglowka i ma pozycje fixed. Kazda z
// ponizszych wlasciwosci ustawiona na samym naglowku czyni go blokiem
// zawierajacym dla takich potomkow, przez co nakladka przestaje wymiarowac sie
// do okna i zwija sie do rozmiaru paska. Tlo i rozmycie naleza do pseudoelementu.
const styles = fs.readFileSync(path.resolve("dist/assets/css/main.css"), "utf8");
const containingBlockProperties = ["backdrop-filter", "filter", "transform", "perspective", "will-change", "contain"];
const headerRules = [...styles.matchAll(/([^{}]+)\{([^}]*)\}/g)].filter(([, selectors]) =>
  selectors.split(",").some(selector => /(^|\s)\.site-header$/.test(selector.trim()))
);

for (const [, selectors, declarations] of headerRules) {
  for (const property of containingBlockProperties) {
    const offending = new RegExp(`(^|;)\\s*${property}\\s*:`).test(declarations);
    assertions.push([
      !offending,
      `"${selectors.trim()}" sets ${property}, which would make the header a containing block for the fixed mobile menu overlay. Move it to .site-header::before.`
    ]);
  }
}

const failures = assertions.filter(([condition]) => !condition).map(([, message]) => message);

if (failures.length > 0) {
  console.error("Build validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Build validation passed for ${requiredFiles.length} required files.`);
