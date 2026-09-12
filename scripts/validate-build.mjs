import crypto from "node:crypto";
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
// Sprawdzamy grupe, a nie samo wystapienie slowa w pliku. Wydanie podgladowe
// zawiera i "Allow: /", i "Disallow: /", wiec wyszukiwanie tekstu przepuscilo by
// odwrocona regule.
function parseRobots(text) {
  const groups = [];
  let current = null;
  for (const raw of text.split("\n")) {
    const line = raw.replace(/#.*$/, "").trim();
    if (line === "") continue;
    const [field, ...rest] = line.split(":");
    const key = field.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (key === "user-agent") {
      if (!current || current.rules.length > 0) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
    } else if (current) {
      current.rules.push(`${key}: ${value}`);
    }
  }
  return groups;
}

const robotsText = fs.readFileSync(path.resolve("dist/robots.txt"), "utf8");
const robotGroups = parseRobots(robotsText);
const everyone = robotGroups.find(group => group.agents.includes("*"));

assertions.push([Boolean(everyone), "robots.txt is missing a group for every user agent."]);

if (everyone) {
  if (site.isProduction) {
    assertions.push([
      everyone.rules.includes("allow: /") && !everyone.rules.includes("disallow: /"),
      "Production robots.txt must allow indexing for every user agent."
    ]);
    // Zaproszenie robotow bez wskazania mapy to polowa roboty. Mapa jest tanim
    // sposobem podania pelnej listy adresow, zamiast liczyc na to, ze robot
    // znajdzie druga wersje jezykowa sam.
    assertions.push([
      robotsText.includes(`Sitemap: ${site.productionUrl}/sitemap.xml`),
      "Production robots.txt does not point at the sitemap."
    ]);
  } else {
    assertions.push([
      everyone.rules.includes("disallow: /") && !everyone.rules.includes("allow: /"),
      `Non production build at ${site.url} must disallow indexing for every user agent.`
    ]);
    // Roboty kafelka linku musza przejsc, inaczej nie da sie sprawdzic podgladu
    // w komunikatorach. Messenger korzysta z facebookexternalhit, ktory ten plik
    // respektuje, wiec bez wyjatku karta linku nie powstaje.
    const preview = robotGroups.find(group => group.agents.includes("facebookexternalhit"));
    assertions.push([
      Boolean(preview) && preview.rules.includes("allow: /"),
      "Non production robots.txt must let facebookexternalhit through, or the link preview cannot be checked."
    ]);
    // Wydanie podgladowe nie oglasza mapy. Mapa wymienia adresy produkcyjne,
    // wiec podglad wskazywalby roboty poza siebie, proszac jednoczesnie, zeby
    // do niego nie zagladaly.
    assertions.push([
      !/^Sitemap:/m.test(robotsText),
      "Non production robots.txt advertises a sitemap, which lists production addresses."
    ]);
  }
}

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

  // Pominiety atrybut `alt` i `alt=""` to dwie rozne rzeczy, choc narzedzia
  // czesto licza je razem. Pusty alt jest deklaracja, ze obraz jest ozdobny i
  // czytnik ekranu ma go pominac. Brak atrybutu nie deklaruje niczego, wiec
  // czytnik czyta wtedy nazwe pliku, co daje odbiorcy ciag w rodzaju
  // "i-will-fix-the-rest-later dot webp". Wymagamy wiec obecnosci atrybutu,
  // nie jego tresci. Decyzja, ktory obraz zasluguje na opis, jest decyzja
  // tresciowa i nie da sie jej sprawdzic automatem.
  const tags = [...html.matchAll(/<img[^>]*>/g)].map(match => match[0]);
  assertions.push([tags.length > 0, name + " page has no images at all, which means this check stopped looking at anything."]);
  for (const tag of tags) {
    const source = tag.match(/src="([^"]+)"/)?.[1] ?? tag.slice(0, 60);
    assertions.push([
      /\salt=("[^"]*"|'[^']*')/.test(tag),
      `${name} image has no alt attribute at all: ${source}. Use alt="" for a decorative image, so the omission stays a decision rather than an oversight.`
    ]);
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

// Naglowki odpowiedzi. Najwazniejsza jest tu zgodnosc skrotu: polityka
// bezpieczenstwa dopuszcza dokladnie jeden skrypt osadzony w stronie i podaje
// jego skrot. Gdyby skrypt sie zmienil, a skrot nie, przegladarka przestalaby
// go wykonywac i nikt by tego nie zauwazyl, bo strona wyglada tak samo.
const headersPath = path.resolve("dist/_headers");
assertions.push([fs.existsSync(headersPath), "dist/_headers is missing, so the site would ship with no security headers."]);

if (fs.existsSync(headersPath)) {
  const headers = fs.readFileSync(headersPath, "utf8");
  const required = [
    "Content-Security-Policy",
    "Strict-Transport-Security",
    "X-Content-Type-Options",
    "Referrer-Policy",
    "Permissions-Policy"
  ];
  for (const header of required) {
    assertions.push([headers.includes(header), `dist/_headers is missing ${header}.`]);
  }

  // robots.txt i naglowek noindex musza mowic to samo. robots.txt dziala tylko
  // wtedy, gdy robot go przeczyta, wiec podglad zabezpieczamy takze naglowkiem.
  // Rozjazd tych dwoch jest cichy w obie strony: podglad zaproszony do indeksu
  // albo produkcja wyciszona bez sladu w tresci strony.
  const noindex = /X-Robots-Tag:\s*noindex/i.test(headers);
  assertions.push([
    noindex !== site.isProduction,
    site.isProduction
      ? "Production _headers sends X-Robots-Tag noindex, which would quietly hide the live site from search engines."
      : "Non production _headers sends no X-Robots-Tag noindex, so a preview address reached from a link could still be indexed."
  ]);

  const inline = english.match(/<script>([\s\S]*?)<\/script>/);
  assertions.push([Boolean(inline), "The inline bootstrap script is missing from the English page."]);
  if (inline) {
    const digest = crypto.createHash("sha256").update(inline[1], "utf8").digest("base64");
    assertions.push([
      headers.includes(`sha256-${digest}`),
      `The content security policy hash does not match the inline script. Expected sha256-${digest}.`
    ]);
  }

  // Polityka nie moze dopuszczac dowolnych skryptow, bo wtedy nie chroni przed
  // niczym, a jednoczesnie sprawia wrazenie ochrony.
  assertions.push([
    !/script-src[^;]*'unsafe-inline'/.test(headers),
    "The content security policy allows arbitrary inline scripts."
  ]);

  // Fonty wrocily na wlasny serwer, wiec polityka nie ma juz powodu wpuszczac
  // obcych zrodel. Gdyby ktos je tu przywrocil, znikaloby i zaciesnienie
  // polityki, i zysk na szybkosci.
  for (const directive of ["style-src", "font-src"]) {
    const value = headers.match(new RegExp(`[; ]${directive}([^;]*)`))?.[1] ?? "";
    assertions.push([
      !/https?:\/\//.test(value),
      `The content security policy lets ${directive} reach a third party origin:${value}`
    ]);
  }
}

// Fonty serwujemy sami. Dwie rzeczy moga to po cichu zepsuc: ktos przywroci
// odwolanie do Google, albo zmieni nazwe pliku i zostawi martwy adres w stylach.
// W obu przypadkach strona nadal sie wyswietla, tylko krojem zastepczym, wiec
// bez tego sprawdzenia nikt by nie zauwazyl.
const pages = fs
  .readdirSync(path.resolve("dist"), { recursive: true })
  .map(String)
  .filter(name => name.endsWith(".html"));

for (const page of pages) {
  const markup = fs.readFileSync(path.resolve("dist", page), "utf8");
  assertions.push([
    !/fonts\.(googleapis|gstatic)\.com/.test(markup),
    `${page} still pulls fonts from Google instead of our own server.`
  ]);
}

// Obraz ladowany leniwie bez podanych wymiarow dostaje na starcie pudelko 0x0,
// a po pobraniu rozpycha strone i przesuwa sasiadow. Zabezpieczamy to z dwoch
// stron, bo kazda z osobna da sie ominac: atrybuty w znaczniku i proporcja w
// stylach. Sama para atrybutow wystarcza przegladarce, ale znika przy podmianie
// grafiki, a sama proporcja nie pomaga, gdy ktos doda obraz bez klasy.
const lazyImages = [...english.matchAll(/<img[^>]*loading="lazy"[^>]*>/g)].map(match => match[0]);
assertions.push([lazyImages.length > 0, "No lazy loaded images found, which means this check stopped looking at anything."]);

for (const tag of lazyImages) {
  const source = tag.match(/src="([^"]+)"/)?.[1] ?? tag.slice(0, 60);
  assertions.push([
    /\swidth="\d+"/.test(tag) && /\sheight="\d+"/.test(tag),
    `Lazy loaded image is missing width or height: ${source}`
  ]);
}

// Klasy uzyte na obrazach ladowanych leniwie oraz reguly pisane jako "cos img".
// Jesli taka regula zeruje wysokosc przez height: auto, musi podac proporcje.
const lazyClasses = new Set(
  lazyImages.flatMap(tag => (tag.match(/class="([^"]+)"/)?.[1] ?? "").split(/\s+/)).filter(Boolean)
);

for (const [, selectors, declarations] of styles.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
  if (!/(^|;)\s*height\s*:\s*auto\s*(;|$)/.test(declarations)) continue;
  if (/aspect-ratio\s*:/.test(declarations)) continue;

  const touchesLazyImage = selectors.split(",").some(raw => {
    const selector = raw.trim();
    if (/\simg$/.test(selector)) return true;
    return [...lazyClasses].some(name => selector.endsWith(`.${name}`));
  });

  assertions.push([
    !touchesLazyImage,
    `"${selectors.trim()}" sets height: auto on a lazy loaded image without an aspect ratio, so the browser cannot reserve its space.`
  ]);
}

// Mapa strony i adresy kanoniczne musza opisywac dokladnie ten sam zbior.
// Rozjazd jest cichy: mapa albo zaprasza robota pod adres, ktory sam wskazuje
// gdzie indziej, albo pomija strone, ktora istnieje i chce byc znaleziona.
// Dlatego nie sprawdzamy tu listy wpisanej z palca, tylko zgodnosc dwoch
// zbiorow wyliczonych z wydania.
const sitemapPath = path.resolve("dist", "sitemap.xml");
assertions.push([fs.existsSync(sitemapPath), "dist/sitemap.xml is missing, so search engines get no list of pages."]);

if (fs.existsSync(sitemapPath)) {
  const sitemap = fs.readFileSync(sitemapPath, "utf8");
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);

  assertions.push([locations.length > 0, "dist/sitemap.xml lists no addresses, which means this check stopped looking at anything."]);

  const canonicals = new Set();
  for (const page of pages) {
    const markup = fs.readFileSync(path.resolve("dist", page), "utf8");
    const canonical = markup.match(/rel="canonical" href="([^"]+)"/)?.[1];
    if (canonical) canonicals.add(canonical);
  }

  assertions.push([canonicals.size > 0, "No page declares a canonical address, so the sitemap has nothing to be checked against."]);

  for (const location of locations) {
    assertions.push([
      canonicals.has(location),
      `dist/sitemap.xml lists ${location}, which no page declares as its canonical address.`
    ]);

    // Adres katalogowy wskazuje index.html w tym katalogu, tak samo jak
    // rozwiazuje go Worker.
    const relative = new URL(location).pathname.replace(/^\//, "");
    const file = relative === "" || relative.endsWith("/") ? path.join(relative, "index.html") : relative;
    assertions.push([
      fs.existsSync(path.resolve("dist", file)),
      `dist/sitemap.xml lists ${location}, but ${file.replace(/\\/g, "/")} is not in the build.`
    ]);
  }

  for (const canonical of canonicals) {
    assertions.push([
      locations.includes(canonical),
      `${canonical} is declared canonical by a page but is missing from dist/sitemap.xml.`
    ]);
  }
}

// Dane strukturalne opisuja tresc strony, a nie dopisuja jej. Jesli opis w
// JSON-LD rozejdzie sie z opisem strony, powstanie twierdzenie, ktorego na
// stronie nie ma, a wlasnie to wytyczne Google nazywaja wprowadzaniem w blad.
// Rozjazd jest cichy, bo czytelnik danych strukturalnych nie widzi. Dlatego
// zamiast sprawdzac, czy blok istnieje, sprawdzamy, czy mowi to samo co strona.
for (const page of pages) {
  const markup = fs.readFileSync(path.resolve("dist", page), "utf8");
  const canonical = markup.match(/rel="canonical" href="([^"]+)"/)?.[1];
  if (!canonical) continue;

  const blocks = [...markup.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match => match[1]);
  assertions.push([blocks.length === 1, `${page} should carry exactly one JSON-LD block, found ${blocks.length}.`]);
  if (blocks.length !== 1) continue;

  const raw = blocks[0];

  let data;
  try {
    // Tu wychodzi takze zamykajacy znacznik `script` wstawiony w tresc. Blok
    // danych konczy sie na pierwszym takim znaczniku, wiec opis zawierajacy go
    // urywa blok, a urwany blok nie jest poprawnym JSON. Osobna kontrola na
    // ten ciag byla tu wczesniej i zostala usunieta, bo nie mogla sie zapalic:
    // wyrazenie wycinajace blok konczy dopasowanie w tym samym miejscu, w
    // ktorym konczy je przegladarka. Sprawdzone testem.
    data = JSON.parse(raw);
  } catch (error) {
    assertions.push([false, `${page} has a JSON-LD block that is not valid JSON: ${error.message}`]);
    continue;
  }

  assertions.push([data["@context"] === "https://schema.org", `${page} JSON-LD does not declare the schema.org context.`]);

  const nodes = data["@graph"] ?? [data];
  const game = nodes.find(node => node["@type"] === "VideoGame");
  const studio = nodes.find(node => node["@type"] === "Organization");

  assertions.push([Boolean(game), `${page} JSON-LD has no VideoGame node.`]);
  assertions.push([Boolean(studio), `${page} JSON-LD has no Organization node.`]);
  if (!game || !studio) continue;

  assertions.push([game.url === canonical, `${page} JSON-LD names ${game.url} while the page is canonical at ${canonical}.`]);

  const description = markup.match(/<meta name="description" content="([^"]*)"/)?.[1];
  assertions.push([
    Boolean(description) && game.description === description,
    `${page} JSON-LD description differs from the page description, so the markup claims something the page does not say.`
  ]);

  const language = markup.match(/<html lang="([^"]+)"/)?.[1];
  assertions.push([game.inLanguage === language, `${page} JSON-LD says inLanguage ${game.inLanguage} while the document is ${language}.`]);

  const imagePath = game.image ? new URL(game.image).pathname.replace(/^\//, "") : "";
  assertions.push([
    imagePath !== "" && fs.existsSync(path.resolve("dist", imagePath)),
    `${page} JSON-LD points at image ${game.image}, which is not in the build.`
  ]);

  // Stopka mowi wprost, ze data premiery nie zostala ogloszona, a platform
  // strona nie oglasza wcale. Dopisanie ich tutaj byloby klamstwem wobec
  // wlasnej tresci, wiec ich brak jest decyzja, nie przeoczeniem.
  for (const forbidden of ["datePublished", "gamePlatform"]) {
    assertions.push([
      !(forbidden in game),
      `${page} JSON-LD declares ${forbidden}, which the page itself never states.`
    ]);
  }

  assertions.push([
    game.author?.["@id"] === studio["@id"],
    `${page} JSON-LD credits an author that is not the Organization node in the same graph.`
  ]);
}

// Druga wersja jezykowa musi byc zgloszona takze Open Graphowi. Komunikatory i
// serwisy spolecznosciowe nie czytaja hreflang, wiec bez tego nie wiedza, ze
// istnieje.
for (const [name, markup] of [["English", english], ["Polish", polish]]) {
  const locale = markup.match(/property="og:locale" content="([^"]+)"/)?.[1];
  const alternate = markup.match(/property="og:locale:alternate" content="([^"]+)"/)?.[1];
  assertions.push([Boolean(alternate), `${name} page does not declare og:locale:alternate.`]);
  assertions.push([locale !== alternate, `${name} page declares og:locale:alternate ${alternate}, the same as its own locale.`]);
}

// PNG sluzy tu wylacznie za znak marki i ikone karty, czyli grafiki o kilku
// barwach i duzej przezroczystosci. Wszystko, co ma gradienty i zdjecia, idzie
// w webp. Zapisany wprost z programu graficznego znak wazyl 37 kB przy
// wyswietlaniu 30 na 30 pikseli i ladowal sie rownolegle z obrazem LCP, wiec
// zabieral mu pasmo. Po kwantyzacji do 256 kolorow schodzi ponizej 9 kB i
// wyglada tak samo. Limit jest z zapasem: lapie ponowny eksport bez optymalizacji,
// a nie drobne roznice miedzy zapisami.
const PNG_BUDGET = 16 * 1024;
const pngFiles = fs
  .readdirSync(path.resolve("dist"), { recursive: true })
  .map(String)
  .filter(name => name.toLowerCase().endsWith(".png"));

assertions.push([pngFiles.length > 0, "No PNG files found in the build, which means this check stopped looking at anything."]);

for (const file of pngFiles) {
  const bytes = fs.statSync(path.resolve("dist", file)).size;
  assertions.push([
    bytes <= PNG_BUDGET,
    `${file.replace(/\\/g, "/")} weighs ${Math.round(bytes / 1024)} kB, over the ${PNG_BUDGET / 1024} kB budget for PNG. Quantise it or use webp.`
  ]);
}

const fontReferences = [...styles.matchAll(/url\(["']?(\/assets\/fonts\/[^"')]+)["']?\)/g)];
assertions.push([
  fontReferences.length > 0,
  "The compiled stylesheet declares no self hosted fonts, so every page would fall back to Georgia."
]);

for (const [, reference] of fontReferences) {
  assertions.push([
    fs.existsSync(path.resolve("dist", reference.replace(/^\//, ""))),
    `The stylesheet points at ${reference}, which is not in the build.`
  ]);
}

// Bez skryptu przelacznik jezyka w panelu menu jest ukryty, a ten w pasku
// chowamy na waskich ekranach. Bez tej reguly strona bez JavaScriptu nie ma na
// telefonie zadnego sposobu zmiany jezyka, co lamie kryterium ukonczenia MVP.
assertions.push([
  /html:not\(\.js\)[^{]*\.language-switcher\s*\{[^}]*display:\s*flex/.test(styles),
  "Without JavaScript the narrow layout would have no language switcher at all."
]);

const failures = assertions.filter(([condition]) => !condition).map(([, message]) => message);

if (failures.length > 0) {
  console.error("Build validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Build validation passed for ${requiredFiles.length} required files.`);
