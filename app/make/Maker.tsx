"use client";

import { type ChangeEvent, type CSSProperties, type FormEvent, useEffect, useRef, useState } from "react";
import { CircleMark } from "@/components/CircleMark";
import { ARRIVALS, type Brand, PURPOSES, RHYTHMS, SIZES, pictureColours, roomColours } from "@/lib/brand";
import { readBrand, type Reading } from "./actions";
import { Arrival, BrandFonts, Closing, type Moment, Room, Welcome, brandStyle } from "./RoomPreview";

/** Where "Reserve my room" goes. Empty until Christina adds the Stripe payment link. */
const PAYMENT_LINK = "";

type Step = "site" | "size" | "purpose" | "name" | "look" | "room" | "reserve";
const QUESTIONS: Step[] = ["site", "size", "purpose", "name", "look"];

type Backing = Brand["logoBacking"];
type Logo = { url: string; backing: Backing; ratio: number };

/**
 * What a logo file sits on, from its corners: nothing, white, black, or a box of its own colour
 * (Speedrun's moving gradient). Also its shape, so a mark can be filled at its own proportions.
 * A logo from another site that won't let itself be read is treated as boxed, so its edges melt into the room.
 */
function readLogo(url: string, remote = false): Promise<Logo> {
  return new Promise(resolve => {
    const img = new Image();
    if (remote) img.crossOrigin = "anonymous";
    img.onload = () => {
      const ratio = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 3;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 32;
        const context = canvas.getContext("2d");
        if (!context) return resolve({ url, backing: "clear", ratio });
        context.drawImage(img, 0, 0, 32, 32);
        const corners = [[0, 0], [31, 0], [0, 31], [31, 31]].map(([x, y]) => context.getImageData(x, y, 1, 1).data);
        if (corners.some(c => c[3] < 200)) return resolve({ url, backing: "clear", ratio });
        const light = corners.reduce((sum, c) => sum + (c[0] + c[1] + c[2]) / 3, 0) / 4;
        resolve({ url, backing: light > 200 ? "light" : light < 55 ? "dark" : "boxed", ratio });
      } catch {
        resolve({ url, backing: "boxed", ratio });
      }
    };
    img.onerror = () => resolve({ url, backing: remote ? "boxed" : "clear", ratio: 3 });
    img.src = url;
  });
}

/** Reads a picture's colours in the browser; nothing leaves the host's computer. */
function readPicture(url: string): Promise<ReturnType<typeof pictureColours> | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 48;
      const context = canvas.getContext("2d");
      if (!context) return resolve(null);
      context.drawImage(img, 0, 0, 48, 48);
      resolve(pictureColours(context.getImageData(0, 0, 48, 48).data));
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/** The moods of entercircle.co's own room, and the words that lean a gathering towards each. */
const MOODS = [
  { name: "Warm", hue: 30, words: /\b(warm|candle|gold|amber|sun|honey|cos[yi]|hearth|autumn|home|earth|wood|glow)/g },
  { name: "Alive", hue: 120, words: /\b(alive|forest|green|nature|garden|grow|plant|spring|fresh|leaf|wild|energ|mindful|wellbeing|health)/g },
  { name: "Calm", hue: 185, words: /\b(calm|sea|ocean|water|breath|still|quiet|peace|soft|rest|slow|sky|blue|clear|gentle|meditat)/g },
  { name: "Mystic", hue: 240, words: /\b(night|star|space|cosm|alien|physics|moon|dream|myst|magic|universe|future|deep)/g },
  { name: "Intimate", hue: 305, words: /\b(intimate|rose|pink|love|tender|feminin|sister|heart|close|vulnerab|sacred|body|embod)/g },
  { name: "Ardent", hue: 360, words: /\b(bold|red|passion|oxblood|wine|blood|fierce|ardent|power|desire|burn|fire|sensual|crimson)/g },
];

/** The mood the host's words lean towards most, or -1 while nothing leans. */
function moodOf(words: string) {
  const text = words.toLowerCase();
  let best = -1, most = 0;
  MOODS.forEach((m, i) => {
    const count = text.match(m.words)?.length ?? 0;
    if (count > most) { best = i; most = count; }
  });
  return best;
}

/** Where a hue sits along the moods, from 0 (Warm) to 1 (Ardent). */
function along(hue: number) {
  const i = Math.max(0, MOODS.findIndex((m, k) => k === MOODS.length - 1 || hue < MOODS[k + 1].hue));
  if (i >= MOODS.length - 1) return 1;
  return (i + (hue - MOODS[i].hue) / (MOODS[i + 1].hue - MOODS[i].hue)) / (MOODS.length - 1);
}

function hsl(hue: number, saturation: number, lightness: number, alpha = 1) {
  return `hsl(${hue.toFixed(1)} ${saturation}% ${lightness}% / ${alpha.toFixed(3)})`;
}

/**
 * The light listening while the host writes, as entercircle.co's own room does: it drifts slowly, wanders through
 * the moods while nothing is written, then turns towards the mood the words lean to.
 */
function useListening(mood: number, writing: boolean) {
  const [light, setLight] = useState({ hue: 30, x: 56, y: 50 });
  const aim = useRef({ mood, writing });
  useEffect(() => { aim.current = { mood, writing }; }, [mood, writing]);
  useEffect(() => {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0, start = 0, hue = 30;
    const tick = (now: number) => {
      if (!start) start = now;
      const t = (now - start) / 1000;
      const { mood, writing } = aim.current;
      const goal = mood >= 0 ? MOODS[mood].hue : writing || still ? hue : 30 + 165 * (1 - Math.cos((t * 2 * Math.PI) / 56));
      hue += (goal - hue) * (still ? 1 : .025);
      setLight(still ? { hue, x: 56, y: 50 } : {
        hue,
        x: 56 + Math.sin(t * .38) * 9 + Math.sin(t * .17) * 5,
        y: 50 + Math.cos(t * .28) * 7 + Math.cos(t * .21) * 4,
      });
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, []);
  return light;
}

/**
 * The room beside the questions. While the host writes, a light listens and turns towards their mood;
 * once Circle has read them, the room takes on its own colours.
 */
function Forming({ brand, seats, caption, words, listening }: { brand: Brand | null; seats: number; caption: string; words: string; listening: boolean }) {
  const mood = moodOf(words);
  const { hue, x, y } = useListening(mood, !!words.trim());
  // No seats while the host writes: only the light listens. The ring appears once the room is read.
  const filled = brand ? seats : 0;
  // The light grows a little as the gathering is described.
  const strength = .42 + Math.min(1, words.trim().length / 240) * .2;
  const at = `${x.toFixed(1)}% ${y.toFixed(1)}%`;
  return (
    <aside className="mk-forming" style={{ ...(brand ? brandStyle(brand) : {}), "--mk-mood": hsl(hue, 62, 68) } as CSSProperties} data-read={brand ? "" : undefined} aria-hidden="true">
      <div className="mk-listen" style={{
        background: [
          `radial-gradient(ellipse at ${at}, transparent 0%, rgba(0,0,0,.5) 70%, rgba(0,0,0,.8) 100%)`,
          `radial-gradient(ellipse 64% 60% at ${at}, ${hsl(hue, 62, 68, strength)} 0%, ${hsl(hue, 50, 48, strength * .55)} 30%, ${hsl(hue, 45, 28, strength * .22)} 55%, transparent 74%)`,
          `radial-gradient(ellipse 30% 28% at ${at}, ${hsl(hue, 62, 74, .24)} 0%, transparent 70%)`,
          hsl(hue, 55, 10),
        ].join(", "),
      }} />
      <div className="mk-forming-brand" />
      <div className="mk-forming-light" />
      <div className="mk-forming-ring">
        {Array.from({ length: seats }, (_, i) => {
          const a = (i * 2 * Math.PI) / seats - Math.PI / 2;
          return <span key={i} className="mk-forming-seat" data-filled={i < filled ? "" : undefined} style={{ left: `${50 + 44 * Math.cos(a)}%`, top: `${50 + 44 * Math.sin(a)}%`, transitionDelay: brand ? `${i * 60}ms` : undefined }} />;
        })}
      </div>
      {listening && !brand ? (
        <div className="mk-moods" style={{ "--mk-along": `${(along(hue) * 100).toFixed(2)}%` } as CSSProperties}>
          <div className="mk-moods-names">
            {MOODS.map((m, i) => <span key={m.name} data-near={Math.abs(along(hue) - i / (MOODS.length - 1)) < .1 ? "" : undefined}>{m.name}</span>)}
          </div>
          <div className="mk-moods-line"><i /></div>
        </div>
      ) : (
        <p className="mk-forming-caption">{caption}</p>
      )}
    </aside>
  );
}

/** The room maker: four questions, an optional look, then the host walks through their own room. */
export function Maker() {
  const [step, setStep] = useState<Step>("site");
  const [address, setAddress] = useState("");
  const [gathering, setGathering] = useState("");
  const [withSite, setWithSite] = useState(false);
  const [size, setSize] = useState<(typeof SIZES)[number]["id"]>("circle");
  const [purpose, setPurpose] = useState<string>("");
  const [name, setName] = useState("");
  const [rhythm, setRhythm] = useState<string>("Every week");
  const [reading, setReading] = useState<Reading | null>(null);
  const [error, setError] = useState("");
  const [logo, setLogo] = useState<Logo | null>(null);
  const [siteLogo, setSiteLogo] = useState<Logo | null>(null);
  const [mood, setMood] = useState<{ url: string; colours: ReturnType<typeof pictureColours> | null } | null>(null);
  const [moment, setMoment] = useState<Moment>("welcome");
  const pending = useRef<Promise<Reading> | null>(null);
  const named = useRef(false);

  const read = reading?.status === "read" ? reading.brand : null;
  const seats = SIZES.find(s => s.id === size)!.seats;

  // The host's own pictures win over what the site said: their logo is the mark, their mood picture lends its colour.
  const brand: Brand | null = read && {
    ...read,
    // With no website, the room carries the name the host gives it.
    name: read.name || name || "Circle",
    // When the host's mark is a clean shape and the site's own logo sits in a box of colour, the site's logo fills the
    // mark, the way the Speedrun room shows its moving gradient only through its letters.
    ...(logo && logo.backing === "clear" && siteLogo?.backing === "boxed"
      ? { logo: logo.url, logoBacking: "clear" as const, texture: siteLogo.url, logoRatio: logo.ratio }
      : logo ? { logo: logo.url, logoBacking: logo.backing, logoRatio: logo.ratio }
      : { logo: read.logo, logoBacking: siteLogo?.url === read.logo ? siteLogo.backing : "boxed" as const }),
    mood: mood?.url ?? null,
    // Stars gather into a name only when there's no mark; once the host adds one, the mark breathes instead.
    arrival: logo && read.arrival === "gather" ? "breathe" : read.arrival,
    // The picture lends its colour to the room; the website still decides whether the room is light or dark.
    ...(mood?.colours?.main ? { colours: roomColours(read.colours.brand, mood.colours.main, read.dark) } : {}),
  };

  useEffect(() => {
    if (read && !named.current) { setName(read.name); named.current = true; }
  }, [read]);

  const readLogoUrl = read?.logo;
  useEffect(() => {
    if (readLogoUrl) readLogo(readLogoUrl, true).then(setSiteLogo);
  }, [readLogoUrl]);

  // Free each picture once it's replaced; keyed on the address so reading its colours doesn't revoke it.
  const moodUrl = mood?.url, logoUrl = logo?.url;
  useEffect(() => () => { if (logoUrl) URL.revokeObjectURL(logoUrl); }, [logoUrl]);
  useEffect(() => () => { if (moodUrl) URL.revokeObjectURL(moodUrl); }, [moodUrl]);

  function startReading(e: FormEvent) {
    e.preventDefault();
    setError("");
    setReading(null);
    named.current = false;
    const promise = readBrand(address, gathering);
    pending.current = promise;
    promise.then(result => {
      if (pending.current !== promise) return;
      setReading(result);
      if (result.status === "error") { setError(result.message); setStep("site"); }
    });
    setStep("size");
  }

  function pick(e: ChangeEvent<HTMLInputElement>, keep: (url: string) => void) {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/") && file.size < 15_000_000) keep(URL.createObjectURL(file));
  }

  const caption = reading?.status === "read" ? (reading.brand.site ? `Read from ${reading.brand.site}` : "Read from your words") : gathering && !address ? "Reading your words" : address ? `Reading ${address.replace(/^https?:\/\//, "").replace(/\/$/, "")}` : "Your room will appear here";
  const index = QUESTIONS.indexOf(step);

  if ((step === "room" || step === "reserve") && brand) {
    if (step === "reserve") return <Reserve brand={brand} name={name} onBack={() => setStep("room")} />;
    return (
      <div className={`mk-stage${brand.dark ? " mk-dark" : ""}`} style={brandStyle(brand)}>
        <BrandFonts brand={brand} />
        {moment === "welcome" && <Welcome brand={brand} onContinue={() => setMoment("arrival")} />}
        {moment === "arrival" && <Arrival brand={brand} onEnter={() => setMoment("room")} />}
        {moment === "room" && <Room seats={seats} onLeave={() => setMoment("closing")} />}
        {moment === "closing" && <Closing brand={brand} onRejoin={() => setMoment("room")} onLeave={() => setStep("reserve")} />}
        <div className="mk-bar">
          <CircleMark className="mk-bar-mark" />
          <div className="mk-bar-moments" role="tablist" aria-label="Your guests’ journey">
            {(["welcome", "arrival", "room", "closing"] as Moment[]).map(m => (
              <button key={m} type="button" role="tab" aria-selected={moment === m} onClick={() => setMoment(m)}>
                {{ welcome: "Sign in", arrival: "Arrival", room: "The room", closing: "Before you go" }[m]}
              </button>
            ))}
          </div>
          <button type="button" className="mk-bar-go" onClick={() => setStep("reserve")}>Bring my people in</button>
        </div>
        {moment === "arrival" && <p className="mk-reading">{ARRIVALS[brand.arrival].name}. {brand.reading}</p>}
      </div>
    );
  }

  return (
    <main className="mk">
      <header className="mk-header">
        <a className="mk-brand" href="https://entercircle.co"><CircleMark className="mk-header-mark" /><span>Circle</span></a>
      </header>
      <div className="mk-body">
        <section className={`mk-ask${step === "site" ? " mk-ask-open" : ""}`}>
          {index > 0 && (
            <div className="mk-progress">
              <button type="button" className="mk-back" onClick={() => setStep(QUESTIONS[index - 1])}>Back</button>
              <span>{index} of 4</span>
            </div>
          )}

          {step === "site" && (
            <form onSubmit={startReading}>
              <h1>Design your gathering.</h1>
              <p className="mk-sub">Your words become the room.</p>
              <textarea className="mk-words" value={gathering} aria-label="Tell us about your gathering" rows={1} maxLength={6000}
                placeholder="A quarterly ritual for our distributed creative team."
                onChange={e => { setGathering(e.target.value); e.target.style.height = "auto"; e.target.style.height = `${e.target.scrollHeight}px`; }} />
              {withSite || address ? (
                <input className="mk-site" value={address} onChange={e => setAddress(e.target.value)} aria-label="Your website" placeholder="yourwebsite.com" inputMode="url" autoComplete="url" autoCapitalize="none" spellCheck={false} autoFocus={withSite && !address} />
              ) : (
                <button type="button" className="mk-add-site" onClick={() => setWithSite(true)}>+ Add your website</button>
              )}
              {error && <p className="mk-error" role="alert">{error}</p>}
              <button type="submit" className="mk-link-go" disabled={!gathering.trim() && !address.trim()}>Shape the room <span aria-hidden="true">→</span></button>
            </form>
          )}

          {step === "size" && (
            <>
              <h1>How many people will be in the room?</h1>
              <div className="mk-rows">
                {SIZES.map(s => (
                  <button key={s.id} type="button" aria-pressed={size === s.id} onClick={() => setSize(s.id)}>
                    <span>{s.label}</span><small>{s.note}</small>
                  </button>
                ))}
              </div>
              <button type="button" className="mk-go" onClick={() => setStep("purpose")}>Continue</button>
            </>
          )}

          {step === "purpose" && (
            <>
              <h1>What are you gathering for?</h1>
              <div className="mk-pills">
                {PURPOSES.map(p => <button key={p} type="button" aria-pressed={purpose === p} onClick={() => setPurpose(p)}>{p}</button>)}
              </div>
              <button type="button" className="mk-go" onClick={() => setStep("name")}>Continue</button>
            </>
          )}

          {step === "name" && (
            <>
              <h1>What should we call it?</h1>
              <label className="mk-field">Name
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Our weekly circle" maxLength={80} />
              </label>
              <p className="mk-note">Your guests see this on their invitation.</p>
              <p className="mk-label mk-label-gap">How often</p>
              <div className="mk-pills">
                {RHYTHMS.map(r => <button key={r} type="button" aria-pressed={rhythm === r} onClick={() => setRhythm(r)}>{r}</button>)}
              </div>
              <button type="button" className="mk-go" onClick={() => setStep("look")}>Continue</button>
            </>
          )}

          {step === "look" && (
            <>
              <h1>Anything that captures your mood?</h1>
              <p className="mk-sub">Add your mark and a picture that feels like you. Both are optional, and both stay on your computer.</p>
              <div className="mk-drops">
                <label className="mk-drop">
                  <input type="file" accept="image/*" onChange={e => pick(e, url => { setLogo({ url, backing: "clear", ratio: 3 }); readLogo(url).then(read => setLogo(l => l?.url === url ? read : l)); })} />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {logo ? <img src={logo.url} alt="Your mark" /> : <span>Your mark</span>}
                </label>
                <label className="mk-drop mk-drop-wide">
                  <input type="file" accept="image/*" onChange={e => pick(e, url => { setMood({ url, colours: null }); readPicture(url).then(colours => setMood(m => m?.url === url ? { url, colours } : m)); })} />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {mood ? <img src={mood.url} alt="Your mood" /> : <span>A picture of the mood</span>}
                </label>
              </div>
              <button type="button" className="mk-go" disabled={!brand} onClick={() => { setMoment("welcome"); setStep("room"); }}>
                {brand ? "Show me my room" : "Reading your website"}
              </button>
            </>
          )}
        </section>
        <Forming brand={brand} seats={seats} caption={caption} words={gathering} listening={step === "site"} />
      </div>
    </main>
  );
}

/** The last screen: we prepare the real room by hand, and the host can reserve it now. */
function Reserve({ brand, name, onBack }: { brand: Brand; name: string; onBack: () => void }) {
  return (
    <main className="mk mk-reserve">
      <header className="mk-header">
        <a className="mk-brand" href="https://entercircle.co"><CircleMark className="mk-header-mark" /><span>Circle</span></a>
        <button type="button" className="mk-back" onClick={onBack}>Back to my room</button>
      </header>
      <section className="mk-reserve-body">
        <p className="mk-label">{name || brand.name}</p>
        <h1>We’re preparing your room.</h1>
        <p className="mk-sub">We set every room up by hand, at room.entercircle.co, ready for your first gathering.</p>
        {PAYMENT_LINK
          ? <a className="mk-go" href={PAYMENT_LINK}>Reserve my room</a>
          : <span className="mk-go mk-go-waiting">Reserve my room</span>}
      </section>
    </main>
  );
}
