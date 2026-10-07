/*
 * The first glimpse of the next Circle, Beauty: Christina's Oxblood rose (ported from her
 * unfold room's Rose.tsx), opening and letting go of a petal every few seconds.
 * It lies over the after page and goes away again with Next, which moves the guest on.
 */

const NS = "http://www.w3.org/2000/svg";

function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

const SHAPES = [
  "M0,0 C-46,-16 -60,-58 -41,-88 C-27,-110 -9,-116 2,-120 C15,-112 30,-102 43,-80 C57,-48 40,-14 0,0",
  "M0,0 C-39,-20 -58,-50 -46,-84 C-36,-108 -14,-118 1,-121 C13,-116 33,-98 41,-74 C52,-42 38,-12 0,0",
  "M0,0 C-44,-12 -55,-62 -38,-92 C-24,-112 -6,-119 3,-117 C18,-110 27,-96 40,-86 C58,-56 44,-16 0,0",
  "M0,0 C-41,-18 -62,-54 -44,-90 C-30,-114 -11,-120 0,-118 C14,-114 29,-104 44,-78 C55,-50 39,-13 0,0",
];
/** Petal count, length, gradient, filter and angle offset, from the outside in. */
const RINGS: [number, number, string, string, number][] = [
  [12, 182, "bz1", "bzFar", 0], [10, 148, "bz2", "bzFar", 14], [9, 116, "bz3", "bzMid", 7],
  [8, 88, "bz4", "bzMid", 22], [7, 62, "bz5", "bzNear", 11], [5, 40, "bz5", "bzNear", 30],
];
const GEOMETRY = [
  { cx: "52%", cy: "92%", r: "92%", mid: "46%" }, { cx: "48%", cy: "92%", r: "88%", mid: "48%" },
  { cx: "54%", cy: "94%", r: "86%", mid: "46%" }, { cx: "50%", cy: "95%", r: "84%", mid: "40%" },
  { cx: "48%", cy: "96%", r: "80%", mid: "34%" },
];
const PETALS = [
  ["#5e1520", "#3a0e17", "#150a0e"], ["#77202a", "#46101a", "#1c0a10"], ["#8e2f33", "#55141f", "#240b11"],
  ["#b05a4e", "#6a1a24", "#2c0c13"], ["#d9a889", "#8d3535", "#3a1018"],
];
const CORE = ["#f0dcc4", "#a8503f", "#3a1018"];
const KEY_LIGHT = 38, PACE = 0.45;

function roseSvg() {
  const filter = (id: string, freq: string, octaves: number, seed: number, scale: number, blur: number) =>
    `<filter id="${id}" x="-30%" y="-30%" width="160%" height="160%"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="${octaves}" seed="${seed}"/>` +
    `<feDisplacementMap in="SourceGraphic" scale="${scale}" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation="${blur}"/></filter>`;
  let html = "<defs>";
  GEOMETRY.forEach((g, i) => {
    const c = PETALS[i];
    html += `<radialGradient id="bz${i + 1}" cx="${g.cx}" cy="${g.cy}" r="${g.r}"><stop offset="0" stop-color="${c[0]}"/><stop offset="${g.mid}" stop-color="${c[1]}"/><stop offset="100%" stop-color="${c[2]}"/></radialGradient>`;
  });
  html += `<radialGradient id="bzCore" cx="44%" cy="38%" r="60%"><stop offset="0" stop-color="${CORE[0]}" stop-opacity=".55"/><stop offset="42%" stop-color="${CORE[1]}" stop-opacity=".32"/><stop offset="100%" stop-color="${CORE[2]}" stop-opacity="0"/></radialGradient>`;
  html += filter("bzFar", "0.013 0.022", 3, 3, 20, 6.5) + filter("bzMid", "0.011 0.02", 3, 7, 17, 1.1) + filter("bzNear", "0.016 0.026", 4, 11, 13, 0.5);
  html += '<filter id="bzSoft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="11"/></filter></defs><g>';
  const rnd = makeRng(20260914);
  const total = RINGS.reduce((n, r) => n + r[0], 0);
  let index = 0;
  RINGS.forEach(([count, length, gradient, blur, offset], ring) => {
    for (let i = 0; i < count; i++) {
      const angle = offset + i * 360 / count + (rnd() * 18 - 9);
      const lit = Math.cos((angle - KEY_LIGHT) * Math.PI / 180);
      const d = SHAPES[Math.floor(rnd() * 4)];
      const size = (length / 120) * (0.86 + rnd() * 0.24);
      const tilt = rnd() * 14 - 7;
      const opacity = 0.62 + 0.38 * (lit * 0.5 + 0.5);
      const delay = (ring * 2.9 + (index / total) * 2.6 + (i % 7) * 0.1) * PACE;
      const dur = (6.5 + ring * 0.7) * Math.max(0.35, PACE);
      html += `<path class="bz-petal" data-ring="${ring}" data-a="${angle.toFixed(2)}" data-s="${size.toFixed(3)}" data-t="${tilt.toFixed(2)}" data-o="${opacity.toFixed(3)}" d="${d}" fill="url(#${gradient})" filter="url(#${blur})" ` +
        `style="--a:${angle.toFixed(2)}deg;--s:${size.toFixed(3)};--t:${tilt.toFixed(2)}deg;--o:${opacity.toFixed(3)};animation:bzOpen ${dur.toFixed(2)}s cubic-bezier(.2,.66,.3,1) ${delay.toFixed(2)}s forwards, bzSway ${(15 + ring * 1.4).toFixed(1)}s ease-in-out ${(delay + dur).toFixed(2)}s infinite"/>`;
      index++;
    }
  });
  return html + '<ellipse cx="-6" cy="-10" rx="46" ry="42" fill="url(#bzCore)" filter="url(#bzSoft)"/></g><g class="bz-fall"></g>';
}

type Falling = { g: SVGGElement; x: number; y: number; a: number; s: number; t: number; o: number; vx: number; vy: number; spin: number; phase: number; age: number };

/** Opens the Beauty page. `ask` saves the guest's wish to be considered; returns a function that closes it. */
export function openBeauty(ask: () => Promise<{ ok: boolean }>, onClose: () => void) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const page = document.createElement("section");
  page.className = "beauty";
  page.setAttribute("aria-label", "The next Circle: Beauty");
  page.innerHTML =
    '<div class="bz-glow" aria-hidden="true"></div>' +
    `<svg class="bz-rose" viewBox="-280 -230 560 1000" aria-hidden="true">${roseSvg()}</svg>` +
    '<div class="bz-key" aria-hidden="true"></div><div class="bz-vignette" aria-hidden="true"></div>' +
    '<svg class="bz-grain" aria-hidden="true"><filter id="bzGrain"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(#bzGrain)"/></svg>' +
    '<div class="bz-words">' +
    '<p class="bz-eyebrow">The next Circle</p>' +
    '<h2 class="bz-title">Beauty</h2>' +
    '<p class="bz-lede">Our guest is one of the world&#39;s leading thinkers on beauty.</p>' +
    '<p class="bz-sub">An intimate Circle, by invitation. You are seeing it first.</p>' +
    '<div class="bz-ask"><button class="bz-invite" type="button">I&#39;d love to be considered</button></div>' +
    '<button class="bz-back" type="button">Next</button>' +
    "</div>";
  document.body.appendChild(page);
  document.body.classList.add("in-beauty");
  requestAnimationFrame(() => page.classList.add("open"));

  const svg = page.querySelector(".bz-rose") as SVGSVGElement;
  const fall = page.querySelector(".bz-fall") as SVGGElement;
  const falling: Falling[] = [];
  const timers: number[] = [];
  let frame = 0, last = performance.now(), closed = false;

  function release() {
    const outer = Array.from(svg.querySelectorAll<SVGPathElement>(".bz-petal:not(.gone)")).filter(p => Number(p.dataset.ring) <= 2);
    if (!outer.length) return;
    const petal = outer[Math.floor(Math.random() * outer.length)];
    const a = Number(petal.dataset.a), s = Number(petal.dataset.s), ring = Number(petal.dataset.ring);
    const g = document.createElementNS(NS, "g") as SVGGElement;
    const path = document.createElementNS(NS, "path");
    path.setAttribute("d", petal.getAttribute("d")!);
    path.setAttribute("fill", petal.getAttribute("fill")!);
    path.setAttribute("filter", ring === 0 ? "url(#bzMid)" : petal.getAttribute("filter")!);
    g.appendChild(path);
    fall.appendChild(g);
    const rad = (a - 90) * Math.PI / 180, reach = 70 * s;
    falling.push({ g, x: Math.cos(rad) * reach, y: Math.sin(rad) * reach, a, s: s * 0.62, t: Number(petal.dataset.t), o: Number(petal.dataset.o),
      vx: Math.random() - 0.5, vy: 4, spin: Math.random() - 0.5, phase: Math.random() * 6.28, age: 0 });
    petal.classList.add("gone");
    timers.push(window.setTimeout(() => petal.classList.remove("gone"), 16000 + Math.random() * 8000));
  }

  function step(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    for (let i = falling.length - 1; i >= 0; i--) {
      const f = falling[i];
      f.age += dt;
      f.vy = Math.min(f.vy + 14 * dt, 48);
      f.x += (f.vx * 30 + Math.sin(f.phase + f.age * 1.1) * 26) * dt;
      f.y += f.vy * dt;
      f.a += (f.spin * 40 + Math.sin(f.phase + f.age * 0.8) * 20) * dt;
      const fade = f.y > 620 ? Math.max(0, 1 - (f.y - 620) / 150) : 1;
      const squash = 0.7 + 0.3 * Math.cos(f.age * 1.4 + f.phase);
      f.g.setAttribute("transform", `translate(${f.x.toFixed(1)} ${f.y.toFixed(1)}) rotate(${(f.a + f.t).toFixed(1)}) scale(${f.s.toFixed(3)} ${(f.s * squash).toFixed(3)})`);
      f.g.setAttribute("opacity", (f.o * fade).toFixed(3));
      if (f.y > 780) { f.g.remove(); falling.splice(i, 1); }
    }
    frame = requestAnimationFrame(step);
  }

  if (!reduce) {
    frame = requestAnimationFrame(step);
    timers.push(window.setTimeout(() => { release(); timers.push(window.setInterval(release, 2200)); }, 4500));
  }

  const invite = page.querySelector(".bz-invite") as HTMLButtonElement;
  invite.addEventListener("click", async () => {
    invite.disabled = true;
    try {
      const result = await ask();
      if (result.ok) {
        page.querySelector(".bz-ask")!.innerHTML = '<p class="bz-thanks">Thank you. We&#39;ll be in touch.</p>';
        return;
      }
    } catch { /* the button comes back */ }
    invite.disabled = false;
  });

  function close() {
    if (closed) return;
    closed = true;
    cancelAnimationFrame(frame);
    timers.forEach(t => { clearTimeout(t); clearInterval(t); });
    document.body.classList.remove("in-beauty");
    page.classList.remove("open");
    window.setTimeout(() => page.remove(), reduce ? 0 : 900);
  }
  (page.querySelector(".bz-back") as HTMLButtonElement).addEventListener("click", () => { close(); onClose(); });
  invite.focus({ preventScroll: true });
  return close;
}
