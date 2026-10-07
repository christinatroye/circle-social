/** Everything the arrival page needs, prepared on the server. Other guests appear only after the reveal. */
export type Phase = "before" | "reveal" | "day" | "after";

const HOUR = 60 * 60 * 1000;

/** Before the reveal, from the reveal, from one hour before the start, and one hour after it. */
export function phaseFor(startsAt: string, revealAt: string, now = new Date()): Phase {
  const t = now.getTime(), starts = Date.parse(startsAt);
  if (t >= starts + 1 * HOUR) return "after";
  if (t >= starts - 1 * HOUR) return "day";
  return t >= Date.parse(revealAt) ? "reveal" : "before";
}

export type Person = {
  id: string; name: string; first: string; speaker: boolean; beenBefore: boolean; shared: boolean; introduction: string; here: boolean;
};

export type ArrivalData = {
  token: string;
  device: "open" | "mine" | "elsewhere";
  phase: Phase;
  firstVisit: boolean;
  me: {
    first: string; name: string; speaker: boolean; introduction: string; shared: boolean; beenBefore: boolean;
    confirmed: boolean; cancelled: boolean;
  };
  circle: {
    title: string; speaker: string; speakerLine: string; question: string;
    startsAt: string; revealAt: string; roomUrl: string | null; inviteUrl: string | null; seats: number;
  };
  others: Person[];
};

export type ArrivalActions = {
  claim: () => Promise<{ ok: boolean; reason?: string }>;
  sawIntroduction: () => Promise<unknown>;
  saveIntroduction: (input: { introduction: string; shared: boolean; beenBefore: boolean }) => Promise<{ ok: boolean }>;
  setCancelled: (cancelled: boolean) => Promise<{ ok: boolean }>;
  requestIntroduction: (to: string, note: string) => Promise<{ ok: boolean }>;
  whoIsHere: () => Promise<string[]>;
  addThisDevice: (email: string) => Promise<{ ok: boolean }>;
  recommendFriend: (text: string) => Promise<{ ok: boolean }>;
  wantNextCircle: () => Promise<{ ok: boolean }>;
};
