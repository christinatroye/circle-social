"use client";

import { useTransition } from "react";
import { markWaitlistEmail } from "./actions";

/** Opens the waitlist email as a Gmail draft in a new tab. Christina reads it and sends it herself. */
export function WaitlistEmail({ requestId, gmailUrl, drafted }: { requestId: string; gmailUrl: string; drafted: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" className={drafted ? "host-quiet" : "host-go"} disabled={pending} onClick={() => {
      window.open(gmailUrl, "_blank", "noopener");
      start(() => markWaitlistEmail(requestId));
    }}>Draft waitlist email</button>
  );
}
