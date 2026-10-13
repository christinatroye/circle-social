"use client";

import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from "react";
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

/** A faint ring of seats in the brand's colours: the room taking shape while the host answers. */
function Forming({ brand, seats, caption }: { brand: Brand | null; seats: number; caption: string }) {
  return (
    <aside className="mk-forming" style={brand ? brandStyle(brand) : undefined} data-read={brand ? "" : undefined} aria-hidden="true">
      <div className="mk-forming-light" />
      {Array.from({ length: seats }, (_, i) => {
        const a = (i * 2 * Math.PI) / seats - Math.PI / 2;
        return <span key={i} className="mk-forming-seat" style={{ left: `${50 + 34 * Math.cos(a)}%`, top: `${50 + 34 * Math.sin(a)}%`, transitionDelay: `${i * 60}ms` }} />;
      })}
      <p className="mk-forming-caption">{caption}</p>
    </aside>
  );
}

/** The room maker: four questions, an optional look, then the host walks through their own room. */
export function Maker() {
  const [step, setStep] = useState<Step>("site");
  const [address, setAddress] = useState("");
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
    const promise = readBrand(address);
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

  const caption = reading?.status === "read" ? `Read from ${reading.brand.site}` : address ? `Reading ${address.replace(/^https?:\/\//, "").replace(/\/$/, "")}` : "Your room will appear here";
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
        <section className="mk-ask">
          {index > 0 && (
            <div className="mk-progress">
              <button type="button" className="mk-back" onClick={() => setStep(QUESTIONS[index - 1])}>Back</button>
              <span>{index} of 4</span>
            </div>
          )}

          {step === "site" && (
            <form onSubmit={startReading}>
              <p className="mk-label">Make a room</p>
              <h1>Your gatherings, in a room that looks like you.</h1>
              <p className="mk-sub">Paste your website. Circle turns your colours, your mark and your mood into a room your people walk into.</p>
              <label className="mk-field">Your website
                <input value={address} onChange={e => setAddress(e.target.value)} placeholder="yourwebsite.com" inputMode="url" autoComplete="url" autoCapitalize="none" spellCheck={false} required />
              </label>
              {error && <p className="mk-error" role="alert">{error}</p>}
              <button type="submit" className="mk-go">Make it mine</button>
              <p className="mk-note">Free to make and walk around.</p>
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
        <Forming brand={brand} seats={seats} caption={caption} />
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
