// Interaktywny dylemat "Swiatlo pod popiolem" (/pl/dylemat/). Prowadzi gracza
// przez wstep, rozdzialy i sceny, pozwala wybierac kwestie jak w grze
// fabularnej, pokazuje tylko konsekwencje jego wlasnej drogi i na koncu
// wysyla anonimowy wynik do /api/dylemat. Tresc pochodzi z JSON osadzonego w
// stronie (src/_data/dylemat.js).
(() => {
  "use strict";

  const data = JSON.parse(document.getElementById("dylemat-data").textContent);
  const stage = document.getElementById("dylemat");
  const chapterLabel = document.querySelector("[data-chapter]");
  const soundButton = document.querySelector("[data-sound]");
  const introAudio = document.querySelector("[data-audio-intro]");
  const ambientAudio = document.querySelector("[data-audio-ambient]");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const DONE_KEY = "aom-dylemat-done";

  // Stan jednej proby. Czas liczymy dla kazdego ekranu osobno, a czas decyzji
  // od pierwszej karty drogi do wybrania kwestii.
  const fresh = () => ({
    path: null, difficulty: null, returnMode: null, lucja: null, objection: null, finalPath: null,
    timings: {}, infoOpens: {}, decisionStart: null, decisionMs: null
  });
  let state = fresh();
  let practice = readDone() === data.version;
  let current = null;
  let shownAt = 0;
  let busy = false;
  let keyHandler = null;
  let chapterShown = null;
  const timers = new Set();

  function readDone() {
    try { return localStorage.getItem(DONE_KEY); } catch { return null; }
  }

  function writeDone() {
    try { localStorage.setItem(DONE_KEY, data.version); } catch { /* prywatne okno: bez pamieci */ }
  }

  function later(fn, ms) {
    const id = setTimeout(() => { timers.delete(id); fn(); }, ms);
    timers.add(id);
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

  // Tekst scen pochodzi z naszego buildu (nie od uzytkownika) i zawiera tylko
  // <strong> i <em>, dlatego wolno go wstawic jako HTML.
  function paragraph(html, className) {
    const p = el("p", className || "dylemat__text");
    p.innerHTML = html;
    return p;
  }

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
      later(go, reduced.matches ? 1600 : 2900);
      return view;
    });
  }

  // Scena: obraz z powolnym najazdem kamery i tekst odslaniany akapit po
  // akapicie. Kazdy element tresci dostaje swoj numer w kolejce wejscia.
  function scene(opts) {
    const view = el("article", "dylemat__scene" + (opts.image ? "" : " dylemat__scene--plain"));
    if (opts.image) {
      const figure = el("figure", "dylemat__art");
      const image = el("img");
      image.src = opts.image;
      image.alt = "";
      image.decoding = "async";
      figure.append(image);
      view.append(figure);
    }
    const body = el("div", "dylemat__body");
    if (opts.tag) body.append(el("p", "dylemat__tag", opts.tag));
    const heading = el("h1", "dylemat__title", opts.title || "");
    heading.dataset.focus = "";
    body.append(heading);
    (opts.text || []).forEach((html) => body.append(paragraph(html)));
    (opts.extra || []).forEach((node) => body.append(node));
    if (opts.actions && opts.actions.length) {
      const actions = el("div", "dylemat__actions");
      actions.append(...opts.actions);
      body.append(actions);
    }
    [...body.children].forEach((child, i) => {
      child.classList.add("dylemat__reveal");
      child.style.setProperty("--i", i);
    });
    view.append(body);
    preload(opts.next);
    return view;
  }

  // Kwestie dialogowe. Obok kazdej ikona i z krotkim przypomnieniem ceny.
  // Ile razy gracz zajrzal do przypomnien, zapisujemy jako sygnal wahania.
  function choices(options, group, onPick) {
    const list = el("ol", "dylemat__choices");
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
    later(() => {
      keyHandler = (event) => {
        const n = Number(event.key);
        if (Number.isInteger(n) && n >= 1 && n <= options.length) onPick(options[n - 1].value);
      };
    }, 0);
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
    later(() => {
      keyHandler = (event) => {
        const n = Number(event.key);
        if (Number.isInteger(n) && n >= 1 && n <= 5) onPick(n);
      };
    }, 0);
    return wrap;
  }

  // ---------------------------------------------------------------- Dzwiek

  // Muzyka gra tylko po wyraznym wyborze gracza. Najpierw utwor wstepu, po
  // nim zapetlone tlo. Glosnosc zmienia sie lagodnie, bez urwanych dzwiekow.
  const sound = { on: false, track: introAudio || ambientAudio, fades: new Map() };
  const VOLUME = new Map([[introAudio, 0.55], [ambientAudio, 0.35]]);

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
      soundButton.textContent = "Dźwięk niedostępny";
      soundButton.disabled = true;
      soundButton.setAttribute("aria-pressed", "false");
    }
  }

  function startTrack(audio) {
    if (!audio) return;
    try { audio.volume = 0; } catch { /* iOS */ }
    const playing = audio.play();
    if (playing && playing.catch) playing.catch(soundFailed);
    fade(audio, VOLUME.get(audio), 2500);
  }

  function setSound(on) {
    if (!soundButton || !sound.track) return;
    sound.on = on;
    soundButton.hidden = false;
    soundButton.setAttribute("aria-pressed", String(on));
    soundButton.textContent = on ? "Dźwięk: włączony" : "Dźwięk: wyłączony";
    if (on) startTrack(sound.track);
    else { const audio = sound.track; fade(audio, 0, 800, () => audio.pause()); }
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

  // Karta w tle: muzyka milknie, a po powrocie gra dalej.
  document.addEventListener("visibilitychange", () => {
    if (!sound.on || !sound.track) return;
    if (document.hidden) sound.track.pause();
    else startTrack(sound.track);
  });

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
      if (practice) view.append(el("p", "dylemat__gate-note dylemat__gate-note--strong", w.practice));
      w.notes.forEach((note) => view.append(el("p", "dylemat__gate-note", note)));
      const actions = el("div", "dylemat__actions dylemat__actions--center");
      const go = (on) => { setSound(on); showOpening(); };
      if (soundButton && sound.track) {
        actions.append(button(w.soundOn, () => go(true), "button button--primary"), button(w.soundOff, () => go(false)));
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
      const showTitle = () => {
        clearTimers();
        view.classList.add("is-titled");
        skip.hidden = true;
        lines.setAttribute("aria-hidden", "true");
        start.focus({ preventScroll: true });
        keyHandler = null;
      };
      if (reduced.matches) {
        later(showTitle, 0);
      } else {
        const STEP = 2600;
        lineNodes.forEach((node, i) => later(() => {
          lineNodes.forEach((other, j) => other.classList.toggle("is-past", j < i));
          node.classList.add("is-on");
        }, 700 + i * STEP));
        later(showTitle, 700 + lineNodes.length * STEP + 1200);
      }
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
        image: s.image, tag: s.tag, title: s.title, text: s.text, actions,
        next: last ? data.decision.image : data.scenes[index + 1].image
      }));
    };
    if (back) { setChapter(s.chapter); chapterShown = s.chapter; go(); } else enterChapter(s.chapter, go);
  }

  function showDecision() {
    const d = data.decision;
    enterChapter(d.chapter, () => swap("decision", () => scene({
      image: d.image, tag: data.chapterWord + " " + d.chapter, title: d.title,
      extra: [choices(d.options, "decision", pickPath), hint()],
      next: data.returnChoice.image
    })));
  }

  function pickPath(value) {
    state.path = value;
    state.decisionMs = Math.round(performance.now() - state.decisionStart);
    const d = data.difficulty;
    swap("difficulty", () => scene({
      image: data.decision.image, tag: data.chapterWord + " " + data.decision.chapter, title: d.question,
      extra: [scale(d, pickDifficulty)]
    }));
  }

  function pickDifficulty(value) {
    state.difficulty = value;
    if (state.path === "stabilizacja") { state.finalPath = "stabilizacja"; showConsequence(); return; }
    const r = data.returnChoice;
    enterChapter(r.chapter, () => swap("return", () => scene({
      image: r.image, title: r.title, text: [r.lead],
      extra: [choices(r.options, "return", pickReturn)], next: data.lucja.image
    })));
  }

  function pickReturn(value) {
    state.returnMode = value;
    if (value === "oddanie") { state.finalPath = "stabilizacja"; showConsequence(); return; }
    const l = data.lucja;
    const options = [
      { value: "prawda", label: l.truth[state.path], info: l.truthInfo },
      { value: "zatajenie", label: l.lie, info: l.lieInfo }
    ];
    enterChapter(l.chapter, () => swap("lucja", () => scene({
      image: l.image, title: l.title, text: [l.lead], extra: [choices(options, "lucja", pickLucja)]
    })));
  }

  function pickLucja(value) {
    state.lucja = value;
    if (value === "prawda" && state.path !== "tomasz") {
      const o = data.objection;
      swap("objection", () => scene({
        image: o.image, title: o.title, text: [o.text[state.path]],
        extra: [choices(o.options, "objection", pickObjection)]
      }));
      return;
    }
    state.finalPath = state.path;
    showConsequence();
  }

  function pickObjection(value) {
    state.objection = value;
    state.finalPath = value === "rezygnacja" ? "stabilizacja" : state.path;
    showConsequence();
  }

  // Konsekwencja wlasnej drogi i dopiski z dalszych wyborow.
  function consequenceNotes() {
    const n = data.notes;
    const extra = [];
    if (state.returnMode === "oddanie") extra.push(n.oddanie);
    if (state.objection === "rezygnacja") extra.push(n["rezygnacja_" + state.path]);
    if (state.objection === "mimo_sprzeciwu") extra.push(n.mimo_sprzeciwu);
    if (state.finalPath !== "stabilizacja") {
      if (state.lucja === "zatajenie") {
        extra.push(state.path === "tomasz" ? n.zatajenie_tomasz : n.zatajenie);
        if (state.path !== "tomasz") extra.push(n.zatajenie_przymus);
      }
      if (state.lucja === "prawda" && state.path === "tomasz") extra.push(n.prawda_tomasz);
    }
    if (state.returnMode === "przemkniecie" || state.returnMode === "przebicie") extra.push(n[state.returnMode]);
    return extra.map((text) => el("p", "dylemat__note", text));
  }

  function showConsequence() {
    const c = data.consequences[state.finalPath];
    enterChapter("VI", () => swap("consequence", () => scene({
      image: c.image, title: c.title, text: c.text, extra: consequenceNotes(),
      actions: [button("Dalej", showQuestions, "button button--primary")]
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
    const submit = el("button", "button button--primary", practice ? "Zakończ (bez zapisu)" : q.submit);
    submit.type = "submit";
    form.append(status, submit);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!busy) send(form, submit, status);
    });

    // Bez obrazu: dlugi formularz rozciagalby kadr i ucinal ilustracje.
    swap("questions", () => scene({ tag: q.title, title: q.lead, extra: [form] }));
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
    if (practice) { showEnd(); return; }
    submit.disabled = true;
    status.textContent = "Wysyłam...";
    track("questions");
    const payload = {
      version: data.version, path: state.path, difficulty: state.difficulty, returnMode: state.returnMode,
      lucja: state.lucja, objection: state.objection, finalPath: state.finalPath,
      decisionMs: state.decisionMs, timings: state.timings, infoOpens: state.infoOpens,
      client: window.matchMedia("(max-width: 700px)").matches ? "mobile" : "desktop",
      answers: collect(form)
    };
    try {
      const response = await fetch("/api/dylemat", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(String(response.status));
      writeDone();
      practice = true;
      showEnd();
    } catch {
      submit.disabled = false;
      status.textContent = "Nie udało się wysłać odpowiedzi. Sprawdź połączenie i spróbuj ponownie.";
    }
  }

  // ------------------------------------------------------------------ Koniec

  function chronicle() {
    const c = data.chronicle;
    const lines = [c.path[state.path], fill(c.difficulty, { n: state.difficulty })];
    if (state.returnMode) lines.push(c.returnMode[state.returnMode]);
    if (state.lucja) lines.push(c.lucja[state.lucja]);
    if (state.objection) lines.push(c.objection[state.objection]);
    const list = el("ol", "dylemat__chronicle");
    lines.forEach((line) => list.append(el("li", "", line)));
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
      const told = (stats.truth.prawda || 0) + (stats.truth.zatajenie || 0);
      if (told) facts.push(fill(e.truthShare, { p: Math.round((stats.truth.prawda / told) * 100) }));
      facts.forEach((text) => box.append(el("p", "dylemat__fact", text)));
    } catch {
      status.textContent = e.first;
    }
  }

  function showEnd() {
    const e = data.end;
    setChapter(null);
    swap("end", () => {
      const box = el("section", "dylemat__others");
      const again = button(e.again, () => {
        state = fresh();
        chapterShown = null;
        enterChapter("I", () => showScene(0));
      });
      const slogan = el("p", "dylemat__slogan", e.slogan);
      slogan.lang = "en";
      const view = scene({
        title: e.title, extra: [chronicle(), slogan, box, el("p", "dylemat__note", e.thanks)], actions: [again]
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
