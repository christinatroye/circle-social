"use client";

import { useTransition } from "react";
import { removeGuest } from "./actions";

export function RemoveGuest({ guestId, name }: { guestId: string; name: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" className="host-quiet" disabled={pending} onClick={() => {
      if (window.confirm(`Remove ${name}? Their link will stop working. This can't be undone.`)) start(() => removeGuest(guestId));
    }}>{pending ? "Removing…" : "Remove"}</button>
  );
}
