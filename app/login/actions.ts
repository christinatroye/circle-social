"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { withinLimit } from "@/lib/db.server";
import { createHostSession, deleteHostSession, hostAuthConfigured, hostCredentialsValid } from "@/lib/host-auth.server";

export async function signIn(_state: string | undefined, form: FormData) {
  if (!hostAuthConfigured()) return "Sign-in is not set up yet.";
  const email = String(form.get("email") ?? "").slice(0, 254);
  const password = String(form.get("password") ?? "").slice(0, 1024);
  if (!email || !password) return "Enter your email and password.";
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!await withinLimit(`login:${ip}`, 8, 15 * 60)) return "Too many attempts. Please try again in 15 minutes.";
  if (!hostCredentialsValid(email, password)) return "That email or password isn't right.";
  await createHostSession();
  redirect("/host");
}

export async function signOut() {
  await deleteHostSession();
  redirect("/login");
}
