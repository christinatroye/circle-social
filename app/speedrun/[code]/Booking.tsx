"use client";

import { type ChangeEvent, useActionState, useEffect, useState, useTransition } from "react";
import { WALKTHROUGH_MINUTES, type Walkthrough } from "@/lib/walkthroughs";
import type { Saved } from "./actions";

const OPACITY = [1, 0.65, 0.65, 1, 0.65, 0.65, 1, 0.65, 0.65, 1];

/** Circle's lockup as on entercircle.co: the ten-dot mark and CIRCLE. */
function Brand() {
  return (
    <span className="sr-brand" aria-label="Circle">
      <svg viewBox="0 0 40 40" aria-hidden="true">
        {OPACITY.map((opacity, i) => {
          const a = i * Math.PI / 5;
          return <circle key={i} cx={(20 + 11 * Math.sin(a)).toFixed(2)} cy={(20 - 11 * Math.cos(a)).toFixed(2)} r="1.25" opacity={opacity} />;
        })}
      </svg>
      <span aria-hidden="true">CIRCLE</span>
    </span>
  );
}

type View = "choose" | "booked" | "bring" | "suggest";
type Props = {
  walkthrough: Walkthrough;
  booked: string | null;
  pageUrl: string;
  book: (startsAt: string) => Promise<Saved>;
  bring: (previous: Saved, form: FormData) => Promise<Saved>;
  suggest: (startsAt: string) => Promise<Saved>;
};

// Times are shown in the visitor's own time zone, so they're formatted only once the page is in their browser.
const fmt = (iso: string, options: Intl.DateTimeFormatOptions, timeZone?: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone, ...options }).format(new Date(iso));
const time = (iso: string, timeZone?: string) =>
  fmt(iso, { hour: "numeric", minute: "2-digit", hour12: true }, timeZone).replace(/\s/g, "").toLowerCase();
const day = (iso: string) => fmt(iso, { weekday: "long", day: "numeric", month: "long" });
const weekday = (iso: string) => fmt(iso, { weekday: "long" });
const zoneName = () => {
  const part = new Intl.DateTimeFormat("en-US", { timeZoneName: "longGeneric" }).formatToParts(new Date()).find(p => p.type === "timeZoneName");
  return (part?.value ?? "").replace(/ Time$/, "");
};
const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export function Booking({ walkthrough, booked, pageUrl, book, bring, suggest }: Props) {
  const [ready, setReady] = useState(false);
  const [bookedAt, setBookedAt] = useState(booked);
  const [view, setView] = useState<View>(booked ? "booked" : "choose");
  const [picked, setPicked] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  // eslint-disable-next-line react-hooks/set-state-in-effect -- times depend on the visitor's time zone, known only in the browser
  useEffect(() => setReady(true), []);

  const confirm = () => picked && start(async () => {
    setError("");
    const result = await book(picked);
    if (result.status === "saved") { setBookedAt(picked); setView("booked"); }
    else if (result.status !== "idle") setError(result.message);
  });

  return (
    <div className={`sr-screen sr-${view}`}>
      <Brand />
      {view === "choose" && (
        <div className="sr-split">
          <div className="sr-details">
            <h1 className="sr-title">{walkthrough.title}</h1>
            <p className="sr-who">{walkthrough.guest} and Christina Lundberg</p>
            <p className="sr-facts">{WALKTHROUGH_MINUTES} minutes · online</p>
            <p className="sr-note">{walkthrough.line}</p>
          </div>
          <div className="sr-times">
            <h2>Choose a time</h2>
            <p className="sr-small">{ready ? `In your time zone, ${zoneName()}` : " "}</p>
            {ready && Object.entries(Object.groupBy(walkthrough.slots, day)).map(([label, slots]) => (
              <div key={label} className="sr-day">
                <p className="sr-day-label">{label}</p>
                <div className="sr-pills">
                  {slots!.map(slot => (
                    <button key={slot} type="button" className="sr-pill" aria-pressed={picked === slot} onClick={() => setPicked(slot)}>{time(slot)}</button>
                  ))}
                </div>
              </div>
            ))}
            {picked && (
              <button type="button" className="sr-go" disabled={pending} onClick={confirm}>
                {pending ? "Booking…" : `Book ${time(picked)} ${weekday(picked)}`}
              </button>
            )}
            {error && <p className="sr-error" role="alert">{error}</p>}
            <div className="sr-other">
              <button type="button" className="sr-quiet" onClick={() => setView("suggest")}>None of these work? Suggest another time</button>
              <span className="sr-small">Christina is in the UK</span>
            </div>
          </div>
        </div>
      )}
      {view === "booked" && bookedAt && <Booked walkthrough={walkthrough} at={bookedAt} ready={ready} pageUrl={pageUrl} onBring={() => setView("bring")} onAgain={() => { setPicked(null); setView("choose"); }} />}
      {view === "bring" && bookedAt && <Bring at={bookedAt} ready={ready} bring={bring} onBack={() => setView("booked")} />}
      {view === "suggest" && <Suggest suggest={suggest} onBack={() => setView(bookedAt ? "booked" : "choose")} />}
      <p className="sr-made">Made with Circle</p>
    </div>
  );
}

function Booked({ walkthrough, at, ready, pageUrl, onBring, onAgain }: { walkthrough: Walkthrough; at: string; ready: boolean; pageUrl: string; onBring: () => void; onAgain: () => void }) {
  const [calendars, setCalendars] = useState(false);
  const end = new Date(new Date(at).getTime() + WALKTHROUGH_MINUTES * 60_000).toISOString();
  const google = "https://calendar.google.com/calendar/render?" + new URLSearchParams({
    action: "TEMPLATE", text: walkthrough.title, dates: `${stamp(at)}/${stamp(end)}`,
    details: `${walkthrough.guest} and Christina Lundberg, ${WALKTHROUGH_MINUTES} minutes, online.\n\nJoin: ${pageUrl}`, location: pageUrl,
  });
  return (
    <div className="sr-single">
      <h1 className="sr-title">You’re booked, {walkthrough.first}.</h1>
      <p className="sr-facts">{walkthrough.title}<br />{ready ? `${day(at)}, ${time(at)} your time` : " "}</p>
      <p className="sr-note">The link to join is in your invite.</p>
      {calendars ? (
        <div className="sr-calendars">
          <a className="sr-go" href={google} target="_blank" rel="noreferrer">Google Calendar</a>
          <a className="sr-go" href={`${pageUrl}/calendar`}>Apple or Outlook</a>
        </div>
      ) : (
        <button type="button" className="sr-go" onClick={() => setCalendars(true)}>Add to my calendar</button>
      )}
      <button type="button" className="sr-quiet" onClick={onBring}>Bring someone from your team</button>
      <button type="button" className="sr-quiet sr-foot" onClick={onAgain}>Need another time? Choose again</button>
    </div>
  );
}

function Bring({ at, ready, bring, onBack }: { at: string; ready: boolean; bring: Props["bring"]; onBack: () => void }) {
  const [fields, setFields] = useState({ name: "", email: "" });
  const field = (key: keyof typeof fields) => ({
    name: key, value: fields[key], onChange: (e: ChangeEvent<HTMLInputElement>) => setFields({ ...fields, [key]: e.target.value }),
  });
  const [state, send, pending] = useActionState<Saved, FormData>(bring, { status: "idle" });
  const [sentTo, setSentTo] = useState<string[]>([]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clears the fields once a person is saved, ready for the next
    if (state.status === "saved" && state.first) { setSentTo(names => [...names, state.first!]); setFields({ name: "", email: "" }); }
  }, [state]);

  return (
    <form action={send} className="sr-single sr-form" noValidate>
      <h1 className="sr-title">Who would you like to bring?</h1>
      <p className="sr-note">{ready ? `They’ll get their own invitation to the same room, ${day(at)} at ${time(at)} your time.` : " "}</p>
      {sentTo.length > 0 && <p className="sr-done" role="status">Thank you. Christina will send {sentTo.join(" and ")} their invitation.</p>}
      <label className="sr-field"><span>Their name</span><input {...field("name")} autoComplete="off" maxLength={120} required /></label>
      <label className="sr-field"><span>Their email</span><input {...field("email")} type="email" autoComplete="off" maxLength={254} required /></label>
      {(state.status === "invalid" || state.status === "error") && <p className="sr-error" role="alert">{state.message}</p>}
      <button className="sr-go" disabled={pending}>{pending ? "Sending…" : sentTo.length ? "Add another person" : "Send their invitation"}</button>
      <button type="button" className="sr-quiet sr-foot" onClick={onBack}>Back</button>
    </form>
  );
}

function Suggest({ suggest, onBack }: { suggest: Props["suggest"]; onBack: () => void }) {
  const [value, setValue] = useState("");
  const [result, setResult] = useState<Saved>({ status: "idle" });
  const [pending, start] = useTransition();
  // A datetime-local value is in the visitor's own time zone; new Date() reads it that way.
  const iso = value ? new Date(value).toISOString() : "";
  const send = () => start(async () => setResult(await suggest(iso)));

  if (result.status === "saved") return (
    <div className="sr-single">
      <h1 className="sr-title">Thank you.</h1>
      <p className="sr-note">Christina will confirm by email.</p>
      <button type="button" className="sr-quiet sr-foot" onClick={onBack}>Back</button>
    </div>
  );
  return (
    <div className="sr-single sr-form">
      <h1 className="sr-title">Suggest another time</h1>
      <p className="sr-note">Christina is in the UK.</p>
      <label className="sr-field"><span>A day and time that suits you</span><input type="datetime-local" value={value} onChange={e => setValue(e.target.value)} /></label>
      {iso && <p className="sr-small">That’s {time(iso, "Europe/London")} on {fmt(iso, { weekday: "long" }, "Europe/London")} in the UK.</p>}
      {(result.status === "invalid" || result.status === "error") && <p className="sr-error" role="alert">{result.message}</p>}
      <button type="button" className="sr-go" disabled={!iso || pending} onClick={send}>{pending ? "Sending…" : "Suggest this time"}</button>
      <button type="button" className="sr-quiet sr-foot" onClick={onBack}>Back</button>
    </div>
  );
}
