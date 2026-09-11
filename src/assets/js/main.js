const root = document.documentElement;
const preloader = document.querySelector("[data-preloader]");
const preloaderStatus = document.querySelector("[data-preloader-status]");
const skipIntro = document.querySelector("[data-intro-skip]");
const replayIntro = document.querySelector("[data-intro-replay]");
const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");

if (preloader && skipIntro) {
  const regions = [...document.querySelectorAll(".site-header, #main-content, .site-footer, .skip-link")];
  const statuses = preloaderStatus
    ? [preloaderStatus.dataset.statusOne, preloaderStatus.dataset.statusTwo, preloaderStatus.dataset.statusThree]
    : [];
  let timers = [];
  let running = false;
  let leaving = false;
  let restoreFocus = null;
  let onPageLoad = null;

  const rememberIntro = () => {
    try { window.sessionStorage.setItem("aom-intro-v2-seen", "true"); } catch {}
  };
  const finish = (immediate = false) => {
    if (!running || leaving) return;
    leaving = true;
    timers.forEach(window.clearTimeout);
    timers = [];
    window.clearTimeout(window.aomIntroFailsafe);
    if (onPageLoad) window.removeEventListener("load", onPageLoad);
    rememberIntro();
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
        (restoreFocus || document.querySelector("#main-content"))?.focus({ preventScroll: true });
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
      rememberIntro();
      return;
    }
    running = true;
    leaving = false;
    restoreFocus = document.activeElement === replayIntro ? replayIntro : null;
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
    // Atmosphere must never trap the visitor on a slow connection.
    timers.push(window.setTimeout(() => finish(), 6000));
  };

  skipIntro.addEventListener("click", () => finish(true));
  replayIntro?.addEventListener("click", start);
  document.addEventListener("keydown", event => {
    if (!running) return;
    if (event.key === "Escape") finish(true);
    // The entrance has a single control. Keep keyboard focus on its skip button.
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

const header = document.querySelector("[data-site-header]");
const menuButton = document.querySelector("[data-menu-button]");
const navigation = document.querySelector("[data-navigation]");
const menuLabel = document.querySelector("[data-menu-label]");

if (header && menuButton && navigation && menuLabel) {
  const setMenuState = isOpen => {
    header.classList.toggle("site-header--menu-open", isOpen);
    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuLabel.textContent = isOpen ? menuLabel.dataset.closeLabel : menuLabel.dataset.openLabel;
  };
  menuButton.addEventListener("click", () => {
    setMenuState(menuButton.getAttribute("aria-expanded") !== "true");
  });
  navigation.addEventListener("click", event => {
    if (event.target.closest("a")) setMenuState(false);
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && menuButton.getAttribute("aria-expanded") === "true") {
      setMenuState(false);
      menuButton.focus();
    }
  });
  window.addEventListener("resize", () => {
    if (window.matchMedia("(min-width: 64rem)").matches) setMenuState(false);
  });
  const updateHeader = () => header.classList.toggle("site-header--scrolled", window.scrollY > 32);
  window.addEventListener("scroll", updateHeader, { passive: true });
  updateHeader();
  if ("IntersectionObserver" in window) {
    const links = [...navigation.querySelectorAll('a[href^="#"]')];
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
