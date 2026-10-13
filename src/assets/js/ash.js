// Popiol opadajacy na strone, ten sam motyw co w interaktywnym dylemacie.
// Czysta dekoracja: plotno jest ukryte przed czytnikami ekranu, nie
// przechwytuje klikniec i startuje dopiero po zaladowaniu strony, zeby nie
// opoznic pierwszego obrazu. Nie startuje wcale przy ograniczonym ruchu i
// oszczedzaniu danych, a w karcie w tle stoi.
(() => {
  "use strict";

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const saveData = navigator.connection && navigator.connection.saveData;
  if (reduced.matches || saveData) return;

  let canvas = null;
  let ctx = null;
  let width = 0;
  let height = 0;
  let flakes = [];
  let last = 0;
  let running = false;
  let frameId = 0;

  // Na stronie z trescia popiolu jest mniej niz w dylemacie i jest bledszy,
  // zeby nie przeszkadzal w czytaniu.
  const make = (anywhere) => ({
    x: Math.random() * width,
    y: anywhere ? Math.random() * height : -8,
    r: 0.5 + Math.random() * 1.5,
    vy: 0.15 + Math.random() * 0.4,
    vx: -0.1 + Math.random() * 0.24,
    phase: Math.random() * Math.PI * 2,
    ember: Math.random() < 0.06,
    alpha: 0.15 + Math.random() * 0.35
  });

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const target = Math.round(Math.min(70, (width * height) / 22000));
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
      f.x += (f.vx + Math.sin(f.phase) * 0.2) * dt;
      f.y += f.vy * dt;
      if (f.y > height + 8 || f.x < -8 || f.x > width + 8) Object.assign(f, make(false));
      ctx.fillStyle = f.ember
        ? "rgba(201, 92, 54, " + (f.alpha * (0.6 + 0.4 * Math.sin(f.phase * 3))) + ")"
        : "rgba(206, 197, 182, " + (f.alpha * 0.6) + ")";
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
    frameId = requestAnimationFrame(frame);
  }

  function play() {
    if (running || document.hidden) return;
    running = true;
    last = performance.now();
    frameId = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(frameId);
  }

  function start() {
    canvas = document.createElement("canvas");
    canvas.className = "ash-layer";
    canvas.setAttribute("aria-hidden", "true");
    ctx = canvas.getContext && canvas.getContext("2d");
    if (!ctx) return;
    document.body.append(canvas);
    resize();
    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : play()));
    // Zmiana ustawienia ruchu w trakcie wizyty wylacza popiol od razu.
    reduced.addEventListener("change", () => {
      if (reduced.matches) { stop(); canvas.remove(); }
    });
    play();
  }

  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 200));
  const begin = () => idle(start, { timeout: 2000 });
  if (document.readyState === "complete") begin();
  else window.addEventListener("load", begin, { once: true });
})();
