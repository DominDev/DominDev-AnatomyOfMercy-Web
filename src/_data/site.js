// Adres kanoniczny musi opisywac wdrozenie, na ktorym strona naprawde stoi.
// Przy adresie zaszytym na sztywno wdrozenie podgladowe podawalo domene
// produkcyjna w kanonicznym, w og:url, w og:image i w trzech hreflangach, wiec
// podgladu linku nie dalo sie na nim sprawdzic, a to jest kryterium ukonczenia
// MVP. Adres bierzemy ze zmiennej srodowiskowej, ktora ustawiamy w ustawieniach
// projektu Workers Builds. Brak zmiennej oznacza wydanie produkcyjne.
const productionUrl = "https://anatomyofmercy.com";

function resolveUrl() {
  const raw = (process.env.SITE_URL ?? "").trim();
  if (raw === "") {
    return productionUrl;
  }

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`SITE_URL is not a valid absolute URL: ${raw}`);
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(`SITE_URL must use http or https: ${raw}`);
  }

  // Bez koncowego ukosnika, poniewaz szablony doklejaja sciezke zaczynajaca sie
  // od ukosnika. Inaczej w kanonicznym powstalby podwojny ukosnik.
  return `${parsed.origin}${parsed.pathname}`.replace(/\/+$/, "");
}

const url = resolveUrl();

export default {
  name: "Anatomy of Mercy",
  tagline: "Every cure leaves a scar.",
  url,
  productionUrl,
  // Wydanie inne niz produkcyjne nie moze trafic do wyszukiwarek, bo od teraz
  // wskazuje samo siebie jako adres kanoniczny. Sterujemy tym w robots.txt.
  isProduction: url === productionUrl,
  email: "contact@anatomyofmercy.com",
  studioUrl: "https://domindev.com",
  year: 2026
};
