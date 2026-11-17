"use client";

import { useTransition } from "react";
import { approveBioForGuest } from "./actions";

/** Approves a guest's bio on their behalf. Their link stays the same. */
export function ApproveBio({ guestId, first, glow }: { guestId: string; first: string; glow: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" className={glow ? "host-go" : "host-quiet"} disabled={pending} onClick={() => {
      if (window.confirm(`Approve ${first}'s bio for them? This confirms their seat. Their link stays the same.`)) start(() => approveBioForGuest(guestId));
    }}>{pending ? "Approving…" : `Approve bio for ${first}`}</button>
  );
}
