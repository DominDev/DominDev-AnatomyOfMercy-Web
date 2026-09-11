import fs from "node:fs";
import path from "node:path";

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
  [english.includes('https://anatomyofmercy.com/'), "English canonical URL is missing."],
  [polish.includes('https://anatomyofmercy.com/pl/'), "Polish canonical URL is missing."]
];

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
    const local = image[1].replace("https://anatomyofmercy.com", "");
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

const failures = assertions.filter(([condition]) => !condition).map(([, message]) => message);

if (failures.length > 0) {
  console.error("Build validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Build validation passed for ${requiredFiles.length} required files.`);
