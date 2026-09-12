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

// Galaz produkcyjna ustawiona w Workers Builds. Wpisana tutaj, bo od niej zalezy,
// czy wydanie wolno oddac wyszukiwarkom.
const productionBranch = "main";

// Wydanie podgladowe rozpoznajemy po zmiennych, ktore Workers Builds ustawia
// samo: `WORKERS_CI` rowne "1" oznacza build na ich maszynie, a
// `WORKERS_CI_BRANCH` podaje galaz.
//
// Wczesniej te role pelnila zmienna `SITE_URL` z panelu, ale przy podpieciu
// domeny musiala zniknac, inaczej produkcja podawalaby adres podgladu jako
// kanoniczny. Bez tego rozpoznania build z galezi roboczej dostawalby
// `robots.txt` z `Allow`, czyli zaproszenie do zaindeksowania kopii produkcji
// pod innym adresem. Dopoki cala strona byla zablokowana, nie mialo to
// znaczenia. Od chwili otwarcia jej dla robotow ma.
//
// Build lokalny nie ustawia zadnej z tych zmiennych i jest traktowany jak
// produkcyjny. Tak wlasnie sprawdzamy wynik produkcyjny przed wypchnieciem.
const ciBranch = (process.env.WORKERS_CI_BRANCH ?? "").trim();
const onWorkersBuilds = process.env.WORKERS_CI === "1";
const previewBranch = onWorkersBuilds && ciBranch !== "" && ciBranch !== productionBranch;

export default {
  name: "Anatomy of Mercy",
  tagline: "Every cure leaves a scar.",
  url,
  productionUrl,
  // Wydanie inne niz produkcyjne nie moze trafic do wyszukiwarek. Dwa powody
  // wykluczaja je niezaleznie: wlasny adres podany w `SITE_URL` albo build z
  // galezi innej niz produkcyjna. Sterujemy tym w `robots.txt` oraz naglowkiem
  // `X-Robots-Tag`, bo pierwszy dziala tylko wtedy, gdy robot go przeczyta.
  isProduction: url === productionUrl && !previewBranch,
  email: "contact@anatomyofmercy.com",
  studioUrl: "https://domindev.com",
  year: 2026
};
