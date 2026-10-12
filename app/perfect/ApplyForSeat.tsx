"use client";

import { type ChangeEvent, useActionState, useEffect, useState } from "react";
import { CircleMark } from "@/components/CircleMark";
import { applyForSeat, type Application } from "./actions";

/** The "Apply for a seat" button, and the quiet screen it opens: the form, then the thank you. */
export function ApplyForSeat() {
  const [open, setOpen] = useState(false);
  // Controlled, so a "please check your email" answer doesn't empty what they typed.
  const [fields, setFields] = useState({ name: "", email: "", line: "" });
  const field = (key: keyof typeof fields) => ({
    name: key, value: fields[key], onChange: (e: ChangeEvent<HTMLInputElement>) => setFields({ ...fields, [key]: e.target.value }),
  });
  const [state, send, pending] = useActionState<Application, FormData>(applyForSeat, { status: "idle" });

  useEffect(() => {
    if (!open) return;
    const close = (e: KeyboardEvent) => { if (e.key === "Escape" && state.status !== "sent") setOpen(false); };
    document.body.classList.add("event-locked");
    window.addEventListener("keydown", close);
    return () => { document.body.classList.remove("event-locked"); window.removeEventListener("keydown", close); };
  }, [open, state.status]);

  return (
    <>
      <button type="button" className="event-go" onClick={() => setOpen(true)}>Apply for a seat</button>
      {open && (
        <div className="event-apply" role="dialog" aria-modal="true" aria-labelledby="apply-heading">
          <div className="event-apply-inner">
            <CircleMark className="event-apply-mark" />
            {state.status === "sent" ? (
              <>
                <h2 id="apply-heading">Thank you, {state.first}.</h2>
                <p className="event-apply-note">Circles are small, so we can’t always offer everyone a seat. If we can offer you one, we’ll email you.</p>
                <a className="event-quiet" href="https://entercircle.co/circle">See past and upcoming Circles</a>
              </>
            ) : (
              <form action={send} className="event-form" noValidate>
                <h2 id="apply-heading">Apply for a seat</h2>
                <input {...field("name")} placeholder="Your name" aria-label="Your name" autoComplete="name" maxLength={120} required autoFocus />
                <input {...field("email")} type="email" placeholder="Your email" aria-label="Your email" autoComplete="email" maxLength={254} required />
                <label htmlFor="apply-line">What draws you to this Circle?</label>
                <input {...field("line")} id="apply-line" className="event-voice" placeholder="A line is enough" maxLength={300} />
                {(state.status === "invalid" || state.status === "error") && <p className="event-error" role="alert">{state.message}</p>}
                <button className="event-go" disabled={pending}>{pending ? "Sending…" : "Send"}</button>
                <button type="button" className="event-quiet" onClick={() => setOpen(false)}>Back</button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
