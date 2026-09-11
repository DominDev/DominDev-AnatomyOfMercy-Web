import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

// Polityka bezpieczenstwa tresci nie moze dopuszczac dowolnych skryptow
// osadzonych w HTML, bo wtedy nie chroni przed niczym. Zamiast tego podajemy
// skrot jedynego takiego skryptu. Skrot liczymy z tego samego pliku, ktory
// uklad wstawia do strony, wiec nie da sie zmienic jednego bez drugiego.
const bootstrapPath = path.resolve("src/_includes/partials/intro-bootstrap.js");
const bootstrap = fs.readFileSync(bootstrapPath, "utf8");

// Przegladarka liczy skrot z dokladnej zawartosci elementu script, znak w znak.
// Dlatego uklad wstawia ten plik bezposrednio miedzy znaczniki, bez zadnych
// odstepow dookola, a tutaj liczymy skrot z niezmienionej zawartosci pliku.
const digest = crypto.createHash("sha256").update(bootstrap, "utf8").digest("base64");

export default {
  scriptHash: `sha256-${digest}`
};
