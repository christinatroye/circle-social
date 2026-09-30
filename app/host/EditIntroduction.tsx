"use client";

import { useState, useTransition } from "react";
import { updateIntroduction } from "./actions";

export function EditIntroduction({ guestId, introduction }: { guestId: string; introduction: string }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(introduction);
  const [pending, start] = useTransition();
  if (!editing) return (
    <>
      {introduction ? <p className="host-intro">{introduction}</p> : <p className="host-small">No introduction yet.</p>}
      <button type="button" className="host-quiet" onClick={() => { setText(introduction); setEditing(true); }}>Edit introduction</button>
    </>
  );
  return (
    <div className="host-edit">
      <textarea className="host-intro" value={text} maxLength={320} rows={3} onChange={e => setText(e.target.value)} aria-label="Introduction" autoFocus />
      <div className="host-actions">
        <button type="button" className="host-quiet" disabled={pending} onClick={() => start(async () => { await updateIntroduction(guestId, text); setEditing(false); })}>
          {pending ? "Saving…" : "Save"}
        </button>
        <button type="button" className="host-quiet" disabled={pending} onClick={() => setEditing(false)}>Cancel</button>
        <span className="host-small">{text.length}/320</span>
      </div>
    </div>
  );
}
