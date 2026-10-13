"use server";

import { headers } from "next/headers";
import { withinLimit } from "@/lib/db.server";
import { walkthroughFor } from "@/lib/walkthroughs";
import { notifyHost, saveWalkthrough } from "@/lib/walkthroughs.server";

export type Saved = { status: "idle" } | { status: "saved"; first?: string } | { status: "invalid" | "error"; message: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clean = (value: FormDataEntryValue | null, max: number) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const AGAIN = "That didn't save. Please try again in a moment.";

async function allowed(code: string) {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  return withinLimit(`walkthrough:${code}:${ip}`, 20, 60 * 60);
}

/** Books one of the offered times. Christina is emailed a calendar invite and sees it on /host; the guest is sent nothing. */
export async function bookTime(code: string, startsAt: string): Promise<Saved> {
  const walkthrough = walkthroughFor(code);
  if (!walkthrough || !walkthrough.slots.includes(startsAt)) return { status: "error", message: AGAIN };
  try {
    if (!await allowed(code)) return { status: "error", message: AGAIN };
    await saveWalkthrough(code, "booked", { name: walkthrough.guest, startsAt });
  } catch {
    return { status: "error", message: AGAIN };
  }
  await notifyHost(walkthrough, "booked", { startsAt });
  return { status: "saved" };
}

/** Saves someone the guest wants to bring and tells Christina, who sends their invitation herself. */
export async function bringSomeone(code: string, _previous: Saved, form: FormData): Promise<Saved> {
  const name = clean(form.get("name"), 120);
  const email = clean(form.get("email"), 254).toLowerCase();
  const walkthrough = walkthroughFor(code);
  if (!walkthrough) return { status: "error", message: AGAIN };
  if (!name) return { status: "invalid", message: "Please add their name." };
  if (!EMAIL.test(email)) return { status: "invalid", message: "Please check their email address." };
  try {
    if (!await allowed(code)) return { status: "error", message: AGAIN };
    await saveWalkthrough(code, "teammate", { name, email });
  } catch {
    return { status: "error", message: AGAIN };
  }
  await notifyHost(walkthrough, "teammate", { name, email });
  return { status: "saved", first: name.split(" ")[0] };
}

/** Saves a time the guest suggests instead and tells Christina, who confirms it herself. */
export async function suggestTime(code: string, startsAt: string): Promise<Saved> {
  const walkthrough = walkthroughFor(code);
  const when = new Date(startsAt);
  if (!walkthrough || Number.isNaN(when.getTime())) return { status: "invalid", message: "Please choose a day and time." };
  if (when.getTime() < Date.now()) return { status: "invalid", message: "Please choose a time that hasn't passed." };
  try {
    if (!await allowed(code)) return { status: "error", message: AGAIN };
    await saveWalkthrough(code, "suggested", { name: walkthrough.guest, startsAt: when.toISOString() });
  } catch {
    return { status: "error", message: AGAIN };
  }
  await notifyHost(walkthrough, "suggested", { startsAt: when.toISOString() });
  return { status: "saved" };
}
