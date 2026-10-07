import type { ArrivalActions, ArrivalData, Person } from "@/lib/arrival";

/*
 * The arrival page, ported from the In Circle Arrival prototype. One ring stays centred:
 * the Circle mark is held to enter, blooms into the seats of the room, and every later
 * moment happens around it. The DOM inside `root` belongs to this engine, not to React.
 */

const LONDON = "Europe/London";

function esc(value: unknown) {
  return String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function londonParts(iso: string, zone = LONDON) {
  const parts: Record<string, string> = {};
  new Intl.DateTimeFormat("en-GB", { timeZone: zone, weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit", hour12: true })
    .formatToParts(new Date(iso)).forEach(part => { parts[part.type] = part.value; });
  const time = parts.hour + (parts.minute !== "00" ? ":" + parts.minute : "") + (parts.dayPeriod ?? "").toLowerCase().replace(/\s|\./g, "");
  return { weekday: parts.weekday, date: `${parts.weekday} ${parts.day} ${parts.month}`, dayMonth: `${parts.day} ${parts.month}`, time };
}

/** The hour of the Circle, like "7-8 pm", in UK time unless another zone is given. */
function hourRange(iso: string, zone = LONDON) {
  const part = (date: Date) => {
    const parts: Record<string, string> = {};
    new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "numeric", minute: "2-digit", hour12: true })
      .formatToParts(date).forEach(p => { parts[p.type] = p.value; });
    return { time: parts.hour + (parts.minute !== "00" ? ":" + parts.minute : ""), period: (parts.dayPeriod ?? "").toLowerCase().replace(/\s|\./g, "") };
  };
  const from = part(new Date(iso)), to = part(new Date(Date.parse(iso) + 60 * 60 * 1000));
  return from.period === to.period ? `${from.time}-${to.time} ${to.period}` : `${from.time} ${from.period}-${to.time} ${to.period}`;
}

/** The time zone of the guest's device, or UK time when it can't tell. */
function deviceZone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || LONDON; } catch { return LONDON; }
}

/** A short name for a time zone: "UK time", "ET" or "PT" in the US, else like "CEST" or "GMT+9". */
function zoneLabel(zone: string, iso: string) {
  if (zone === LONDON) return "UK time";
  const name = (locale: string, style: "short" | "shortGeneric") => {
    try {
      return new Intl.DateTimeFormat(locale, { timeZone: zone, timeZoneName: style }).formatToParts(new Date(iso)).find(p => p.type === "timeZoneName")?.value ?? "";
    } catch { return ""; }
  };
  const generic = name("en-US", "shortGeneric");
  return generic.length <= 3 ? generic : name("en-GB", "short");
}

/** The guest's own time beside UK time, when it differs. */
function localTime(iso: string, ukWeekday: string, range = false) {
  try {
    const start = new Date(iso);
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const key = (zone: string) => new Intl.DateTimeFormat("en-GB", { timeZone: zone, weekday: "short", hour: "2-digit", minute: "2-digit" }).format(start);
    if (!tz || key(tz) === key(LONDON)) return "";
    const parts: Record<string, string> = {};
    new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "long", hour: "numeric", minute: "2-digit", hour12: true })
      .formatToParts(start).forEach(part => { parts[part.type] = part.value; });
    const time = range ? hourRange(iso, tz) : parts.hour + (parts.minute !== "00" ? ":" + parts.minute : "") + parts.dayPeriod.toLowerCase();
    const day = parts.weekday !== ukWeekday ? " on " + parts.weekday : "";
    return ` (${time} your time${day})`;
  } catch { return ""; }
}

/** What to expect from each Circle's speaker, in Christina's words. Circles without one get a plain line. */
const SPEAKER_NOTES: Record<string, string> = {
  Alien: "You don't need to know any physics. Daniel's gift is making the biggest questions in science feel human and accessible. He'll take us through a few slides, with plenty of space for questions.",
};

const been = (before: boolean) => before ? "Been to a Circle before" : "First Circle";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

type Seat = { el: HTMLButtonElement; person: Person | null; you: boolean };

export function startArrival(root: HTMLElement, data: ArrivalData, actions: ArrivalActions) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = <T extends HTMLElement>(sel: string) => root.querySelector(sel) as T;
  const ring = $<HTMLDivElement>(".ring"), centre = $<HTMLDivElement>(".centre"), copy = $<HTMLDivElement>(".copy"), hold = $<HTMLButtonElement>(".hold");
  const body = document.body;
  const me = { ...data.me };
  const c = data.circle;
  const start = londonParts(c.startsAt), reveal = londonParts(c.revealAt);
  // The circle shows the start in the guest's own time, so it only says 7pm to someone in the UK.
  const zone = deviceZone(), mine = londonParts(c.startsAt, zone), mineTime = `${mine.time} ${zoneLabel(zone, c.startsAt)}`.trim();
  const doorsAt = new Date(Date.parse(c.startsAt) - 5 * 60 * 1000).toISOString(), doors = londonParts(doorsAt);
  const timers: number[] = [], intervals: number[] = [];
  let disposed = false;
  const later = (fn: () => void, ms: number) => { timers.push(window.setTimeout(() => { if (!disposed) fn(); }, ms)); };

  /* ---------- Seats: the speaker at the top, you near the bottom ---------- */
  const others = data.others.filter(p => !(me.speaker && p.speaker));
  const N = Math.max(10, c.seats, others.length + 1);
  const YOU = me.speaker ? 0 : Math.round(N * 8 / 15);
  const LOGO_TO_SEAT = Array.from({ length: 10 }, (_, j) => Math.round(j * N / 10));
  const logoOf = new Map(LOGO_TO_SEAT.map((s, j) => [s, j]));
  const R = 0.44, LOGO_R = 0.2;
  const queue = [...others.filter(p => p.speaker), ...others.filter(p => !p.speaker)];
  const seats: Seat[] = [];
  for (let k = 0; k < N; k++) {
    const you = k === YOU;
    const person = you ? null : queue.shift() ?? null;
    const el = document.createElement("button");
    el.type = "button";
    el.className = "seat" + ((person?.speaker || (you && me.speaker)) ? " speaker" : "") + (you ? " you" : "") + (logoOf.has(k) ? "" : " extra");
    el.innerHTML = "<i></i>";
    el.tabIndex = -1;
    el.setAttribute("aria-hidden", "true");
    el.setAttribute("aria-label", you ? "You" : person?.name ?? "A guest");
    ring.insertBefore(el, centre);
    seats.push({ el, person, you });
  }

  function pos(k: number, mode: "door" | "ring") {
    if (mode === "door") {
      const j = logoOf.get(k);
      if (j === undefined) return [0.5, 0.5];
      const a = j * Math.PI / 5;
      return [0.5 + LOGO_R * Math.sin(a), 0.5 - LOGO_R * Math.cos(a)];
    }
    const t = -Math.PI / 2 + k * 2 * Math.PI / N;
    return [0.5 + R * Math.cos(t), 0.5 + R * Math.sin(t)];
  }
  function place(mode: "door" | "ring", stagger: boolean) {
    const size = ring.clientWidth;
    seats.forEach(({ el }, k) => {
      const [x, y] = pos(k, mode);
      el.style.transitionDelay = stagger ? `${(logoOf.has(k) ? 0 : 0.5) + k * 0.02}s` : "0s";
      el.style.transform = `translate(${(x * size).toFixed(1)}px,${(y * size).toFixed(1)}px)`;
    });
  }
  function setMode(mode: string, stagger = false) {
    const wasDoor = ring.dataset.mode === "door";
    ring.dataset.mode = mode;
    place(mode === "door" ? "door" : "ring", stagger && wasDoor);
    const live = mode === "reveal" || mode === "early";
    seats.forEach(({ el, person, you }) => {
      const tappable = live && (Boolean(person) || you);
      el.tabIndex = tappable ? 0 : -1;
      el.setAttribute("aria-hidden", String(!tappable));
      el.classList.remove("sel");
    });
  }
  const onResize = () => place(ring.dataset.mode === "door" ? "door" : "ring", false);
  window.addEventListener("resize", onResize);

  function setCentre(html: string) {
    centre.classList.add("swap");
    later(() => { centre.innerHTML = html; centre.classList.remove("swap"); }, 300);
  }

  /* ---------- Words, one moment at a time ---------- */
  function show(parts: string[], after?: (el: HTMLElement) => void) {
    const render = () => {
      copy.classList.remove("leaving"); copy.style.minHeight = "";
      copy.innerHTML = parts.map((p, i) => p.replace(/^<(\w+)/, `<$1 style="animation-delay:${(0.1 + i * 0.16).toFixed(2)}s"`)).join("");
      copy.querySelectorAll(":scope > *").forEach(el => el.classList.add("say"));
      if (after) after(copy);
    };
    if (copy.children.length) { copy.classList.add("leaving"); later(render, 420); } else render();
  }
  function autosize(t: HTMLTextAreaElement) {
    const fit = () => { t.style.height = "auto"; t.style.height = t.scrollHeight + "px"; };
    t.addEventListener("input", fit); fit();
  }
  /** Runs a save; on failure the button comes back with a gentle note instead of moving on. */
  async function attempt(button: HTMLButtonElement, run: () => Promise<{ ok: boolean }>, next: () => void, refused?: string) {
    button.disabled = true;
    let trouble = "That didn't save. Please try again in a moment.";
    try {
      const result = await run();
      if (disposed) return;
      if (result.ok) return next();
      if (refused) trouble = refused;
    } catch { /* shown below */ }
    button.disabled = false;
    let note = copy.querySelector(".trouble");
    if (!note) { note = document.createElement("p"); note.className = "eyebrow trouble"; copy.appendChild(note); }
    note.textContent = trouble;
  }

  /* ---------- The door ---------- */
  const HOLD_MS = 1800;
  let lit = 0, raf = 0, t0 = 0, entered = false;
  const drawLit = (n: number) => LOGO_TO_SEAT.forEach((s, j) => seats[s].el.classList.toggle("lit", j < n));
  function tick(now: number) {
    const p = Math.min(1, (now - t0) / HOLD_MS), n = Math.floor(p * 10.999);
    if (n !== lit) { lit = n; drawLit(lit); navigator.vibrate?.(5); }
    if (p >= 1) { enter(); return; }
    raf = requestAnimationFrame(tick);
  }
  function press(e: Event) {
    if (entered) return;
    e.preventDefault();
    hold.classList.add("pressing"); t0 = performance.now(); raf = requestAnimationFrame(tick);
  }
  function release() {
    if (entered || !hold.classList.contains("pressing")) return;
    cancelAnimationFrame(raf); hold.classList.remove("pressing");
    if (performance.now() - t0 < 400) { const h = root.querySelector("#hint"); if (h) h.textContent = "Keep holding. It takes a moment."; }
    const fade = () => { if (lit <= 0 || hold.classList.contains("pressing")) return; lit--; drawLit(lit); later(fade, 70); };
    fade();
  }
  const onKeyDown = (e: KeyboardEvent) => { if ((e.key === " " || e.key === "Enter") && !e.repeat) press(e); };
  const onKeyUp = (e: KeyboardEvent) => { if (e.key === " " || e.key === "Enter") release(); };
  const noMenu = (e: Event) => e.preventDefault();
  hold.addEventListener("pointerdown", press);
  ["pointerup", "pointerleave", "pointercancel"].forEach(ev => hold.addEventListener(ev, release));
  hold.addEventListener("keydown", onKeyDown);
  hold.addEventListener("keyup", onKeyUp);
  hold.addEventListener("contextmenu", noMenu);

  /** Keep this link on this device. Only a person gets here, so email scanners that open links don't claim them. */
  let claimed = data.device !== "open";
  function claim() {
    if (claimed) return;
    claimed = true;
    actions.claim().then(result => { if (!disposed && !result.ok && result.reason === "elsewhere") S.elsewhere(); }).catch(() => {});
  }

  function enter() {
    entered = true; hold.classList.remove("pressing"); hold.hidden = true;
    claim();
    drawLit(0);
    body.classList.add("inside");
    show([]); copy.classList.add("leaving");
    setMode("kept", true);
    later(me.confirmed ? home : S.arrival, reduce ? 100 : 1500);
  }
  /** Any later view: the door is already behind you. */
  function arrive() { entered = true; hold.hidden = true; body.classList.add("inside"); }

  const titleCentre = (sub: string, time = "") => `<p class="c-title">${esc(c.title)}</p><p class="c-sub">${esc(sub)}${time ? `<br>${esc(time)}` : ""}</p>`;

  /* ---------- Scenes ---------- */
  const S = {
    door() {
      entered = false; lit = 0; drawLit(0); hold.hidden = false;
      body.classList.remove("inside");
      setMode("door"); centre.innerHTML = "";
      show([
        `<p class="voice">For ${esc(me.first)}</p>`,
        '<p class="hint" id="hint">Hold the circle to enter</p>',
      ].filter(Boolean));
    },

    arrival() {
      setCentre(titleCentre(mine.dayMonth));
      show([
        `<p class="big">${greeting()}, ${esc(me.first)}.</p>`,
        `<p class="voice">${me.speaker ? `Welcome to your Circle: ${esc(c.title)}` : `Welcome to the next Circle: ${esc(c.title)} with ${esc(c.speaker)}`}</p>`,
        me.speaker
          ? `<p class="small">${esc(start.date)} at ${esc(start.time)} UK time${esc(localTime(c.startsAt, start.weekday))}. We&#39;ve invited a group of curious minds, for one hour, to explore your question:</p>`
          : `<p class="small">${esc(start.date)} at ${esc(hourRange(c.startsAt))} UK time${esc(localTime(c.startsAt, start.weekday, true))}.${c.question ? ` Our question for ${esc(start.weekday)}:` : ""}</p>`,
        c.question ? `<p class="voice teaser">${esc(c.question)}</p>` : "",
        '<div class="actions"><button class="go" type="button" id="n">See my introduction</button></div>',
      ].filter(Boolean), el => { el.querySelector("#n")!.addEventListener("click", () => S.line(true)); });
    },

    line(first: boolean) {
      setMode("kept");
      setCentre(`<p class="c-title">You</p><p class="c-sub">Your seat</p>`);
      let beenBefore = me.beenBefore;
      if (!me.confirmed) actions.sawIntroduction().catch(() => {});
      show([
        '<p class="eyebrow">Before the Circle</p>',
        me.speaker
          ? '<p class="voice">This is how you&#39;ll appear in the Circle, alongside the guests.</p>' +
            (c.inviteUrl ? `<p class="small">You can see <a href="${esc(c.inviteUrl)}" target="_blank" rel="noopener">the invitation</a> we shared with guests.</p>` : "")
          : '<p class="voice">This is how the others will meet you.</p>',
        `<div class="person"><p class="who">${esc(me.name)}</p><p class="past" id="past">${been(beenBefore)}</p></div>`,
        `<div class="write plain"><label for="bio" class="visually-hidden">Your introduction</label><textarea id="bio" rows="2" maxlength="320">${esc(me.introduction)}</textarea></div>`,
        '<p class="eyebrow">Edit any way you like.</p>',
        me.speaker ? "" : '<div class="actions picks" role="group" aria-label="Your Circles"><button class="pick" type="button" data-c="0">This is my first Circle</button><button class="pick" type="button" data-c="1">I&#39;ve been to a Circle before</button></div>',
        `<div class="actions"><button class="go" type="button" id="share">Share with the circle</button>${me.speaker ? "" : '<button class="quiet" type="button" id="anon">Skip the introduction</button>'}</div>`,
      ].filter(Boolean), el => {
        const t = el.querySelector("#bio") as HTMLTextAreaElement; autosize(t);
        const picks = el.querySelectorAll<HTMLButtonElement>(".pick"), past = el.querySelector("#past")!;
        const mark = () => picks.forEach(b => b.setAttribute("aria-pressed", String((b.dataset.c === "1") === beenBefore)));
        picks.forEach(b => b.addEventListener("click", () => { beenBefore = b.dataset.c === "1"; past.textContent = been(beenBefore); mark(); }));
        mark();
        const save = (shared: boolean) => (e: Event) => {
          const introduction = t.value.trim() || me.introduction;
          if (!introduction) { t.focus(); return; }
          void attempt(e.currentTarget as HTMLButtonElement, () => actions.saveIntroduction({ introduction, shared, beenBefore }), () => {
            Object.assign(me, { introduction, shared, beenBefore, confirmed: true });
            (first ? S.belief : home)();
          });
        };
        el.querySelector("#share")!.addEventListener("click", save(true));
        // Skipping first invites them to share once more; skipping again is still one tap.
        el.querySelector("#anon")?.addEventListener("click", e => {
          const actions = (e.currentTarget as HTMLElement).parentElement!;
          actions.outerHTML = [
            '<p class="voice say">We&#39;d love the others to know you&#39;re here.</p>',
            '<p class="small say" style="animation-delay:.15s">Someone in this circle might be the conversation you&#39;ve been waiting for.</p>',
            '<div class="actions say" style="animation-delay:.3s" id="nudge"><button class="go" type="button" id="share2">Share with the circle</button><button class="quiet" type="button" id="stay">Skip the introduction</button></div>',
          ].join("");
          el.querySelector("#share2")!.addEventListener("click", save(true));
          el.querySelector("#stay")!.addEventListener("click", save(false));
        });
      });
    },

    belief() {
      setMode("belief");
      setCentre('<p class="c-title">Circle</p>');
      show([
        '<p class="eyebrow">What a Circle is</p>',
        '<p class="voice question">A new kind of online room.</p>',
        '<p class="small">Step out of the Zoom grid and into a space designed for this gathering.</p>',
        '<p class="small">A fascinating speaker, a circle of curious people, and questions that open up new perspectives.</p>',
        '<p class="voice teaser closing"><span>Each Circle gathers once, by invitation.</span><span>Every room is different.</span></p>',
        `<div class="actions"><button class="go" type="button" id="n">See you on ${esc(start.weekday)}</button></div>`,
      ], el => { el.querySelector("#n")!.addEventListener("click", home); });
    },

    settled() {
      arrive();
      if (me.cancelled) { setMode("gone"); return S.gone(); }
      setMode("early");
      setCentre(titleCentre(mine.date, mineTime));
      const status = !me.confirmed ? "We still need you to confirm how we&#39;ll introduce you to the others." : me.shared ? "Your introduction is ready for the others." : "The others will see just your name.";
      if (me.speaker && me.confirmed) return show([
        `<div class="person" id="person"><p class="big">That&#39;s everything, ${esc(me.first)}.</p><p class="small">Your introduction is ready for the guests. On ${esc(reveal.weekday)} the other seats light up, and you can see who&#39;ll be in the room with you.</p></div>`,
        '<div class="actions"><button class="quiet" type="button" id="edit">Change my introduction</button></div>',
      ], el => { el.querySelector("#edit")!.addEventListener("click", () => S.line(false)); });
      show([
        `<div class="person" id="person"><p class="big">That&#39;s everything, ${esc(me.first)}.</p><p class="small">${status} On ${esc(reveal.weekday)} the other seats light up. You can see who else is joining, and ask for introductions for after the Circle.</p>` +
          '<p class="small">Circles are small and kept with care. If your plans change, tell us as soon as you can so we can offer your seat to someone else.</p></div>',
        '<p class="eyebrow">Touch the glowing seats.</p>',
        `<div class="actions"><button class="quiet" type="button" id="edit">${me.confirmed ? "Change my introduction" : "Confirm my introduction"}</button>${me.speaker ? "" : '<button class="quiet" type="button" id="cant">I can no longer come</button>'}</div>`,
      ], el => {
        el.querySelector("#edit")!.addEventListener("click", () => S.line(false));
        el.querySelector("#cant")?.addEventListener("click", S.confirmCancel);
      });
    },

    confirmCancel() {
      show([
        `<p class="voice">Give up your seat at ${esc(c.title)}?</p>`,
        '<p class="small">We&#39;ll offer it to someone else.</p>',
        '<div class="actions"><button class="go" type="button" id="y">Yes, offer my seat</button><button class="quiet" type="button" id="n">Keep my seat</button></div>',
      ], el => {
        el.querySelector("#y")!.addEventListener("click", e => void attempt(e.currentTarget as HTMLButtonElement, () => actions.setCancelled(true), () => {
          me.cancelled = true; setMode("gone"); S.gone();
        }));
        el.querySelector("#n")!.addEventListener("click", home);
      });
    },

    gone() {
      setCentre(titleCentre(mine.date, mineTime));
      show([
        '<p class="voice">Thank you for telling us.</p>',
        '<p class="small">We&#39;ll offer your seat to someone else, and we hope to see you at the next Circle.</p>',
        '<div class="actions"><button class="quiet" type="button" id="back">I can come after all</button></div>',
      ], el => {
        el.querySelector("#back")!.addEventListener("click", e => void attempt(e.currentTarget as HTMLButtonElement, () => actions.setCancelled(false), () => {
          me.cancelled = false; home();
        }));
      });
    },

    reveal() {
      arrive();
      setMode("reveal");
      setCentre(`<p class="c-title">${esc(c.title)}</p>`);
      show([
        '<p class="voice" id="arrived">The others have arrived.</p>',
        '<div class="person" id="person"><p class="small">Touch any seat to meet them. If there&#39;s someone you&#39;d like to know, request an introduction.</p></div>',
        c.roomUrl && londonParts(new Date().toISOString()).date === start.date
          ? `<div class="room-link"><p class="eyebrow ceremony">Tonight&#39;s room:</p><p class="small countdown" id="countdown"></p><div class="actions"><button class="go beacon" type="button" id="enter-now">Enter Circle</button></div><p class="small">The doors open at ${esc(doors.time)} UK time${esc(localTime(doorsAt, doors.weekday))}.</p></div>`
          : `<div class="room-link"><p class="eyebrow ceremony">The link to the room will appear here on ${esc(start.weekday)}. It will also be in your Luma invitation and calendar.</p></div>`,
        me.speaker ? "" : '<div class="actions"><button class="quiet" type="button" id="expect">What to expect</button><button class="quiet" type="button" id="cant">I can no longer come</button></div>',
      ].filter(Boolean), el => {
        el.querySelector("#expect")?.addEventListener("click", S.expect);
        el.querySelector("#cant")?.addEventListener("click", S.confirmCancel);
        el.querySelector("#enter-now")?.addEventListener("click", S.enterRoom);
        const tick = () => {
          const out = root.querySelector("#countdown");
          if (!out) return;
          const left = Math.max(0, Math.ceil((Date.parse(c.startsAt) - Date.now()) / 60000));
          const h = Math.floor(left / 60), m = left % 60, unit = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
          out.textContent = left ? `Circle starts in ${h ? `${unit(h, "hour")}: ` : ""}${unit(m, "minute")}` : "Circle starts now.";
        };
        if (el.querySelector("#countdown")) { tick(); intervals.push(window.setInterval(tick, 15000)); }
      });
    },

    /** How the hour itself will go, for guests. */
    expect() {
      const doorsLocal = localTime(doorsAt, doors.weekday);
      setMode("kept");
      setCentre(titleCentre(mine.date, mineTime));
      show([
        '<p class="eyebrow">What to expect</p>',
        `<p class="voice">${esc(start.weekday)} at ${esc(start.time)} UK time${esc(localTime(c.startsAt, start.weekday))}.</p>`,
        `<div class="person"><p class="small">The doors open at ${esc(doors.time)}${esc(doorsLocal && " UK time" + doorsLocal)}. Come a few minutes early, so we can begin together at ${esc(start.time.replace(/(am|pm)$/, ""))}.</p>` +
          '<p class="small">This is a space where you don&#39;t need to sell, buy, or prove anything. Just be in the room.</p>' +
          `<p class="small">${esc(SPEAKER_NOTES[c.title] ?? `${c.speaker.split(" ")[0]} will take us through a few slides, with plenty of space for questions.`)} Everyone has already been introduced here, so no need to reference your work.</p>` +
          '<p class="small">Nothing is recorded. Be yourself.</p>' +
          '<p class="small">Questions are always best when the whole room wants to hear the answer.</p>' +
          '<p class="small">A few things that make a Circle more enjoyable: a quiet, comfortable space, not too bright. Camera on. Laptop over mobile if you can. Good wifi. And maybe a cup of tea.</p></div>',
        '<p class="voice teaser closing"><span>We&#39;re glad you&#39;re here.</span></p>',
        '<div class="actions"><button class="quiet" type="button" id="back">Back</button></div>',
      ], el => { el.querySelector("#back")!.addEventListener("click", home); });
    },

    day() {
      arrive();
      intervals.splice(0).forEach(clearInterval);
      setMode("day");
      const lightHere = (ids: string[]) => {
        const set = new Set(ids);
        seats.forEach(s => s.el.classList.toggle("here", Boolean(s.person && set.has(s.person.id))));
        const count = root.querySelector("#count");
        if (count) count.textContent = `${seats.filter(s => s.el.classList.contains("here")).length + 1} here`;
      };
      setCentre(`<p class="c-title" id="count">1 here</p><p class="c-sub">${esc(start.time)} UK time</p>`);
      show([
        `<p class="eyebrow">${esc(start.date)}</p>`,
        '<p class="big">Tonight.</p>',
        `<p class="small" id="status">We open the doors at ${esc(doors.time)}.</p>`,
        '<div class="actions later" id="act"><button class="go" type="button" id="enter">Enter the room</button></div>',
        me.speaker ? "" : '<div class="actions"><button class="quiet" type="button" id="expect">What to expect</button></div>',
      ].filter(Boolean), el => {
        el.querySelector("#expect")?.addEventListener("click", S.expect);
        later(() => lightHere(others.filter(p => p.here).map(p => p.id)), 400);
        el.querySelector("#enter")!.addEventListener("click", S.enterRoom);
        const open = () => {
          const st = root.querySelector("#status") as HTMLElement | null, act = root.querySelector("#act") as HTMLElement | null;
          if (!st || !act || !act.classList.contains("later")) return;
          st.classList.remove("say"); void st.offsetWidth; st.textContent = "The doors are open."; st.classList.add("say");
          act.classList.remove("later"); act.style.animationDelay = "0s"; act.classList.remove("say"); void act.offsetWidth; act.classList.add("say");
        };
        const check = () => { if (Date.now() >= Date.parse(doorsAt) && c.roomUrl) open(); };
        check();
        intervals.push(window.setInterval(async () => {
          check();
          try { lightHere(await actions.whoIsHere()); } catch { /* the ring simply stays as it is */ }
        }, 30000));
      });
    },

    enterRoom() {
      if (!c.roomUrl) return;
      ring.dataset.mode = "enter";
      show(['<p class="voice">Walking you in.</p>']);
      later(() => { window.location.href = c.roomUrl!; }, reduce ? 0 : 1400);
    },

    after() {
      arrive();
      setMode("kept");
      setCentre(titleCentre(mine.dayMonth));
      show([
        `<p class="voice">Thank you for being part of ${esc(c.title)}, ${esc(me.first)}.</p>`,
        '<p class="small">We hope to see you at the next Circle.</p>',
      ]);
    },

    elsewhere() {
      entered = true; hold.hidden = true;
      setMode("door"); centre.innerHTML = "";
      show([
        `<p class="voice">For ${esc(me.first)}</p>`,
        '<p class="small">This link is already open on another device. To open it here too, type the email your invitation went to.</p>',
        '<form class="write plain" id="fresh"><label for="email" class="visually-hidden">Your email</label><input id="email" type="email" required autocomplete="email" placeholder="Your email"></form>',
        '<div class="actions"><button class="go" type="submit" form="fresh" id="send">Open it here</button></div>',
      ], el => {
        const form = el.querySelector("#fresh") as HTMLFormElement;
        form.addEventListener("submit", e => {
          e.preventDefault();
          const email = (el.querySelector("#email") as HTMLInputElement).value;
          void attempt(el.querySelector("#send") as HTMLButtonElement, () => actions.addThisDevice(email), () => window.location.reload(),
            "That email doesn't match this invitation. Please check it, or write to Christina.");
        });
      });
    },
  };

  /** Where a returning guest belongs, by date. */
  function home() {
    if (me.cancelled) return S.settled();
    if (data.phase === "after") return S.after();
    if (data.phase === "day") return S.day();
    if (data.phase === "reveal") return S.reveal();
    return S.settled();
  }

  // Touch a seat and that person takes the centre of the ring: before the reveal only you and the speaker, after it everyone.
  seats.forEach(({ el, person, you }) => {
    el.addEventListener("click", () => {
      if ((ring.dataset.mode !== "reveal" && ring.dataset.mode !== "early") || (!person && !you)) return;
      seats.forEach(s => s.el.classList.remove("sel")); el.classList.add("sel");
      // After the first touch the welcome line steps aside, so the introduction sits closer to the ring.
      const arrived = root.querySelector<HTMLElement>("#arrived");
      if (arrived) {
        copy.style.minHeight = `${copy.offsetHeight}px`; // the ring stays where it is; only the words below it move up
        arrived.removeAttribute("id"); arrived.style.height = `${arrived.offsetHeight}px`; arrived.classList.remove("say");
        void arrived.offsetHeight; arrived.classList.add("stepping-aside");
        later(() => arrived.remove(), 700);
      }
      const sub = person?.speaker ? "Speaker" : been(you ? me.beenBefore : Boolean(person?.beenBefore));
      setCentre(`<p class="c-title">${esc(you ? "You" : person!.name)}</p><p class="c-sub">${sub}</p>`);
      const box = root.querySelector("#person"); if (!box) return;
      const bio = you ? (me.shared ? me.introduction : "The others will see just your name.") : person!.shared ? person!.introduction : "";
      box.innerHTML = (bio ? `<p class="bio say">${esc(bio)}</p>` : "") +
        (you ? (ring.dataset.mode === "reveal" ? '<button class="quiet say" style="animation-delay:.15s" type="button" id="mine">Change my introduction</button>' : "")
          : person!.speaker && ring.dataset.mode !== "reveal" ? "" : '<div class="actions say" style="animation-delay:.15s"><button class="go" type="button" id="ask">Request an introduction</button></div>');
      box.querySelector("#mine")?.addEventListener("click", () => S.line(false));
      box.querySelector("#ask")?.addEventListener("click", () => {
        box.innerHTML = `<div class="write plain say"><label class="small" for="why" style="display:block">What would you like to talk to ${esc(person!.first)} about?</label><textarea id="why" rows="1" maxlength="600"></textarea></div>` +
          '<div class="actions say" style="animation-delay:.15s"><button class="go" type="button" id="send" disabled>Send to Christina</button></div>';
        const t = box.querySelector("#why") as HTMLTextAreaElement, send = box.querySelector("#send") as HTMLButtonElement;
        autosize(t); t.focus();
        t.addEventListener("input", () => { send.disabled = !t.value.trim(); });
        send.addEventListener("click", () => void attempt(send, () => actions.requestIntroduction(person!.id, t.value), () => {
          box.innerHTML = '<p class="voice say">Leave it with us.</p><p class="small say" style="animation-delay:.15s">Christina will be in touch after the Circle.</p>';
        }));
      });
    });
  });

  /* ---------- Begin ---------- */
  if (data.device === "elsewhere") S.elsewhere();
  else if (data.firstVisit && !me.cancelled && data.phase !== "after") S.door();
  else if (!me.confirmed && !me.cancelled && data.phase !== "after") { arrive(); setMode("kept"); S.arrival(); }
  else home();

  // Without the door (a cancelled guest, or after the Circle) there is no hold, so keep the link right away.
  if (data.device === "open" && !(data.firstVisit && !me.cancelled && data.phase !== "after")) claim();

  return () => {
    disposed = true;
    timers.forEach(clearTimeout); intervals.forEach(clearInterval);
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", onResize);
    hold.removeEventListener("pointerdown", press);
    ["pointerup", "pointerleave", "pointercancel"].forEach(ev => hold.removeEventListener(ev, release));
    hold.removeEventListener("keydown", onKeyDown);
    hold.removeEventListener("keyup", onKeyUp);
    hold.removeEventListener("contextmenu", noMenu);
    seats.forEach(s => s.el.remove());
    body.classList.remove("inside");
  };
}
