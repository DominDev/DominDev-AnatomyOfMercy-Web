const root = document.documentElement;
const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");

/* ------------------------------------------------------------------ intro */
/* Sekwencja wejscia odtwarza sie przy kazdym wczytaniu strony. Jest czescia
   doswiadczenia, nie ekranem ladowania, dlatego nie zapamietujemy, ze widzial
   ja juz ten sam odwiedzajacy. Przy ograniczonym ruchu znika calkowicie. */
const preloader = document.querySelector("[data-preloader]");
const preloaderStatus = document.querySelector("[data-preloader-status]");
const skipIntro = document.querySelector("[data-intro-skip]");

if (preloader && skipIntro) {
  const regions = [...document.querySelectorAll(".site-header, #main-content, .site-footer, .skip-link")];
  const statuses = preloaderStatus
    ? [preloaderStatus.dataset.statusOne, preloaderStatus.dataset.statusTwo, preloaderStatus.dataset.statusThree]
    : [];
  let timers = [];
  let running = false;
  let leaving = false;
  let onPageLoad = null;

  const finish = (immediate = false) => {
    if (!running || leaving) return;
    leaving = true;
    timers.forEach(window.clearTimeout);
    timers = [];
    window.clearTimeout(window.aomIntroFailsafe);
    if (onPageLoad) window.removeEventListener("load", onPageLoad);
    const release = () => {
      preloader.hidden = true;
      preloader.setAttribute("aria-hidden", "true");
      root.classList.remove("intro-pending");
      regions.forEach(node => {
        node.inert = false;
        node.removeAttribute("data-intro-inert");
      });
      running = false;
      leaving = false;
      if (preloader.contains(document.activeElement)) {
        document.querySelector("#main-content")?.focus({ preventScroll: true });
      }
    };
    if (immediate || motionPreference.matches) release();
    else {
      preloader.classList.add("preloader--leaving");
      timers.push(window.setTimeout(release, 1000));
    }
  };

  const start = () => {
    if (running) return;
    if (motionPreference.matches) {
      preloader.hidden = true;
      root.classList.remove("intro-pending");
      return;
    }
    running = true;
    leaving = false;
    window.clearTimeout(window.aomIntroFailsafe);
    preloader.hidden = false;
    preloader.classList.remove("preloader--leaving");
    preloader.setAttribute("aria-hidden", "false");
    root.classList.add("intro-pending");
    regions.forEach(node => {
      node.inert = true;
      node.setAttribute("data-intro-inert", "");
    });
    if (preloaderStatus) preloaderStatus.textContent = statuses[0];
    skipIntro.focus({ preventScroll: true });
    statuses.slice(1).forEach((text, index) => {
      timers.push(window.setTimeout(() => {
        if (preloaderStatus && text) preloaderStatus.textContent = text;
      }, (index + 1) * 1500));
    });
    let minimumElapsed = false;
    let pageReady = document.readyState === "complete";
    onPageLoad = () => {
      pageReady = true;
      if (minimumElapsed) finish();
    };
    if (!pageReady) window.addEventListener("load", onPageLoad, { once: true });
    timers.push(window.setTimeout(() => {
      minimumElapsed = true;
      if (pageReady) finish();
    }, 4200));
    // Atmosfera nie moze uwiezic odwiedzajacego na wolnym laczu.
    timers.push(window.setTimeout(() => finish(), 6500));
  };

  skipIntro.addEventListener("click", () => finish(true));
  document.addEventListener("keydown", event => {
    if (!running) return;
    if (event.key === "Escape") finish(true);
    // Wejscie ma jedna kontrolke. Fokus zostaje na przycisku pominiecia.
    if (event.key === "Tab") {
      event.preventDefault();
      skipIntro.focus({ preventScroll: true });
    }
  });
  motionPreference.addEventListener("change", () => {
    if (motionPreference.matches) finish(true);
  });
  if (root.classList.contains("intro-pending")) start();
  else preloader.hidden = true;
}

/* ----------------------------------------------------------------- header */
const header = document.querySelector("[data-site-header]");
const menuButton = document.querySelector("[data-menu-button]");
const navigation = document.querySelector("[data-navigation]");
const menuLabel = document.querySelector("[data-menu-label]");

if (header && menuButton && navigation && menuLabel) {
  // Tresc pod nakladka nie moze byc osiagalna klawiszem Tab.
  const behind = [...document.querySelectorAll("#main-content, .site-footer, .skip-link, .to-top")];
  const setMenuState = isOpen => {
    header.classList.toggle("site-header--menu-open", isOpen);
    // Strona pod nakladka nie moze sie przewijac.
    document.body.classList.toggle("menu-open", isOpen);
    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuLabel.textContent = isOpen ? menuLabel.dataset.closeLabel : menuLabel.dataset.openLabel;
    behind.forEach(node => { node.inert = isOpen; });
    if (isOpen) {
      // Panel staje sie widoczny dopiero po przeliczeniu stylow, a przy
      // przejsciu na widocznosc moze to potrwac do konca animacji. Probujemy
      // w nastepnej klatce i jeszcze raz po zakonczeniu przejscia.
      const focusFirst = () => navigation.querySelector("a")?.focus({ preventScroll: true });
      window.requestAnimationFrame(() => {
        focusFirst();
        if (!navigation.contains(document.activeElement)) window.setTimeout(focusFirst, 340);
      });
    }
  };
  const isOpen = () => menuButton.getAttribute("aria-expanded") === "true";

  menuButton.addEventListener("click", () => setMenuState(!isOpen()));
  navigation.addEventListener("click", event => {
    if (event.target.closest("a")) setMenuState(false);
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && isOpen()) {
      setMenuState(false);
      menuButton.focus();
    }
  });
  window.addEventListener("resize", () => {
    if (window.matchMedia("(min-width: 64rem)").matches && isOpen()) setMenuState(false);
  });

  const updateHeader = () => header.classList.toggle("site-header--scrolled", window.scrollY > 32);
  window.addEventListener("scroll", updateHeader, { passive: true });
  updateHeader();

  if ("IntersectionObserver" in window) {
    // Odnosniki sekcji zawieraja teraz takze adres strony glownej, bo ten sam
    // pasek stoi na podstronach. Dlatego szukamy kotwicy w srodku adresu, a nie
    // na jego poczatku, i porownujemy przez `hash`, ktory obcina reszte.
    const links = [...navigation.querySelectorAll('a[href*="#"]')];
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        links.forEach(link => {
          if (link.hash === "#" + entry.target.id) link.setAttribute("aria-current", "location");
          else link.removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-15% 0px -55% 0px" });
    document.querySelectorAll("main section[id]").forEach(section => observer.observe(section));
  }
}

/* ------------------------------------------------------------ pojawianie */
/* Elementy z `data-reveal` dostaja klase przy wejsciu w widok. Style dzialaja
   tylko z klasa `js`, wiec bez skryptu wszystko jest widoczne od razu, a przy
   ograniczonym ruchu style same wylaczaja przesuniecie. Bez obserwatora
   pokazujemy wszystko natychmiast. */
const revealTargets = [...document.querySelectorAll("[data-reveal]")];
if (revealTargets.length > 0) {
  const showAll = () => revealTargets.forEach(node => node.classList.add("is-visible"));
  if ("IntersectionObserver" in window && !motionPreference.matches) {
    const revealer = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -10% 0px" });
    revealTargets.forEach(node => revealer.observe(node));
    // Ukryta tresc jest gorsza niz brak animacji. Jesli obserwator z jakiegos
    // powodu nie zadziala, na przyklad w oknie, ktore nie maluje, wszystko
    // i tak pokazuje sie po chwili. Elementy juz odsloniete nic nie traca.
    window.setTimeout(showAll, 2500);
  } else {
    showAll();
  }
}

/* ------------------------------------------------------------- powrot gory */
/* Przycisk pojawia sie po opuszczeniu pierwszego ekranu i zatrzymuje sie tuz
   nad stopka, zamiast ja zaslaniac. */
const toTop = document.querySelector("[data-to-top]");
const footer = document.querySelector(".site-footer");

if (toTop) {
  // Odstep przycisku od gornej krawedzi stopki ma byc taki sam jak jego odstep
  // od linii ramy. Ramka jest odsunieta od okna o wlasny margines, wiec o tyle
  // samo skracamy przesuniecie.
  const pageFrame = document.querySelector(".page-frame");
  const frameInset = () => (pageFrame ? Math.round(pageFrame.getBoundingClientRect().left) : 0);
  // Na telefonie stopka zajmuje niemal cale okno, wiec podjezdzanie nad nia
  // zostawialo przycisk w pustym polu nad trescia. Tam zostaje zwyczajnie
  // przypiety do rogu.
  const anchorsToFooter = window.matchMedia("(min-width: 48rem)");
  let queued = false;
  const update = () => {
    queued = false;
    toTop.classList.toggle("to-top--visible", window.scrollY > window.innerHeight * 0.9);
    if (!footer || !anchorsToFooter.matches) {
      toTop.style.transform = "";
      return;
    }
    const overlap = window.innerHeight - footer.getBoundingClientRect().top - frameInset();
    toTop.style.transform = overlap > 0 ? `translateY(${-Math.round(overlap)}px)` : "";
  };
  const schedule = () => {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(update);
  };
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  anchorsToFooter.addEventListener("change", schedule);
  toTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: motionPreference.matches ? "auto" : "smooth" });
  });
  update();
}
