/* Muzyka w tle calej strony (decyzja Pawla 2026-10-14, wariant A).
   Ten sam utwor co w dylemacie, ale plik jest juz sciszony o 9 dB. iOS
   ignoruje glosnosc ustawiana ze skryptu, wiec tylko tak muzyka brzmi tak samo
   cicho na kazdym urzadzeniu.

   Przegladarki nie wpuszczaja dzwieku, dopoki odwiedzajacy nie kliknie,
   nie dotknie ekranu albo nie nacisnie klawisza. Probujemy zagrac od razu, a
   gdy przegladarka odmowi, czekamy na pierwszy taki gest. Przewijanie gestem
   nie jest, wiec samo przewijanie muzyki nie uruchomi.

   Kazda podstrona laduje sie od nowa, wiec przy wyjsciu zapisujemy miejsce w
   utworze, a nastepna strona zaczyna od niego. Wybor wyciszenia pamietamy na
   stale, zeby kto raz wylaczyl muzyke, nie slyszal jej na kolejnych stronach.

   Ikona pokazuje to, co naprawde slychac. Dopoki przegladarka czeka na gest,
   glosnik jest przekreslony, a klikniecie go wlacza muzyke, zgodnie z ikona. */
(() => {
  const button = document.querySelector("[data-music-toggle]");
  if (!button || typeof Audio === "undefined") return;

  const CHOICE = "aom-music";
  const POSITION = "aom-music-position";
  const GESTURES = ["pointerdown", "pointerup", "keydown", "touchend"];

  const read = (storage, key) => {
    try { return window[storage].getItem(key); } catch { return null; }
  };
  const write = (storage, key, value) => {
    try { window[storage].setItem(key, value); } catch { /* tryb prywatny */ }
  };

  // Przy oszczedzaniu danych nie pobieramy 1,8 MB bez wyraznej prosby.
  const saveData = navigator.connection?.saveData === true;
  const choice = read("localStorage", CHOICE);
  let wanted = choice ? choice === "on" : !saveData;
  let audio = null;
  let fadeTimer = 0;
  let waiting = false;
  let hiddenPause = false;

  const audible = () => Boolean(audio && !audio.paused && wanted);

  const render = () => {
    const on = audible();
    button.setAttribute("aria-pressed", String(on));
    button.title = on ? button.dataset.titlePause : button.dataset.titlePlay;
  };

  const fade = (target, ms, after) => {
    window.clearInterval(fadeTimer);
    const start = audio.volume;
    const steps = Math.max(1, Math.round(ms / 50));
    let step = 0;
    fadeTimer = window.setInterval(() => {
      step += 1;
      try { audio.volume = Math.min(1, Math.max(0, start + (target - start) * (step / steps))); } catch { /* iOS */ }
      if (step >= steps) {
        window.clearInterval(fadeTimer);
        if (after) after();
      }
    }, 50);
  };

  const create = () => {
    audio = new Audio(button.dataset.src);
    audio.loop = true;
    audio.preload = "auto";
    try { audio.volume = 0; } catch { /* iOS */ }
    audio.addEventListener("play", render);
    audio.addEventListener("pause", render);
    // Poprzednia strona zapisala miejsce w utworze. Doliczamy czas ladowania
    // nowej strony, najwyzej trzy sekundy, zeby muzyka szla dalej, a nie
    // cofala sie przy kazdym przejsciu.
    let saved = null;
    try { saved = JSON.parse(read("sessionStorage", POSITION) || "null"); } catch { saved = null; }
    if (saved && Number.isFinite(saved.t)) {
      const elapsed = Math.min(Math.max(0, (Date.now() - saved.at) / 1000), 3);
      audio.addEventListener("loadedmetadata", () => {
        const length = audio.duration;
        if (Number.isFinite(length) && length > 0) {
          try { audio.currentTime = (saved.t + elapsed) % length; } catch { /* zostaje od poczatku */ }
        }
      }, { once: true });
    }
  };

  const onGesture = (event) => {
    // Przycisk obsluguje sie sam. Gdyby i tu ruszyl muzyke, jego klikniecie
    // od razu by ja wylaczylo.
    if (button.contains(event.target)) return;
    stopWaiting();
    play();
  };

  const startWaiting = () => {
    if (waiting) return;
    waiting = true;
    GESTURES.forEach((type) => document.addEventListener(type, onGesture, { capture: true, passive: true }));
  };

  const stopWaiting = () => {
    waiting = false;
    GESTURES.forEach((type) => document.removeEventListener(type, onGesture, { capture: true }));
  };

  const play = () => {
    if (!wanted) return;
    if (!audio) create();
    window.clearInterval(fadeTimer);
    if (audio.paused) {
      try { audio.volume = 0; } catch { /* iOS */ }
    }
    const started = audio.play();
    if (started && started.then) {
      started.then(() => {
        stopWaiting();
        fade(1, 1800);
        render();
      }).catch((error) => {
        // Brak zgody przegladarki to oczekiwany stan, nie blad. Kazdy inny
        // problem, na przyklad nieobslugiwany plik, chowa przycisk.
        if (error && error.name === "NotAllowedError") startWaiting();
        else { stopWaiting(); button.hidden = true; }
      });
    }
  };

  const pause = () => {
    if (!audio || audio.paused) return;
    fade(0, 600, () => audio.pause());
  };

  button.addEventListener("click", () => {
    if (audible()) {
      wanted = false;
      write("localStorage", CHOICE, "off");
      stopWaiting();
      pause();
      // Ikona zmienia sie od razu, nie dopiero po wyciszeniu.
      button.setAttribute("aria-pressed", "false");
      button.title = button.dataset.titlePlay;
    } else {
      wanted = true;
      write("localStorage", CHOICE, "on");
      play();
    }
  });

  // Karta w tle milknie, po powrocie gra dalej.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (audio && !audio.paused) {
        hiddenPause = true;
        window.clearInterval(fadeTimer);
        audio.pause();
      }
    } else if (hiddenPause) {
      hiddenPause = false;
      play();
    }
  });

  window.addEventListener("pagehide", () => {
    if (audio) write("sessionStorage", POSITION, JSON.stringify({ t: audio.currentTime, at: Date.now() }));
  });

  button.hidden = false;
  render();
  // Muzyka nie konkuruje z obrazami i stylami o pierwsze sekundy ladowania.
  if (wanted) {
    if (document.readyState === "complete") play();
    else window.addEventListener("load", play, { once: true });
  }
})();
