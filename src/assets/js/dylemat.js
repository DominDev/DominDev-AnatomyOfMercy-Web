// Interaktywny dylemat "Swiatlo pod popiolem" (/pl/dylemat/). Prowadzi gracza
// przez wstep, rozdzialy i sceny opowiadane zdanie po zdaniu, pozwala wybierac
// kwestie jak w grze fabularnej, po kazdym wyborze pyta o jego trudnosc,
// pokazuje tylko konsekwencje wlasnej drogi i na koncu wysyla anonimowy wynik
// do /api/dylemat. Tresc pochodzi z JSON osadzonego w stronie
// (src/_data/dylemat.js).
(() => {
  "use strict";

  const data = JSON.parse(document.getElementById("dylemat-data").textContent);
  const stage = document.getElementById("dylemat");
  const chapterLabel = document.querySelector("[data-chapter]");
  const soundButton = document.querySelector("[data-sound]");
  const introAudio = document.querySelector("[data-audio-intro]");
  const ambientAudio = document.querySelector("[data-audio-ambient]");
  const voice = document.querySelector("[data-audio-voice]");
  const narratorButton = document.querySelector("[data-narrator]");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const DONE_KEY = "aom-dylemat-done";
  const ATTEMPTS_KEY = "aom-dylemat-attempts";

  // Stan jednej proby. Czas liczymy dla kazdego ekranu osobno, a czas decyzji
  // od pierwszej karty drogi do wybrania kwestii. Trudnosc kazdego wyboru
  // gracz ocenia od razu po nim.
  const fresh = () => ({
    path: null, returnMode: null, lucja: null, objection: null, finalPath: null,
    difficulty: null, difficultyReturn: null, difficultyLucja: null, difficultyObjection: null,
    timings: {}, infoOpens: {}, decisionStart: null, decisionMs: null
  });
  let state = fresh();
  // Ile przejsc tej wersji tresci ta przegladarka juz zapisala. Kazde
  // kolejne tez trafia do bazy, z numerem podejscia; statystyki i ocena testu
  // licza tylko pierwsze.
  let attempts = readAttempts();
  let current = null;
  let shownAt = 0;
  let busy = false;
  let keyHandler = null;
  let chapterShown = null;
  // Ekrany juz opowiedziane: po powrocie do nich tekst stoi od razu.
  const told = new Set();
  const timers = new Set();

  function readDone() {
    try { return localStorage.getItem(DONE_KEY); } catch { return null; }
  }

  function readAttempts() {
    try {
      const [version, count] = (localStorage.getItem(ATTEMPTS_KEY) || "").split(":");
      if (version === data.version && Number(count) > 0) return Number(count);
    } catch { /* prywatne okno: bez pamieci */ }
    // Wczesniejsza wersja strony zapisywala tylko znacznik pierwszego przejscia.
    return readDone() === data.version ? 1 : 0;
  }

  function writeAttempts() {
    try {
      localStorage.setItem(ATTEMPTS_KEY, data.version + ":" + attempts);
      localStorage.setItem(DONE_KEY, data.version);
    } catch { /* prywatne okno: bez pamieci */ }
  }

  function later(fn, ms) {
    const id = setTimeout(() => { timers.delete(id); fn(); }, ms);
    timers.add(id);
    return id;
  }

  // Grupa minutnikow jednego ekranu, ktora mozna anulowac osobno (np. tempo
  // tekstu po wylaczeniu lektora). Zmiana ekranu i tak czysci wszystkie.
  function timerGroup() {
    const ids = new Set();
    return {
      add: (fn, ms) => { ids.add(later(fn, ms)); },
      stop: () => { ids.forEach((id) => { clearTimeout(id); timers.delete(id); }); ids.clear(); }
    };
  }

  function clearTimers() {
    timers.forEach(clearTimeout);
    timers.clear();
  }

  function track(nextId) {
    const now = performance.now();
    if (current) state.timings[current] = (state.timings[current] || 0) + Math.round(now - shownAt);
    current = nextId;
    shownAt = now;
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  const fill = (template, values) => template.replace(/\{(\w+)\}/g, (_, key) => values[key]);

  function button(label, onClick, className) {
    const b = el("button", className || "button", label);
    b.type = "button";
    b.addEventListener("click", () => { if (!busy) onClick(); });
    return b;
  }

  function preload(src) {
    if (src) { const image = new Image(); image.src = src; }
  }

  // Wymiana ekranu: stary gasnie, nowy wchodzi. W trakcie przejscia klikniecia
  // i klawisze sa ignorowane, zeby nie przeskoczyc dwoch wyborow naraz.
  function swap(id, build) {
    track(id);
    busy = true;
    keyHandler = null;
    clearTimers();
    // Lektor milknie przy kazdej zmianie ekranu: nigdy nie czyta karty, ktorej
    // juz nie widac.
    hush();
    const old = stage.firstElementChild;
    const delay = old && old.tagName !== "NOSCRIPT" && !reduced.matches ? 320 : 0;
    if (old) old.classList.add("is-leaving");
    const render = () => {
      const view = build();
      stage.replaceChildren(view);
      window.scrollTo(0, 0);
      const focus = view.querySelector("[data-focus]") || view;
      focus.tabIndex = -1;
      focus.focus({ preventScroll: true });
      busy = false;
      if (view.narrate) view.narrate();
    };
    if (delay) later(render, delay); else render();
  }

  function setChapter(roman) {
    chapterLabel.textContent = roman ? roman + ". " + data.chapters[roman] : "";
  }

  // Plansza rozdzialu: krotka pauza miedzy czesciami opowiesci. Znika sama
  // albo po kliknieciu czy nacisnieciu klawisza.
  function enterChapter(roman, then) {
    setChapter(roman);
    if (chapterShown === roman) { then(); return; }
    chapterShown = roman;
    let done = false;
    const go = () => { if (!done) { done = true; then(); } };
    swap("chapters", () => {
      const view = el("section", "dylemat__chapter-card");
      view.append(
        el("p", "dylemat__chapter-word", data.chapterWord),
        el("p", "dylemat__chapter-number", roman),
        el("h1", "dylemat__chapter-name", data.chapters[roman])
      );
      view.lastChild.dataset.focus = "";
      view.addEventListener("click", () => { if (!busy) go(); });
      later(() => { keyHandler = () => go(); }, 50);
      // Z lektorem plansza czeka, az przeczyta nazwe rozdzialu.
      view.narrate = () => {
        const spoken = say([{ id: "chapter-" + roman }], { done: () => later(go, 700), onPause: () => later(go, 1200) });
        later(go, spoken ? 9000 : reduced.matches ? 1600 : 3000);
      };
      return view;
    });
  }

  // ---------------------------------------------------------------- Narracja

  // Podzial akapitu na zdania. Granica to znak konca zdania, ewentualnie z
  // cudzyslowem lub zamknieciem znacznika, potem odstep i wielka litera albo
  // otwarcie cytatu czy znacznika.
  const SENTENCE = /(?<=[.!?…](?:”|<\/strong>|<\/em>)*)\s+(?=[„"A-ZĄĆĘŁŃÓŚŹŻ<])/u;

  // Tekst scen pochodzi z naszego buildu (nie od uzytkownika) i zawiera tylko
  // <strong> i <em>, dlatego wolno go wstawic jako HTML.
  function prose(paragraphs) {
    const box = el("div", "dylemat__prose");
    paragraphs.forEach((html) => {
      const p = el("p", "dylemat__text");
      html.split(SENTENCE).forEach((part, i) => {
        if (i) p.append(" ");
        const span = el("span", "dylemat__sentence");
        span.innerHTML = part;
        p.append(span);
      });
      box.append(p);
    });
    return box;
  }

  const plain = (node) => node.textContent.length;

  // Bez lektora tempo czytania: krotkie zdanie niecala sekunde, dlugie
  // najwyzej dwie, z krotka pauza przed akapitem i wyroznieniem; tekst
  // wyprzedza czytelnika tylko o krok. Z lektorem kazde zdanie wchodzi w chwili,
  // gdy lektor je zaczyna, wedlug znacznikow czasu z manifestu nagran.
  function narrate(view, id, sentences, after, keys, voiceIds, voiceAfter) {
    let finished = false;
    let skippable = false;
    const pace = timerGroup();
    const firstHidden = () => sentences.findIndex((s) => !s.classList.contains("is-on"));
    // Po naturalnym koncu przyciski czekaja chwile, zeby ostatnie zdanie
    // wybrzmialo; po pominieciu pojawiaja sie od razu.
    const finish = (natural) => {
      if (finished) return;
      finished = true;
      if (currentFinish === finish) currentFinish = null;
      pace.stop();
      sentences.forEach((s) => s.classList.add("is-on"));
      view.classList.remove("is-telling");
      told.add(id);
      keyHandler = null;
      later(() => {
        after.classList.add("is-on");
        keyHandler = keys || null;
      }, natural === true && sentences.length ? 1500 : 250);
    };
    currentFinish = finish;
    const allowSkip = () => {
      if (skippable) return;
      skippable = true;
      view.classList.add("is-telling");
      view.addEventListener("click", (event) => {
        if (!finished && !event.target.closest("button")) finish(false);
      });
      keyHandler = (event) => {
        if (event.key === " " || event.key === "Enter" || event.key === "ArrowRight") {
          event.preventDefault();
          finish(false);
        }
      };
    };
    // Tempo bez lektora, od pierwszego nieodslonietego zdania: tak samo na
    // starcie i po wylaczeniu lektora w polowie ekranu.
    const timed = () => {
      if (finished) return;
      pace.stop();
      const from = firstHidden();
      if (from === -1 || (reduced.matches && from === 0)) { finish(true); return; }
      allowSkip();
      let at = 500;
      let paragraph = null;
      sentences.slice(from).forEach((s) => {
        if (paragraph && s.parentNode !== paragraph) at += 350;
        if (s.querySelector("strong")) at += 300;
        paragraph = s.parentNode;
        pace.add(() => s.classList.add("is-on"), at);
        at += Math.min(1900, Math.max(800, 350 + plain(s) * 14));
      });
      pace.add(() => finish(true), at);
    };
    if (told.has(id)) { finish(false); return; }

    // Nagrania musza pokrywac dokladnie te zdania, ktore sa na ekranie;
    // inaczej ekran idzie bez lektora, zamiast czytac cos innego niz widac.
    if (narrator.on && voiceIds && voiceIds.length) {
      const items = [];
      let offset = 0;
      for (const voiceId of voiceIds) {
        const clip = clipOf(voiceId);
        if (!clip) { items.length = 0; break; }
        const base = offset;
        items.push({ id: voiceId, base, onMark: (i) => { if (sentences[base + i]) sentences[base + i].classList.add("is-on"); } });
        offset += clip.marks.length;
      }
      if (items.length && offset === sentences.length) {
        items[items.length - 1].onEnd = () => finish(true);
        (voiceAfter || []).forEach((voiceId) => items.push({ id: voiceId }));
        allowSkip();
        // Po ponownym wlaczeniu lektor wraca do pierwszego zdania, ktorego
        // jeszcze nie widac, o ile lezy w biezacym nagraniu.
        const resume = (session) => {
          pace.stop();
          const next = firstHidden();
          const item = session.item;
          if (next === -1 || !item || !item.onMark) return;
          const local = next - item.base;
          if (local >= 0 && local < clipOf(item.id).marks.length) session.seek(local);
        };
        if (say(items, { fail: timed, onPause: timed, onResume: resume })) return;
      }
    }
    timed();
  }

  // Scena: obraz z powolnym najazdem kamery, tytul i tekst odslaniany zdanie
  // po zdaniu. Wybory i przyciski pojawiaja sie dopiero po calym tekscie.
  function scene(opts) {
    const view = el("article", "dylemat__scene" + (opts.image ? "" : " dylemat__scene--plain"));
    if (opts.image) {
      const figure = el("figure", "dylemat__art");
      const image = el("img");
      image.src = opts.image;
      image.alt = "";
      image.decoding = "async";
      if (opts.focus) image.style.objectPosition = opts.focus;
      figure.append(image);
      view.append(figure);
    }
    const body = el("div", "dylemat__body");
    const head = [];
    if (opts.tag) head.push(el("p", "dylemat__tag", opts.tag));
    const heading = el("h1", "dylemat__title", opts.title || "");
    heading.dataset.focus = "";
    head.push(heading);
    head.forEach((node, i) => {
      node.classList.add("dylemat__reveal");
      node.style.setProperty("--i", i);
      body.append(node);
    });
    // Podpowiedz stoi pod tytulem, tam gdzie gracz patrzy na poczatku sceny.
    body.append(el("p", "dylemat__skiphint", data.skipHint));
    let sentences = [];
    if (opts.text && opts.text.length) {
      const box = prose(opts.text);
      sentences = [...box.querySelectorAll(".dylemat__sentence")];
      body.append(box);
    }
    const after = el("div", "dylemat__after");
    const extra = opts.extra || [];
    extra.forEach((node) => after.append(node));
    if (opts.actions && opts.actions.length) {
      const actions = el("div", "dylemat__actions" + (opts.stackActions ? " dylemat__actions--stack" : ""));
      actions.append(...opts.actions);
      after.append(actions);
    }
    body.append(after);
    view.append(body);
    const keys = extra.map((node) => node.keys).find(Boolean);
    view.narrate = () => narrate(view, opts.id, sentences, after, keys, opts.voice, opts.voiceAfter);
    preload(opts.next);
    return view;
  }

  // Kwestie dialogowe. Obok kazdej ikona i z krotkim przypomnieniem ceny;
  // otwarte moze byc tylko jedno naraz, zeby strona nie rosla. Ile razy gracz
  // zajrzal do przypomnien, zapisujemy jako sygnal wahania.
  function choices(options, group, onPick) {
    const list = el("ol", "dylemat__choices");
    const close = (except) => {
      list.querySelectorAll(".dylemat__info").forEach((info) => {
        if (info === except) return;
        info.setAttribute("aria-expanded", "false");
        document.getElementById(info.getAttribute("aria-controls")).hidden = true;
      });
    };
    options.forEach((option, i) => {
      const item = el("li", "dylemat__option");
      const pick = button("", () => onPick(option.value), "dylemat__choice");
      pick.append(el("span", "dylemat__key", String(i + 1)), el("span", "dylemat__line", option.label));
      item.append(pick);
      if (option.info) {
        const panelId = "info-" + group + "-" + option.value;
        const info = el("button", "dylemat__info", "i");
        info.type = "button";
        info.setAttribute("aria-expanded", "false");
        info.setAttribute("aria-controls", panelId);
        info.setAttribute("aria-label", "Co oznacza ta odpowiedź: " + option.label);
        const panel = el("p", "dylemat__infopanel", option.info);
        panel.id = panelId;
        panel.hidden = true;
        info.addEventListener("click", () => {
          const open = panel.hidden;
          close(info);
          panel.hidden = !open;
          info.setAttribute("aria-expanded", String(open));
          if (open) {
            const key = group + ":" + option.value;
            state.infoOpens[key] = (state.infoOpens[key] || 0) + 1;
          }
        });
        item.append(info, panel);
      }
      list.append(item);
    });
    list.keys = (event) => {
      const n = Number(event.key);
      if (Number.isInteger(n) && n >= 1 && n <= options.length) onPick(options[n - 1].value);
    };
    return list;
  }

  function hint() {
    return el("p", "dylemat__hint", data.hint);
  }

  // Skala 1-5 jako piec przyciskow z opisanymi koncami.
  function scale(spec, onPick) {
    const wrap = el("div", "dylemat__scale");
    const row = el("div", "dylemat__scale-row");
    for (let n = 1; n <= 5; n += 1) {
      const b = button(String(n), () => onPick(n), "dylemat__scale-step");
      b.setAttribute("aria-label", n + " z 5");
      row.append(b);
    }
    const ends = el("div", "dylemat__scale-ends");
    ends.append(el("span", "", "1 " + spec.low), el("span", "", spec.high + " 5"));
    wrap.append(row, ends);
    wrap.keys = (event) => {
      const n = Number(event.key);
      if (Number.isInteger(n) && n >= 1 && n <= 5) onPick(n);
    };
    return wrap;
  }

  // ---------------------------------------------------------------- Dzwiek

  // Muzyka gra tylko po wyraznym wyborze gracza. Najpierw utwor wstepu, po
  // nim zapetlone tlo. Plik wstepu zaczyna sie od okolo dwoch sekund
  // ciszy i sam narasta, dlatego startujemy dalej i bez dlugiego wyciszenia.
  const INTRO_START = 2;
  const sound = { on: false, track: introAudio || ambientAudio, fades: new Map() };
  const VOLUME = new Map([[introAudio, 0.6], [ambientAudio, 0.35]]);
  const FADE_IN = new Map([[introAudio, 300], [ambientAudio, 2500]]);

  function fade(audio, target, ms, after) {
    clearInterval(sound.fades.get(audio));
    const start = audio.volume;
    const steps = Math.max(1, Math.round(ms / 50));
    let step = 0;
    const id = setInterval(() => {
      step += 1;
      try { audio.volume = Math.min(1, Math.max(0, start + (target - start) * (step / steps))); } catch { /* iOS */ }
      if (step >= steps) {
        clearInterval(id);
        sound.fades.delete(audio);
        if (after) after();
      }
    }, 50);
    sound.fades.set(audio, id);
  }

  function soundFailed() {
    sound.on = false;
    if (soundButton) {
      soundButton.textContent = "Muzyka niedostępna";
      soundButton.disabled = true;
      soundButton.setAttribute("aria-pressed", "false");
    }
  }

  function startTrack(audio) {
    if (!audio) return;
    try { audio.volume = 0; } catch { /* iOS */ }
    if (audio === introAudio && audio.currentTime < INTRO_START) {
      try { audio.currentTime = INTRO_START; } catch { /* metadane jeszcze nie wczytane */ }
    }
    const playing = audio.play();
    if (playing && playing.catch) playing.catch(soundFailed);
    fade(audio, level(audio), FADE_IN.get(audio));
  }

  // Pod glosem lektora muzyka schodzi do okolo jednej trzeciej.
  const level = (audio) => VOLUME.get(audio) * (narrator.speaking ? 0.35 : 1);

  function duck(speaking) {
    if (narrator.speaking === speaking) return;
    narrator.speaking = speaking;
    if (sound.on && sound.track && !sound.track.paused) fade(sound.track, level(sound.track), 700);
  }

  function stopTrack(audio, ms) {
    if (audio) fade(audio, 0, ms, () => audio.pause());
  }

  function setSound(on) {
    if (!soundButton || !sound.track) return;
    sound.on = on;
    soundButton.hidden = false;
    soundButton.setAttribute("aria-pressed", String(on));
    soundButton.textContent = on ? "Muzyka: wł." : "Muzyka: wył.";
    if (on) startTrack(sound.track);
    else stopTrack(sound.track, 800);
  }

  // Nowe przejscie zaczyna muzyke od wstepu, tak jak za pierwszym razem.
  function rewindSound() {
    if (!introAudio) return;
    const previous = sound.track;
    sound.track = introAudio;
    if (previous && previous !== introAudio) stopTrack(previous, 1200);
    try { introAudio.currentTime = INTRO_START; } catch { /* metadane jeszcze nie wczytane */ }
    if (sound.on) startTrack(introAudio);
  }

  if (introAudio && ambientAudio) {
    introAudio.addEventListener("ended", () => {
      sound.track = ambientAudio;
      if (sound.on) startTrack(ambientAudio);
    });
  }

  if (soundButton) {
    soundButton.addEventListener("click", () => setSound(!sound.on));
  }

  // Karta w tle: muzyka i lektor milkna, a po powrocie graja dalej.
  document.addEventListener("visibilitychange", () => {
    if (voice && narrator.on && narrator.current && !narrator.suspended) {
      if (document.hidden) voice.pause();
      else voice.play().catch(() => {});
    }
    if (!sound.on || !sound.track) return;
    if (document.hidden) sound.track.pause();
    else startTrack(sound.track);
  });

  // ----------------------------------------------------------------- Lektor

  // Lektor czyta nagrania przypisane do biezacego ekranu, jedno po drugim.
  // Kazda zmiana ekranu zwieksza "token", wiec spoznione zdarzenia starego
  // nagrania nic juz nie robia. Jeden element <audio>, odblokowany kliknieciem
  // w bramie, sluzy wszystkim nagraniom (wymog Safari na iOS).
  const narrator = { on: false, token: 0, speaking: false, current: null, session: null, suspended: false };
  const clips = (data.narration && data.narration.clips) || {};
  const clipOf = (id) => clips[id] || null;
  let currentFinish = null;

  function hush() {
    narrator.token += 1;
    narrator.current = null;
    narrator.session = null;
    narrator.suspended = false;
    if (voice) {
      voice.ontimeupdate = null;
      voice.onended = null;
      voice.onerror = null;
      voice.onplaying = null;
      voice.pause();
    }
    duck(false);
  }

  // items: [{ id, onMark(i), onEnd() }]; opts.done po ostatnim, opts.fail gdy
  // odtworzenie sie nie uda. Zwraca false, gdy lektor jest wylaczony albo
  // brak nagran, i wtedy ekran idzie swoim tempem.
  function say(items, opts) {
    hush();
    const options = opts || {};
    if (!narrator.on || !voice) return false;
    const list = items.filter((item) => clipOf(item.id));
    if (!list.length) return false;
    const token = narrator.token;
    const session = { options, item: null, fired: 0, seek: () => {} };
    narrator.session = session;
    let index = 0;
    const alive = () => token === narrator.token;
    const next = () => {
      if (!alive()) return;
      if (index >= list.length) {
        narrator.current = null;
        narrator.session = null;
        duck(false);
        if (options.done) options.done();
        return;
      }
      const item = list[index++];
      const clip = clipOf(item.id);
      const marks = item.onMark ? clip.marks : [];
      session.item = item;
      session.fired = 0;
      session.seek = (i) => {
        try { voice.currentTime = Math.max(0, clip.marks[i] - 0.15); } catch { /* jeszcze bez metadanych */ }
        session.fired = i;
      };
      // Zdania odslaniamy z dwoch zrodel: klatek animacji (plynnie) i zdarzenia
      // postepu odtwarzania (dziala tez wtedy, gdy przegladarka wstrzymuje
      // klatki, np. w karcie, ktora nie jest na wierzchu).
      const sync = () => {
        if (!alive() || narrator.current !== item) return false;
        while (session.fired < marks.length && marks[session.fired] <= voice.currentTime + 0.08) item.onMark(session.fired++);
        return true;
      };
      const tick = () => {
        if (sync() && !voice.paused && !voice.ended) requestAnimationFrame(tick);
      };
      voice.ontimeupdate = sync;
      narrator.current = item;
      voice.muted = false;
      voice.src = clip.src;
      voice.onplaying = () => { if (alive()) { duck(true); requestAnimationFrame(tick); } };
      voice.onended = () => {
        if (!alive()) return;
        while (session.fired < marks.length) item.onMark(session.fired++);
        if (item.onEnd) item.onEnd();
        next();
      };
      voice.onerror = () => { if (alive()) { hush(); if (options.fail) options.fail(); } };
      const playing = voice.play();
      if (playing && playing.catch) playing.catch(() => { if (alive() && !narrator.suspended) { hush(); if (options.fail) options.fail(); } });
    };
    next();
    return true;
  }

  // Klikniecie w bramie odblokowuje element audio, zeby pozniejsze nagrania
  // mogly grac bez kolejnego gestu.
  function unlockVoice() {
    if (!voice || !clipOf("opening-lines")) return;
    const token = narrator.token;
    voice.muted = true;
    voice.src = clipOf("opening-lines").src;
    const playing = voice.play();
    const release = () => { if (token === narrator.token) { voice.pause(); voice.currentTime = 0; } voice.muted = false; };
    if (playing && playing.then) playing.then(release, () => { voice.muted = false; });
  }

  function setNarrator(on) {
    if (!narratorButton) return;
    narrator.on = on;
    narratorButton.hidden = false;
    narratorButton.setAttribute("aria-pressed", String(on));
    narratorButton.textContent = on ? "Lektor: wł." : "Lektor: wył.";
    // Wylaczenie tylko wstrzymuje lektora; tekst idzie dalej wlasnym tempem.
    // Ponowne wlaczenie wznawia nagranie biezacego ekranu od miejsca, do
    // ktorego doszedl tekst.
    const session = narrator.session;
    if (!session || !voice) return;
    if (!on && !narrator.suspended) {
      narrator.suspended = true;
      voice.pause();
      duck(false);
      if (session.options.onPause) session.options.onPause();
    } else if (on && narrator.suspended) {
      narrator.suspended = false;
      if (session.options.onResume) session.options.onResume(session);
      voice.play().catch(() => {});
    }
  }

  if (narratorButton) {
    narratorButton.addEventListener("click", () => setNarrator(!narrator.on));
  }

  // ----------------------------------------------------------------- Popiol

  // Popiol opadajacy na cala strone. Przy ograniczonym ruchu nie startuje, a w
  // ukrytej karcie stoi.
  function ash() {
    const canvas = document.querySelector("[data-ash]");
    if (!canvas || reduced.matches || !canvas.getContext) return;
    const ctx = canvas.getContext("2d");
    let width = 0;
    let height = 0;
    let flakes = [];
    let last = performance.now();
    let running = true;

    const make = (anywhere) => ({
      x: Math.random() * width,
      y: anywhere ? Math.random() * height : -8,
      r: 0.5 + Math.random() * 1.7,
      vy: 0.18 + Math.random() * 0.5,
      vx: -0.12 + Math.random() * 0.28,
      phase: Math.random() * Math.PI * 2,
      ember: Math.random() < 0.07,
      alpha: 0.2 + Math.random() * 0.5
    });

    function resize() {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      const target = Math.round(Math.min(110, (width * height) / 15000));
      while (flakes.length < target) flakes.push(make(true));
      flakes.length = target;
    }

    function frame(now) {
      if (!running) return;
      const dt = Math.min(50, now - last) / 16.7;
      last = now;
      ctx.clearRect(0, 0, width, height);
      for (const f of flakes) {
        f.phase += 0.012 * dt;
        f.x += (f.vx + Math.sin(f.phase) * 0.22) * dt;
        f.y += f.vy * dt;
        if (f.y > height + 8 || f.x < -8 || f.x > width + 8) Object.assign(f, make(false));
        ctx.fillStyle = f.ember
          ? "rgba(201, 92, 54, " + (f.alpha * (0.6 + 0.4 * Math.sin(f.phase * 3))) + ")"
          : "rgba(206, 197, 182, " + (f.alpha * 0.6) + ")";
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
      }
      requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", () => {
      running = !document.hidden;
      if (running) { last = performance.now(); requestAnimationFrame(frame); }
    });
    requestAnimationFrame(frame);
  }

  // ------------------------------------------------------------------ Wstep

  // Brama: uprzedzenie o tresci i wybor dzwieku. Klikniecie tutaj pozwala
  // przegladarce odtworzyc muzyke od razu we wstepie.
  function showGate() {
    setChapter(null);
    swap("gate", () => {
      const w = data.welcome;
      const view = el("section", "dylemat__gate");
      const kicker = el("p", "dylemat__kicker", data.opening.kicker);
      kicker.dataset.focus = "";
      view.append(kicker);
      if (attempts) view.append(el("p", "dylemat__gate-note dylemat__gate-note--strong", w.practice));
      w.notes.forEach((note) => view.append(el("p", "dylemat__gate-note", note)));
      const actions = el("div", "dylemat__actions dylemat__actions--center");
      const go = (music, voiceOn) => {
        setNarrator(voiceOn);
        if (voiceOn) unlockVoice();
        setSound(music);
        showOpening();
      };
      if (soundButton && sound.track && narratorButton && clipOf("opening-lines")) {
        actions.append(
          button(w.withVoice, () => go(true, true), "button button--primary"),
          button(w.musicOnly, () => go(true, false)),
          button(w.soundOff, () => go(false, false))
        );
      } else if (soundButton && sound.track) {
        actions.append(button(w.soundOn, () => go(true, false), "button button--primary"), button(w.soundOff, () => go(false, false)));
      } else {
        actions.append(button("Dalej", () => showOpening(), "button button--primary"));
      }
      view.append(actions);
      preload(data.opening.image);
      return view;
    });
  }

  // Wstep jak w kinie: linijki pojawiaja sie kolejno na tle miasta, potem
  // tytul. "Pomin" przeskakuje od razu do tytulu.
  function showOpening() {
    setChapter(null);
    swap("opening", () => {
      const o = data.opening;
      const view = el("section", "dylemat__opening");
      const backdrop = el("div", "dylemat__backdrop");
      backdrop.style.backgroundImage = "url(\"" + o.image + "\")";
      const lines = el("div", "dylemat__lines");
      o.lines.forEach((text) => lines.append(el("p", "dylemat__opening-line", text)));
      const titleCard = el("div", "dylemat__titlecard");
      const title = el("h1", "dylemat__headline", o.title);
      const slogan = el("p", "dylemat__slogan", o.slogan);
      slogan.lang = "en";
      const lead = el("p", "dylemat__lead", data.welcome.lead);
      const start = button(data.welcome.start, () => enterChapter("I", () => showScene(0)), "button button--primary");
      titleCard.append(el("p", "dylemat__kicker", o.kicker), title, slogan, lead, start);
      const skip = button(o.skip, () => showTitle(), "dylemat__skip");
      view.append(backdrop, lines, titleCard, skip);

      const lineNodes = [...lines.children];
      const pace = timerGroup();
      let shown = -1;
      const showLine = (i) => {
        shown = Math.max(shown, i);
        lineNodes.forEach((other, j) => other.classList.toggle("is-past", j < i));
        if (lineNodes[i]) lineNodes[i].classList.add("is-on");
      };
      let titled = false;
      const showTitle = () => {
        if (titled) return;
        titled = true;
        pace.stop();
        clearTimers();
        view.classList.add("is-titled");
        skip.hidden = true;
        lines.setAttribute("aria-hidden", "true");
        start.focus({ preventScroll: true });
        keyHandler = null;
        // Lektor czyta tytul, haslo i zapowiedz, kiedy pojawia sie na ekranie.
        say([{ id: "opening-title" }]);
      };
      // Linijki bez lektora, od pierwszej jeszcze niewidocznej: na starcie i po
      // wylaczeniu lektora w trakcie wstepu.
      const timed = () => {
        pace.stop();
        if (titled) return;
        if (reduced.matches) { pace.add(showTitle, 0); return; }
        const STEP = 2600;
        const from = shown + 1;
        lineNodes.slice(from).forEach((node, k) => pace.add(() => showLine(from + k), 700 + k * STEP));
        pace.add(showTitle, 700 + (lineNodes.length - from) * STEP + 1200);
      };
      const resume = (session) => {
        pace.stop();
        if (!titled && shown + 1 < lineNodes.length) session.seek(shown + 1);
      };
      // Z lektorem linijki wchodza razem z jego glosem.
      view.narrate = () => {
        const spoken = say(
          [{ id: "opening-lines", onMark: showLine, onEnd: () => pace.add(showTitle, 900) }],
          { fail: timed, onPause: timed, onResume: resume }
        );
        if (!spoken) timed();
      };
      skip.dataset.focus = "";
      return view;
    });
  }

  // ------------------------------------------------------------------ Sceny

  function showScene(index, back) {
    const s = data.scenes[index];
    const go = () => {
      if (s.id === "D" && state.decisionStart === null) state.decisionStart = performance.now();
      const last = index === data.scenes.length - 1;
      const actions = [];
      if (index > 0) actions.push(button("Wstecz", () => showScene(index - 1, true)));
      actions.push(button(last ? "Do decyzji" : "Dalej", () => (last ? showDecision() : showScene(index + 1)), "button button--primary"));
      swap(s.id, () => scene({
        id: s.id, image: s.image, focus: s.focus, tag: s.tag, title: s.title, text: s.text, actions,
        voice: ["scene-" + s.id],
        next: last ? data.decision.image : data.scenes[index + 1].image
      }));
    };
    if (back) { setChapter(s.chapter); chapterShown = s.chapter; go(); } else enterChapter(s.chapter, go);
  }

  // Ocena trudnosci zaraz po wyborze, na tym samym obrazie.
  function askDifficulty(field, image, then) {
    const d = data.difficulty;
    swap(field, () => scene({
      id: field, image, title: d.question,
      extra: [scale(d, (value) => { state[field] = value; then(); })]
    }));
  }

  function showDecision() {
    const d = data.decision;
    enterChapter(d.chapter, () => swap("decision", () => scene({
      id: "decision", image: d.image, tag: data.chapterWord + " " + d.chapter, title: d.title, text: d.text,
      voice: ["decision"],
      extra: [choices(d.options, "decision", pickPath), hint()],
      next: data.returnChoice.image
    })));
  }

  function pickPath(value) {
    state.path = value;
    state.decisionMs = Math.round(performance.now() - state.decisionStart);
    askDifficulty("difficulty", data.decision.image, () => {
      if (state.path === "stabilizacja") { state.finalPath = "stabilizacja"; showConsequence(); return; }
      const r = data.returnChoice;
      enterChapter(r.chapter, () => swap("return", () => scene({
        id: "return", image: r.image, title: r.title, text: r.text, voice: ["return"],
        extra: [choices(r.options, "return", pickReturn)], next: data.lucja.image
      })));
    });
  }

  function pickReturn(value) {
    state.returnMode = value;
    askDifficulty("difficultyReturn", data.returnChoice.image, () => {
      if (value === "oddanie") { state.finalPath = "stabilizacja"; showConsequence(); return; }
      const l = data.lucja;
      const options = [
        { value: "prawda", label: l.truth[state.path], info: l.truthInfo },
        { value: "zatajenie", label: l.lie, info: l.lieInfo }
      ];
      enterChapter(l.chapter, () => swap("lucja", () => scene({
        id: "lucja", image: l.image, title: l.title, text: [...l.text, l.stakes[state.path]],
        voice: ["lucja", "lucja-stakes-" + state.path],
        extra: [choices(options, "lucja", pickLucja)]
      })));
    });
  }

  function pickLucja(value) {
    state.lucja = value;
    askDifficulty("difficultyLucja", data.lucja.image, () => {
      if (value === "prawda" && state.path !== "tomasz") {
        const o = data.objection;
        swap("objection", () => scene({
          id: "objection", image: o.image, title: o.title, text: [o.text[state.path], o.close],
          voice: ["objection-" + state.path],
          extra: [choices(o.options, "objection", pickObjection)]
        }));
        return;
      }
      state.finalPath = state.path;
      showConsequence();
    });
  }

  function pickObjection(value) {
    state.objection = value;
    askDifficulty("difficultyObjection", data.objection.image, () => {
      state.finalPath = value === "rezygnacja" ? "stabilizacja" : state.path;
      showConsequence();
    });
  }

  // Konsekwencja wlasnej drogi i dopiski z dalszych wyborow.
  // Klucze dopiskow z dalszych wyborow, w kolejnosci wyswietlania; ten sam
  // klucz wskazuje tekst i nagranie lektora.
  function noteKeys() {
    const keys = [];
    if (state.returnMode === "oddanie") keys.push("oddanie");
    if (state.objection === "rezygnacja") keys.push("rezygnacja_" + state.path);
    if (state.objection === "mimo_sprzeciwu") keys.push("mimo_sprzeciwu");
    if (state.finalPath !== "stabilizacja") {
      if (state.lucja === "zatajenie") {
        keys.push(state.path === "tomasz" ? "zatajenie_tomasz" : "zatajenie");
        if (state.path !== "tomasz") keys.push("zatajenie_przymus");
      }
      if (state.lucja === "prawda" && state.path === "tomasz") keys.push("prawda_tomasz");
    }
    if (state.returnMode === "przemkniecie" || state.returnMode === "przebicie") keys.push(state.returnMode);
    return keys;
  }

  function showConsequence() {
    const c = data.consequences[state.finalPath];
    let text = c.text;
    let voiceId = "consequence-" + state.finalPath;
    let image = c.image;
    // Stabilizacja po zaplaconej cenie: pytanie "nie wziales od nikogo" nie
    // pasuje, wiec ostatni akapit mowi o zmarnowanym materiale.
    if (state.finalPath === "stabilizacja" && state.path !== "stabilizacja") {
      text = [...c.text.slice(0, -1), c.wasted[state.path]];
      voiceId += "-wasted-" + state.path;
      image = c.wastedImage || c.image;
    }
    const notes = noteKeys();
    enterChapter("VI", () => swap("consequence", () => scene({
      id: "consequence", image, title: c.title, text,
      extra: notes.map((key) => el("p", "dylemat__note", data.notes[key])),
      actions: [button("Dalej", showQuestions, "button button--primary")],
      voice: [voiceId], voiceAfter: notes.map((key) => "note-" + key)
    })));
  }

  // ---------------------------------------------------------------- Pytania

  function fieldset(legend, className) {
    const set = el("fieldset", "dylemat__fieldset" + (className ? " " + className : ""));
    set.append(el("legend", "dylemat__label", legend));
    return set;
  }

  // Odpowiedzi zamkniete jako "kafelki": prawdziwe pola wyboru pod spodem,
  // wiec dzialaja z klawiatury i czytnikiem ekranu.
  function chips(name, options, type) {
    const row = el("div", "dylemat__chips");
    options.forEach(([value, label]) => {
      const chip = el("label", "dylemat__chip");
      const input = el("input");
      input.type = type || "radio";
      input.name = name;
      input.value = value;
      chip.append(input, el("span", "", label));
      row.append(chip);
    });
    return row;
  }

  function scaleField(name, spec) {
    const set = fieldset(spec.label, "dylemat__fieldset--scale");
    const options = [1, 2, 3, 4, 5].map((n) => [String(n), String(n)]);
    const row = chips(name, options);
    const ends = el("div", "dylemat__scale-ends");
    ends.append(el("span", "", spec.low), el("span", "", spec.high));
    set.append(row, ends);
    return set;
  }

  function textField(name, spec, rows) {
    const label = el("label", "dylemat__fieldset");
    label.append(el("span", "dylemat__label", spec.label));
    if (spec.hint) label.append(el("span", "dylemat__field-hint", spec.hint));
    const area = el("textarea", "dylemat__input");
    area.name = name;
    area.rows = rows;
    area.maxLength = 2000;
    label.append(area);
    return label;
  }

  function showQuestions() {
    const q = data.questions;
    const form = el("form", "dylemat__form");
    form.noValidate = true;

    const value = fieldset(q.value.label);
    value.append(chips("value", q.value.options));
    const more = fieldset(q.more.label);
    const whoSet = fieldset(q.more.who, "dylemat__fieldset--nested");
    whoSet.append(chips("who", q.more.whoOptions, "checkbox"));
    whoSet.hidden = true;
    more.append(chips("more", q.more.options), whoSet);
    more.addEventListener("change", () => {
      whoSet.hidden = !form.querySelector("input[name=more][value=tak]").checked;
    });
    const age = fieldset(q.age.label);
    age.append(chips("age", q.age.options.map((o) => [o, o])));
    const games = fieldset(q.games.label);
    games.append(chips("games", q.games.options.map((o) => [o, o])));

    // Pytanie otwarte o cene jest pierwsze, zanim lista wartosci cokolwiek
    // podpowie.
    form.append(
      textField("paid", q.paid, 2), value, scaleField("veyr", q.veyr), more,
      scaleField("clarity", q.clarity), textField("comment", q.comment, 3), age, games
    );
    const status = el("p", "dylemat__status");
    status.setAttribute("role", "status");
    const submit = el("button", "button button--primary", q.submit);
    submit.type = "submit";
    form.append(status, submit);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!busy) send(form, submit, status);
    });

    // Bez obrazu: dlugi formularz rozciagalby kadr i ucinal ilustracje.
    swap("questions", () => scene({ id: "questions", tag: q.title, title: q.lead, extra: [form] }));
  }

  function collect(form) {
    const picked = (name) => {
      const input = form.querySelector("input[name=" + name + "]:checked");
      return input ? input.value : "";
    };
    const number = (name) => (picked(name) ? Number(picked(name)) : null);
    const more = picked("more");
    return {
      paid: form.elements.paid.value.trim(),
      value: picked("value"),
      veyr: number("veyr"),
      more,
      who: more === "tak" ? [...form.querySelectorAll("input[name=who]:checked")].map((i) => i.value) : [],
      clarity: number("clarity"),
      comment: form.elements.comment.value.trim(),
      age: picked("age"),
      games: picked("games")
    };
  }

  async function send(form, submit, status) {
    submit.disabled = true;
    status.textContent = "Wysyłam...";
    track("questions");
    const payload = {
      version: data.version, path: state.path, returnMode: state.returnMode, lucja: state.lucja,
      objection: state.objection, finalPath: state.finalPath,
      difficulty: state.difficulty, difficultyReturn: state.difficultyReturn,
      difficultyLucja: state.difficultyLucja, difficultyObjection: state.difficultyObjection,
      decisionMs: state.decisionMs, timings: state.timings, infoOpens: state.infoOpens,
      attempt: attempts + 1,
      // Jak tester sluchal w chwili wyslania: z lektorem, sama muzyka czy w ciszy.
      sound: narrator.on ? "lektor" : sound.on ? "muzyka" : "cisza",
      client: window.matchMedia("(max-width: 700px)").matches ? "mobile" : "desktop",
      answers: collect(form)
    };
    try {
      const response = await fetch("/api/dylemat", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(String(response.status));
      attempts += 1;
      writeAttempts();
      showEnd();
    } catch {
      submit.disabled = false;
      status.textContent = "Nie udało się wysłać odpowiedzi. Sprawdź połączenie i spróbuj ponownie.";
    }
  }

  // ------------------------------------------------------------------ Koniec

  function chronicle() {
    const c = data.chronicle;
    const lines = [[c.path[state.path], state.difficulty]];
    if (state.returnMode) lines.push([c.returnMode[state.returnMode], state.difficultyReturn]);
    if (state.lucja) lines.push([c.lucja[state.lucja], state.difficultyLucja]);
    if (state.objection) lines.push([c.objection[state.objection], state.difficultyObjection]);
    const list = el("ol", "dylemat__chronicle");
    lines.forEach(([line, level]) => {
      const item = el("li", "", line + " ");
      if (level) item.append(el("span", "dylemat__chronicle-level", fill(c.difficulty, { n: level })));
      list.append(item);
    });
    return list;
  }

  // Wyniki innych z tego samego adresu strony, od trzech odpowiedzi.
  async function others(box) {
    const e = data.end;
    box.append(el("h2", "dylemat__subtitle", e.others));
    const status = el("p", "dylemat__note", e.loading);
    box.append(status);
    try {
      const response = await fetch("/api/dylemat/stats", { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(String(response.status));
      const stats = await response.json();
      if (!stats.enough) { status.textContent = e.first; return; }
      status.remove();
      const total = Object.values(stats.paths).reduce((sum, n) => sum + n, 0) || 1;
      const bars = el("ul", "dylemat__stats");
      Object.keys(e.pathNames).forEach((key) => {
        const share = Math.round(((stats.paths[key] || 0) / total) * 100);
        const item = el("li", "dylemat__stat" + (key === state.path ? " is-yours" : ""));
        const label = el("span", "dylemat__stat-label", e.pathNames[key]);
        if (key === state.path) label.append(el("span", "dylemat__stat-yours", e.yours));
        const track = el("span", "dylemat__stat-track");
        const fillBar = el("span", "dylemat__stat-fill");
        fillBar.style.setProperty("--share", share + "%");
        track.append(fillBar);
        item.append(label, track, el("span", "dylemat__stat-value", share + "%"));
        bars.append(item);
      });
      box.append(bars);
      const facts = [fill(e.count, { n: stats.n })];
      if (stats.difficulty) facts.push(fill(e.avgDifficulty, { d: stats.difficulty.toFixed(1).replace(".", ",") }));
      const returned = (stats.truth.prawda || 0) + (stats.truth.zatajenie || 0);
      if (returned) facts.push(fill(e.truthShare, { p: Math.round(((stats.truth.prawda || 0) / returned) * 100) }));
      facts.forEach((text) => box.append(el("p", "dylemat__fact", text)));
    } catch {
      status.textContent = e.first;
    }
  }

  // "Jeszcze raz" zaczyna od wstepu, z muzyka od poczatku.
  function restart() {
    // Czas na ekranie konca poprzedniego przejscia nie nalezy do nowego.
    current = null;
    state = fresh();
    chapterShown = null;
    told.clear();
    hush();
    rewindSound();
    showOpening();
  }

  // Pod koncem prowadzimy na strone glowna gry.
  function homeLink(e) {
    const link = el("a", "button button--primary", e.home);
    link.href = e.homeUrl;
    return link;
  }

  function showEnd() {
    const e = data.end;
    setChapter(null);
    swap("end", () => {
      const box = el("section", "dylemat__others");
      const slogan = el("p", "dylemat__slogan", e.slogan);
      slogan.lang = "en";
      const view = scene({
        id: "end", title: e.title, extra: [chronicle(), slogan, box, el("p", "dylemat__note", e.thanks)],
        actions: [button(e.again, restart), homeLink(e)], stackActions: true
      });
      others(box);
      return view;
    });
  }

  // ------------------------------------------------------------------ Start

  document.addEventListener("keydown", (event) => {
    if (busy || !keyHandler || event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
    const tag = event.target && event.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if ((event.key === "Enter" || event.key === " ") && tag === "BUTTON") return;
    keyHandler(event);
  });

  stage.replaceChildren();
  ash();
  showGate();
})();
