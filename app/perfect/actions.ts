"use server";

import { headers } from "next/headers";
import { database, withinLimit } from "@/lib/db.server";

export type Application = { status: "idle" } | { status: "sent"; first: string } | { status: "invalid" | "error"; message: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clean = (value: FormDataEntryValue | null, max: number) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/** Saves an application for a seat at Perfect. Christina sees it on /host; nothing is sent to the applicant. */
export async function applyForSeat(_previous: Application, form: FormData): Promise<Application> {
  const name = clean(form.get("name"), 120);
  const email = clean(form.get("email"), 254).toLowerCase();
  const line = clean(form.get("line"), 300);
  if (!name) return { status: "invalid", message: "Please add your name." };
  if (!EMAIL.test(email)) return { status: "invalid", message: "Please check your email address." };
  try {
    const ip = (await headers()).get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
    if (!await withinLimit(`apply:${ip}`, 10, 60 * 60)) return { status: "error", message: "That didn't save. Please try again in a moment." };
    await database()`INSERT INTO seat_requests (event, name, email, line) VALUES ('perfect', ${name}, ${email}, ${line})`;
  } catch {
    return { status: "error", message: "That didn't save. Please try again in a moment." };
  }
  return { status: "sent", first: name.split(" ")[0] };
}
