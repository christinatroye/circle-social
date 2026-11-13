"use client";

import { useTransition } from "react";
import { removeGuest } from "./actions";

/** Removes a guest. As "Move back to requests" it puts someone confirmed from a request back in Requests. */
export function RemoveGuest({ guestId, name, backToRequests = false }: { guestId: string; name: string; backToRequests?: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" className="host-quiet" disabled={pending} onClick={() => {
      const question = backToRequests
        ? `Move ${name} back to requests? Their bio and link will be deleted.`
        : `Remove ${name}? Their link will stop working. This can't be undone.`;
      if (window.confirm(question)) start(() => removeGuest(guestId));
    }}>{pending ? (backToRequests ? "Moving…" : "Removing…") : backToRequests ? "Move back to requests" : "Remove"}</button>
  );
}
