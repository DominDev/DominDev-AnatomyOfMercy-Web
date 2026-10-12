// Interaktywna proba dylematu. Prowadzi gracza karta po karcie, pokazuje tylko
// konsekwencje jego wlasnej drogi i na koncu wysyla anonimowy wynik do
// /api/proba. Tresc pochodzi z JSON osadzonego w stronie (src/_data/proba.js).
(() => {
  "use strict";

  const data = JSON.parse(document.getElementById("proba-data").textContent);
  const stage = document.getElementById("proba");
  const progress = document.querySelector("[data-progress]");
  const DONE_KEY = "aom-proba-done";

  // Stan jednej proby. Czas liczymy dla kazdego ekranu osobno, a czas decyzji
  // od pierwszej karty drogi do klikniecia wyboru.
  const state = {
    path: null, returnMode: null, lucja: null, objection: null, finalPath: null,
    timings: {}, rereads: 0, decisionStart: null, decisionMs: null,
    practice: readDone() === data.version
  };
  let current = null;
  let shownAt = 0;

  function readDone() {
    try { return localStorage.getItem(DONE_KEY); } catch { return null; }
  }

  function writeDone() {
    try { localStorage.setItem(DONE_KEY, data.version); } catch { /* prywatne okno: bez pamieci */ }
  }

  function track(nextId) {
    const now = performance.now();
    if (current) {
      state.timings[current] = (state.timings[current] || 0) + Math.round(now - shownAt);
    }
    current = nextId;
    shownAt = now;
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // Tekst kart pochodzi z naszego buildu (nie od uzytkownika) i zawiera tylko
  // <strong> i <em>, dlatego wolno go wstawic jako HTML.
  function paragraphs(list) {
    return list.map((html) => {
      const p = el("p", "proba__text");
      p.innerHTML = html;
      return p;
    });
  }

  function button(label, onClick, variant) {
    const b = el("button", "button" + (variant ? " " + variant : ""), label);
    b.type = "button";
    b.addEventListener("click", onClick);
    return b;
  }

  function preload(src) {
    if (src) { const image = new Image(); image.src = src; }
  }

  // Jeden ekran: obraz, etykieta, tytul, tresc i przyciski.
  function screen(id, opts) {
    track(id);
    stage.replaceChildren();
    const card = el("article", "proba__card");
    if (opts.image) {
      const figure = el("figure", "proba__image");
      const image = el("img");
      image.src = opts.image;
      image.alt = "";
      image.decoding = "async";
      figure.append(image);
      card.append(figure);
    }
    const body = el("div", "proba__body");
    if (opts.tag) body.append(el("p", "proba__tag", opts.tag));
    const heading = el("h1", "proba__title", opts.title || "");
    heading.tabIndex = -1;
    body.append(heading);
    if (opts.text) body.append(...paragraphs(opts.text));
    if (opts.extra) body.append(...opts.extra);
    const actions = el("div", "proba__actions");
    (opts.actions || []).forEach((a) => actions.append(a));
    body.append(actions);
    card.append(body);
    stage.append(card);
    progress.textContent = opts.step || "";
    heading.focus({ preventScroll: true });
    window.scrollTo(0, 0);
    preload(opts.next);
  }

  function choices(options, onPick) {
    const list = el("div", "proba__choices");
    options.forEach((option) => {
      list.append(button(option.label, () => onPick(option.value), "proba__choice"));
    });
    return list;
  }

  // Kolejnosc kart sytuacji i drog: A, B, C, D, E, F, G, H.
  const sequence = [...data.situation, ...data.sources, data.cordon];

  function showCard(index) {
    const card = sequence[index];
    if (card.id === "D" && state.decisionStart === null) state.decisionStart = performance.now();
    const actions = [];
    if (index > 0) actions.push(button("Wstecz", () => showCard(index - 1)));
    const nextLabel = index < sequence.length - 1 ? "Dalej" : "Do decyzji";
    actions.push(button(nextLabel, () => (index < sequence.length - 1 ? showCard(index + 1) : showDecision()), "button--primary"));
    screen(card.id, {
      image: card.image, tag: "Karta " + card.id + " | " + card.tag, title: card.title, text: card.text,
      actions, step: (index + 1) + " / " + sequence.length,
      next: sequence[index + 1] && sequence[index + 1].image
    });
  }

  function showDecision() {
    const reread = button(data.decision.reread, () => { state.rereads += 1; showOverview(); }, "proba__link");
    screen("decision", {
      image: data.lucja.image, tag: "Decyzja", title: data.decision.question,
      extra: [choices(data.decision.options, pickPath), reread], step: "Decyzja"
    });
  }

  // Wszystkie cztery drogi i powrot na jednym ekranie, bez obrazow, do
  // ponownego przeczytania przed decyzja.
  function showOverview() {
    const blocks = [...data.sources, data.cordon].map((card) => {
      const block = el("section", "proba__recap");
      block.append(el("h2", "proba__recap-title", "Karta " + card.id + ": " + card.title), ...paragraphs(card.text));
      return block;
    });
    screen("overview", {
      tag: "Karty dróg", title: "Drogi leczenia Łucji", extra: blocks,
      actions: [button("Wróć do decyzji", showDecision, "button--primary")], step: "Decyzja"
    });
  }

  function pickPath(value) {
    state.path = value;
    state.decisionMs = Math.round(performance.now() - state.decisionStart);
    if (value === "stabilizacja") { state.finalPath = "stabilizacja"; showConsequence(); return; }
    screen("return", {
      image: data.returnChoice.image, tag: "Powrót przez kordon", title: data.returnChoice.question,
      extra: [choices(data.returnChoice.options, pickReturn)], step: "Decyzja"
    });
  }

  function pickReturn(value) {
    state.returnMode = value;
    if (value === "oddanie") { state.finalPath = "stabilizacja"; showConsequence(); return; }
    screen("lucja", {
      image: data.lucja.image, tag: "Łucja", title: data.lucja.question,
      extra: [choices(data.lucja.options, pickLucja)], step: "Decyzja"
    });
  }

  function pickLucja(value) {
    state.lucja = value;
    if (value === "prawda" && state.path !== "tomasz") {
      screen("objection", {
        image: data.objection.image, tag: "Sprzeciw", title: data.objection.question,
        text: [data.objection.text[state.path]],
        extra: [choices(data.objection.options, pickObjection)], step: "Decyzja"
      });
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

  // Karta konsekwencji wlasnej drogi plus dopiski z dalszych wyborow.
  function showConsequence() {
    const n = data.notes;
    const base = data.consequences[state.finalPath];
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
    const notes = extra.map((text) => el("p", "proba__note", text));
    screen("consequence", {
      image: base.image, tag: "Konsekwencja", title: base.title, text: base.text, extra: notes,
      actions: [button("Dalej", showQuestions, "button--primary")], step: "Konsekwencja"
    });
  }

  function field(labelText, control) {
    const wrapper = el("label", "proba__field");
    wrapper.append(el("span", "proba__label", labelText), control);
    return wrapper;
  }

  function select(name, options) {
    const s = el("select", "proba__select");
    s.name = name;
    s.append(new Option("bez odpowiedzi", ""));
    options.forEach((o) => s.append(new Option(o, o)));
    return s;
  }

  function showQuestions() {
    const q = data.questions;
    const form = el("div", "proba__form");
    const inputs = {};
    q.items.forEach((item) => {
      const area = el("textarea", "proba__input");
      area.name = item.id;
      area.rows = 3;
      area.maxLength = 2000;
      inputs[item.id] = area;
      form.append(field(item.label, area));
    });
    inputs.age = select("age", q.age.options);
    inputs.games = select("games", q.games.options);
    form.append(field(q.age.label, inputs.age), field(q.games.label, inputs.games));
    const status = el("p", "proba__status");
    status.setAttribute("role", "status");
    const submit = button(state.practice ? "Zakończ (bez zapisu)" : q.submit, () => send(inputs, submit, status), "button--primary");
    screen("questions", {
      image: q.image, tag: "Pytania", title: q.title, text: [q.lead], extra: [form, status],
      actions: [submit], step: "Pytania"
    });
  }

  async function send(inputs, submit, status) {
    track("end");
    if (state.practice) { showEnd(); return; }
    submit.disabled = true;
    status.textContent = "Wysyłam...";
    const answers = {};
    Object.keys(inputs).forEach((key) => { answers[key] = inputs[key].value.trim(); });
    const payload = {
      version: data.version, path: state.path, returnMode: state.returnMode, lucja: state.lucja,
      objection: state.objection, finalPath: state.finalPath, timings: state.timings,
      decisionMs: state.decisionMs, rereads: state.rereads,
      client: window.matchMedia("(max-width: 700px)").matches ? "mobile" : "desktop",
      answers
    };
    try {
      const response = await fetch("/api/proba", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(String(response.status));
      writeDone();
      showEnd();
    } catch {
      submit.disabled = false;
      status.textContent = "Nie udało się wysłać odpowiedzi. Sprawdź połączenie i spróbuj ponownie.";
    }
  }

  function showEnd() {
    const e = data.end;
    const again = button(e.again, () => {
      Object.assign(state, { path: null, returnMode: null, lucja: null, objection: null, finalPath: null,
        timings: {}, rereads: 0, decisionStart: null, decisionMs: null, practice: true });
      showIntro();
    });
    const slogan = el("p", "proba__slogan", "Every cure leaves a scar.");
    screen("end", { image: e.image, title: e.title, text: [e.text], extra: [slogan], actions: [again], step: "" });
  }

  function showIntro() {
    const i = data.intro;
    const notes = i.notes.map((t) => el("p", "proba__note", t));
    if (state.practice) {
      notes.unshift(el("p", "proba__note proba__note--strong", "Twoje odpowiedzi są już zapisane. Możesz przejść próbę jeszcze raz, ale tym razem bez zapisu."));
    }
    screen("intro", {
      image: i.image, tag: "Anatomy of Mercy", title: i.title, text: [i.lead], extra: notes,
      actions: [button(i.start, () => showCard(0), "button--primary")], step: "", next: sequence[0].image
    });
  }

  // Dzwiek tylko na wyrazne zyczenie gracza, nigdy samoczynnie.
  const soundButton = document.querySelector("[data-sound]");
  const audio = document.querySelector("[data-audio]");
  if (soundButton && audio) {
    audio.volume = 0.35;
    soundButton.addEventListener("click", async () => {
      const on = soundButton.getAttribute("aria-pressed") !== "true";
      try {
        if (on) { await audio.play(); } else { audio.pause(); }
        soundButton.setAttribute("aria-pressed", String(on));
        soundButton.textContent = on ? "Dźwięk: włączony" : "Dźwięk: wyłączony";
      } catch {
        soundButton.textContent = "Dźwięk niedostępny";
        soundButton.disabled = true;
      }
    });
  }

  showIntro();
})();
