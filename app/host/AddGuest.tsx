"use client";

import { useState, useTransition } from "react";
import { addGuest } from "./actions";

export function AddGuest({ circleId }: { circleId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [introduction, setIntroduction] = useState("");
  const [beenBefore, setBeenBefore] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  if (!open) return <button type="button" className="host-quiet" onClick={() => setOpen(true)}>Add guest</button>;
  const reset = () => { setName(""); setEmail(""); setIntroduction(""); setBeenBefore(false); setError(""); setOpen(false); };
  return (
    <form className="host-edit host-add" onSubmit={e => {
      e.preventDefault();
      start(async () => {
        const result = await addGuest(circleId, { name, email, introduction, beenBefore });
        if (result.error) setError(result.error); else reset();
      });
    }}>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" aria-label="Full name" autoFocus />
      <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" aria-label="Email" type="email" />
      <textarea value={introduction} onChange={e => setIntroduction(e.target.value)} placeholder="Introduction" aria-label="Introduction" maxLength={320} rows={3} />
      <label className="host-small"><input type="checkbox" checked={beenBefore} onChange={e => setBeenBefore(e.target.checked)} /> Been to a Circle before</label>
      {error && <p className="host-error">{error}</p>}
      <div className="host-actions">
        <button className="host-quiet" disabled={pending}>{pending ? "Adding…" : "Add"}</button>
        <button type="button" className="host-quiet" disabled={pending} onClick={reset}>Cancel</button>
        <span className="host-small">{introduction.length}/320</span>
      </div>
    </form>
  );
}
