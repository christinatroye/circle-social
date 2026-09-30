"use client";

import { useTransition } from "react";
import { giveNewLink } from "./actions";

export function NewLink({ guestId, name }: { guestId: string; name: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" className="host-quiet" disabled={pending} onClick={() => {
      if (window.confirm(`Give ${name} a new link? Their current link will stop working and they will start over from the door.`)) start(() => giveNewLink(guestId));
    }}>{pending ? "Making a new link…" : "New link"}</button>
  );
}
