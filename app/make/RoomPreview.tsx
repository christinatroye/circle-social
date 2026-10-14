"use client";

import { type CSSProperties, useState } from "react";
import type { Brand } from "@/lib/brand";

export type Moment = "welcome" | "arrival" | "room" | "closing";

const FAMILY = /^[A-Za-z0-9 ]{1,40}$/;

/** The brand's colours and type as CSS variables, so every moment below wears them. */
export function brandStyle(brand: Brand): CSSProperties {
  const display = FAMILY.test(brand.fonts.display) ? brand.fonts.display : "Cormorant Garamond";
  const body = FAMILY.test(brand.fonts.body) ? brand.fonts.body : "Mulish";
  return {
    "--mk-brand": brand.colours.brand,
    "--mk-accent": brand.colours.accent,
    "--mk-field": brand.colours.field,
    "--mk-ground": brand.colours.ground,
    "--mk-edge": brand.colours.edge,
    "--mk-light": brand.colours.light,
    "--mk-ink": brand.colours.ink,
    "--mk-muted": brand.colours.muted,
    "--mk-display": `"${display}", "Cormorant Garamond", Georgia, serif`,
    "--mk-body": `"${body}", Mulish, system-ui, sans-serif`,
  } as CSSProperties;
}

/** Loads the brand's two Google Fonts (and the room's own, as a fallback). */
export function BrandFonts({ brand }: { brand: Brand }) {
  const families = [brand.fonts.display, brand.fonts.body, "Cormorant Garamond", "Mulish"]
    .filter((f, i, all) => FAMILY.test(f) && all.indexOf(f) === i)
    .map(f => `family=${f.replace(/ /g, "+")}:wght@300;400`)
    .join("&");
  return <link rel="stylesheet" href={`https://fonts.googleapis.com/css2?${families}&display=swap`} precedence="default" />;
}

function Mark({ brand, className }: { brand: Brand; className: string }) {
  // The texture shows only through the mark, so the mark melts into the room with no box around it.
  if (brand.logo && brand.texture) {
    const style = {
      backgroundImage: `url("${brand.texture}")`,
      maskImage: `url("${brand.logo}")`,
      WebkitMaskImage: `url("${brand.logo}")`,
      aspectRatio: String(brand.logoRatio ?? 3),
    } as CSSProperties;
    return <span className={`${className} mk-mark-textured`} style={style} role="img" aria-label={brand.name} />;
  }
  // A plain <img>: the logo lives on the host's own site, and its size is unknown until it loads.
  // eslint-disable-next-line @next/next/no-img-element
  return brand.logo ? <img className={`${className} mk-on-${brand.logoBacking}`} src={brand.logo} alt={brand.name} referrerPolicy="no-referrer" />
    : <span className={`${className} mk-mark-word`}>{brand.name}</span>;
}

/**
 * Lifts a logo off the white or black box its file sits on, without needing a transparent file.
 * On white, the dark shape is kept and painted in the brand's colour. On black, the light shape keeps its own colours.
 */
export function LiftFilters() {
  return (
    <svg className="mk-filters" aria-hidden="true">
      <filter id="mk-lift-light" x="0" y="0" width="1" height="1" colorInterpolationFilters="sRGB">
        <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -0.9 -0.9 -0.9 0 2.6" result="shape" />
        <feFlood className="mk-mark-flood" />
        <feComposite in2="shape" operator="in" />
        <feComposite in2="SourceGraphic" operator="in" />
      </filter>
      <filter id="mk-lift-dark" x="0" y="0" width="1" height="1" colorInterpolationFilters="sRGB">
        <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0.9 0.9 0.9 0 -0.15" />
        <feComposite in2="SourceGraphic" operator="in" />
      </filter>
    </svg>
  );
}

/** Fixed pseudo-random spots, so the server and the browser draw the same sky. */
function points(count: number, seed: number) {
  let s = seed;
  const next = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  return Array.from({ length: count }, () => ({ x: next() * 100, y: next() * 100, d: next() * 4 }));
}

const STARS = points(36, 7);

const ICONS = {
  camera: "M3 8h12v8H3zM15 11l6-3v8l-6-3",
  mic: "M9 5a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0zM5 11a7 7 0 0 0 14 0M12 18v3",
  blur: "M12 5a3 3 0 1 0 0 6 3 3 0 1 0 0-6M6 20c1-4 4-5 6-5s5 1 6 5",
};

function Icon({ d }: { d: string }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg>;
}

/**
 * The way in, as the live room's first screen: the host's mark above a hairline, the guest's name and a word for how
 * they're arriving, then Continue.
 */
export function Welcome({ brand, onContinue }: { brand: Brand; onContinue: () => void }) {
  return (
    <section className="mk-moment mk-welcome">
      <LiftFilters />
      <header className="mk-welcome-head"><Mark brand={brand} className="mk-welcome-mark" /></header>
      <form className="mk-welcome-form" onSubmit={e => { e.preventDefault(); onContinue(); }}>
        <input type="text" placeholder="Your name" aria-label="Your name" maxLength={40} />
        <input type="text" placeholder="A word for how you’re arriving" aria-label="A word for how you’re arriving" maxLength={40} />
        <p className="mk-optional">Optional</p>
        <button type="submit" className="mk-take">Continue</button>
      </form>
      <p className="mk-made">Made with Circle</p>
    </section>
  );
}

/**
 * The arrival Circle suggested: one living thing doing one quiet thing, with the camera and mic
 * as the live room asks for them, then the way in. The waiting room and the arrival are one moment. */
export function Arrival({ brand, onEnter }: { brand: Brand; onEnter: () => void }) {
  const kind = brand.arrival;
  return (
    <section className={`mk-moment mk-arrival mk-arrival-${kind}`}>
      {brand.mood && <div className="mk-mood" style={{ backgroundImage: `url("${brand.mood}")` }} aria-hidden="true" />}
      {kind === "first-light" && (
        <div className="mk-night" aria-hidden="true">
          {STARS.map((p, i) => <span key={i} className="mk-star" style={{ left: `${p.x}%`, top: `${p.y}%`, animationDelay: `${1 + p.d}s` }} />)}
        </div>
      )}
      {kind === "gather" && (
        <div className="mk-gather" aria-hidden="true">
          {STARS.map((p, i) => (
            <span key={i} className="mk-speck" style={{ "--from-x": `${(p.x - 50) * 9}px`, "--from-y": `${(p.y - 50) * 6}px`, animationDelay: `${p.d / 2}s` } as CSSProperties} />
          ))}
        </div>
      )}
      {kind === "veils" && (
        <div aria-hidden="true">
          <span className="mk-veil mk-veil-1" /><span className="mk-veil mk-veil-2" /><span className="mk-veil mk-veil-3" />
        </div>
      )}
      <LiftFilters />
      <div className="mk-glow" aria-hidden="true"><span /></div>
      <div className="mk-arrival-centre">
        {kind === "gather" ? <span className="mk-gathered">{brand.name}</span> : <Mark brand={brand} className="mk-mark" />}
      </div>
      <div className="mk-arrival-words">
        <p className="mk-guide">Take a moment to breathe and arrive.</p>
        <div className="mk-tiles">
          <button type="button"><Icon d={ICONS.camera} />Camera<small>Off</small></button>
          <button type="button"><Icon d={ICONS.mic} />Mic<small>Off</small></button>
          <button type="button" className="mk-tile-quiet"><Icon d={ICONS.blur} />Blur</button>
        </div>
        <button type="button" className="mk-enter" onClick={onEnter}>Enter when ready</button>
      </div>
      <p className="mk-made">Made with Circle</p>
    </section>
  );
}

const PEOPLE = ["You", "Aria Bell", "Ben Okafor", "Cleo Marsh", "Dev Patel", "Esme Laurent", "Felix Grant", "Gia Romano", "Hal Iversen", "Iris Novak", "Jon Reyes", "Kemi Adeyemi", "Lior Ben-David", "Maya Lindqvist", "Noor Haddad", "Otto Brandt"];

// The live room's controls in its own order. On a laptop they all sit in one row; on a phone only the "bar" ones do,
// and the rest wait behind More, with Present PDF, which a laptop reaches through Share.
type Tool = { label: string; d: string; look?: string; bar?: true; short?: string; phoneOnly?: true };
const TOOLS: Tool[] = [
  { label: "Reset Circle", d: "M12 3a9 9 0 1 0 9 9", look: "quiet" },
  { label: "Speak", d: ICONS.mic, look: "chosen", bar: true },
  { label: "Mute others", d: "M9 5a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0zM5 11a7 7 0 0 0 14 0M12 18v3M4 4l16 16" },
  { label: "Camera", d: ICONS.camera, look: "lit", bar: true },
  { label: "Blur", d: ICONS.blur },
  { label: "Hide self-view", d: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 1 0 0-6" },
  { label: "I’d like to speak", short: "Speak next", d: "M8 13V6a1.5 1.5 0 0 1 3 0v5M11 11V4a1.5 1.5 0 0 1 3 0v7M14 11V5.5a1.5 1.5 0 0 1 3 0V14a6 6 0 0 1-6 6h-1a5 5 0 0 1-4-2l-3-4a1.5 1.5 0 0 1 2.4-1.8L8 14", bar: true },
  { label: "Chat", d: "M4 5h16v11H9l-5 4z", bar: true },
  { label: "Share", d: "M3 4h18v12H3zM8 20h8M12 16v4" },
  { label: "Present PDF", d: "M6 2h8l4 4v16H6zM14 2v5h5M9 12h6M9 16h6", phoneOnly: true },
  { label: "Leave a note", d: "M3 6h18v12H3zM3 6l9 7 9-7" },
  { label: "Warmth", d: "M12 3c3 4 5 6 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z" },
];

function ToolButton({ tool }: { tool: Tool }) {
  const look = [tool.look && `mk-tool-${tool.look}`, tool.phoneOnly && "mk-tool-phone"].filter(Boolean).join(" ");
  return (
    <button type="button" className={look || undefined}>
      <Icon d={tool.d} />
      {tool.short ? <><span className="mk-tool-long">{tool.label}</span><span className="mk-tool-short">{tool.short}</span></> : tool.label}
    </button>
  );
}

/**
 * Seats spaced evenly along the ring's edge, not by angle, so people at the sides of a wide ring don't bunch up.
 * Positions are percentages of the ring box, starting at the bottom (where "You" sits).
 */
function ringSpots(count: number, aspect: number) {
  const steps = 720, rx = 44, ry = 41;
  const pts = Array.from({ length: steps + 1 }, (_, k) => {
    const a = Math.PI / 2 + (k / steps) * 2 * Math.PI;
    return { x: 50 + rx * Math.cos(a), y: 50 + ry * Math.sin(a) };
  });
  const lengths = [0];
  for (let k = 1; k <= steps; k++) lengths.push(lengths[k - 1] + Math.hypot((pts[k].x - pts[k - 1].x) * aspect, pts[k].y - pts[k - 1].y));
  const total = lengths[steps];
  return Array.from({ length: count }, (_, i) => pts[lengths.findIndex(l => l >= (i / count) * total)]);
}

/**
 * The room as the host sees it, laid out like the live Alien room: the speaker large in the light at the centre,
 * everyone else in a ring around them, camera-off seats dimmed to an initial, the speaking queue numbered.
 * The brand changes colour, type and mark; the structure never changes.
 */
export function Room({ seats, onLeave }: { seats: number; onLeave: () => void }) {
  const [more, setMore] = useState(false);
  // Like the live room, one page holds the speaker and fourteen around them; the rest wait on the next page.
  const [speaker, ...ring] = PEOPLE.slice(1, Math.min(seats, 15) + 1);
  const people = [PEOPLE[0], ...ring].slice(0, 14);
  // The ring box is roughly twice as wide as it is tall.
  const spots = ringSpots(people.length, 2.06);
  return (
    <section className="mk-moment mk-room">
      <div className="mk-room-light" aria-hidden="true" />
      <p className="mk-present">{seats} / 25 present</p>
      <button type="button" className="mk-leave" onClick={onLeave}>End the circle</button>
      <div className="mk-ring">
        <div className="mk-centre">
          <span className="mk-face mk-face-speaker">{speaker[0]}</span>
          <span className="mk-centre-name">{speaker}<span className="mk-queue">1</span></span>
        </div>
        {people.map((name, i) => {
          const spot = spots[i];
          const off = i > 0 && i % 4 === 3;
          return (
            <div key={name} className={`mk-person${off ? " mk-off" : ""}${i === 2 ? " mk-speaking" : ""}`}
              style={{ left: `${spot.x}%`, top: `${spot.y}%` }}>
              <span className="mk-face">{name[0]}</span>
              <span className="mk-name">{name.split(" ")[0] === "You" ? "You" : name}{i === Math.min(5, people.length - 1) && <span className="mk-queue">2</span>}</span>
            </div>
          );
        })}
      </div>
      {seats > 15 && <div className="mk-pager" aria-hidden="true"><span>‹</span><i className="mk-pip-on" /><i /><span>›</span></div>}
      <nav className={`mk-tools${more ? " mk-more-open" : ""}`} aria-label="Room controls">
        {TOOLS.map(tool => tool.bar ? <ToolButton key={tool.label} tool={tool} /> : null)}
        <button type="button" className="mk-more" aria-expanded={more} onClick={() => setMore(open => !open)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></svg>
          More
        </button>
        <div className="mk-more-actions">
          {TOOLS.map(tool => tool.bar ? null : <ToolButton key={tool.label} tool={tool} />)}
        </div>
      </nav>
    </section>
  );
}

/**
 * After the circle, as the live room ends: "What did you take away?" first, then "Before you go" with the closing
 * words and the notes people left, ending on Leave Circle. The pretend guests leave no notes, so the second card
 * says where notes arrive, as the live room does when there are none.
 */
export function Closing({ brand, onRejoin, onLeave }: { brand: Brand; onRejoin: () => void; onLeave: () => void }) {
  const [card, setCard] = useState<"takeaway" | "passage" | "notes">("takeaway");
  const [share, setShare] = useState(true);
  const [copy, setCopy] = useState(false);

  if (card === "takeaway") return (
    <section className="mk-moment mk-takeaway" aria-label="What did you take away?">
      <button type="button" className="mk-rejoin" onClick={onRejoin}>Rejoin Circle</button>
      <form className="mk-takeaway-column" onSubmit={e => { e.preventDefault(); setCard("passage"); }}>
        <Mark brand={brand} className="mk-takeaway-mark" />
        <h2>What did you take away?</h2>
        <textarea rows={3} aria-label="What did you take away?" placeholder={"An insight, a question, an action\nor appreciation. A line is plenty."} />
        <div className="mk-choices">
          <label><input type="checkbox" checked={share} onChange={e => setShare(e.target.checked)} /><span className="mk-switch" aria-hidden="true"><span /></span> Share with the host</label>
          <label><input type="checkbox" checked={copy} onChange={e => setCopy(e.target.checked)} /><span className="mk-switch" aria-hidden="true"><span /></span> Send me a copy</label>
        </div>
        <button type="submit" className="mk-takeaway-go"><span>Continue</span><span aria-hidden="true">→</span></button>
      </form>
    </section>
  );

  const last = card === "notes";
  return (
    <section key={card} className="mk-moment mk-closing">
      <p className="mk-eyebrow">Before you go</p>
      {last
        ? <p className="mk-close-body">You can leave notes for people during a circle. They’re delivered here.</p>
        : <>
            <blockquote>“Your closing words, or a line from your speaker. Guests carry this out of the room.”</blockquote>
            <p className="mk-from">Your name</p>
          </>}
      <button type="button" className="mk-take" onClick={() => last ? onLeave() : setCard("notes")}>{last ? "Leave Circle" : "Continue"}</button>
      <span className="mk-pips" aria-hidden="true"><i className={last ? undefined : "mk-pip-on"} /><i className={last ? "mk-pip-on" : undefined} /></span>
    </section>
  );
}
