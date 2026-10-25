"use server";

import { headers } from "next/headers";
import { type Brand, ROOM_FONTS, luminance, parseHex, roomColours, siteName } from "@/lib/brand";
import { withinLimit } from "@/lib/db.server";
import { designRoom } from "@/lib/circle-ai/design.server";
import { logRoom } from "@/lib/circle-ai/log.server";
import { readSite } from "@/lib/read-site.server";

export type Reading = { status: "read"; brand: Brand } | { status: "error"; message: string };

/**
 * Turns what a host tells us into a room: their description of the gathering, their website, or both.
 * Circle AI reads the description first; the plain rules in lib/brand.ts stand in when it can't.
 */
export async function readBrand(address: string, described = ""): Promise<Reading> {
  const input = String(address ?? "").trim().slice(0, 300);
  const gathering = String(described ?? "").trim().slice(0, 6000);
  if (!input && !gathering) return { status: "error", message: "Please tell us about your gathering, or paste your website's address." };
  if (input && (/\s/.test(input) || !input.includes("."))) return { status: "error", message: "Please paste your website's address." };
  try {
    if (process.env.DATABASE_URL) {
      const ip = (await headers()).get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
      if (!await withinLimit(`make:${ip}`, 30, 60 * 60)) return { status: "error", message: "You've made a lot of rooms. Please try again in a little while." };
    }
  } catch { /* A busy database shouldn't stop someone seeing their room. */ }

  let site = null;
  if (input) {
    try {
      site = await readSite(input);
    } catch {
      // With a description to go on, a website that won't open shouldn't stop the room.
      if (!gathering) return { status: "error", message: "We couldn't open that website. Please check the address and try again." };
    }
  }

  const design = await designRoom(site, gathering);
  await logRoom(site, gathering, design);
  const ai = design?.choice;

  const brandHex = ai?.brand ?? site?.themeColour ?? site?.colours[0] ?? "#6238cf";
  const accentHex = ai?.accent ?? site?.colours.find(c => c !== brandHex) ?? brandHex;
  const themeRgb = site?.themeColour ? parseHex(site.themeColour) : null;
  const dark = ai?.dark ?? (site ? site.darkPage || (!!themeRgb && luminance(themeRgb) < 0.06) : true);
  const display = ai?.fonts.display ?? site?.fonts[0] ?? ROOM_FONTS.display;
  const body = ai?.fonts.body ?? site?.fonts[1] ?? ROOM_FONTS.body;
  const logo = site?.logo ?? null;

  return {
    status: "read",
    brand: {
      site: site ? siteName(site.url) : "",
      name: site ? site.siteName || siteName(site.url) : "",
      logo,
      logoBacking: "clear",
      colours: roomColours(brandHex, accentHex, dark),
      dark,
      fonts: { display, body },
      values: ai?.values ?? [],
      arriving: [],
      arrival: ai?.arrival ?? (logo ? "breathe" : "gather"),
      mood: null,
      reading: ai?.reading ?? `Your colours${site?.fonts.length ? ", your type" : ""}${logo ? " and your mark" : ""}, carried into the room.`,
    },
  };
}
