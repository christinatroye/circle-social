"use server";

import { headers } from "next/headers";
import { type Brand, ROOM_FONTS, luminance, parseHex, roomColours, siteName } from "@/lib/brand";
import { withinLimit } from "@/lib/db.server";
import { readSite } from "@/lib/read-site.server";

export type Reading = { status: "read"; brand: Brand } | { status: "error"; message: string };

/** Reads a host's website and turns it into a room, following the brand-to-room rules in lib/brand.ts. */
export async function readBrand(address: string): Promise<Reading> {
  const input = String(address ?? "").trim().slice(0, 300);
  if (!input || /\s/.test(input) || !input.includes(".")) return { status: "error", message: "Please paste your website's address." };
  try {
    if (process.env.DATABASE_URL) {
      const ip = (await headers()).get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
      if (!await withinLimit(`make:${ip}`, 30, 60 * 60)) return { status: "error", message: "You've made a lot of rooms. Please try again in a little while." };
    }
  } catch { /* A busy database shouldn't stop someone seeing their room. */ }

  let site;
  try {
    site = await readSite(input);
  } catch {
    return { status: "error", message: "We couldn't open that website. Please check the address and try again." };
  }

  const brandHex = site.themeColour ?? site.colours[0] ?? "#6238cf";
  const accentHex = site.colours.find(c => c !== brandHex) ?? brandHex;
  const themeRgb = site.themeColour ? parseHex(site.themeColour) : null;
  const dark = site.darkPage || (!!themeRgb && luminance(themeRgb) < 0.06);
  const display = site.fonts[0] ?? ROOM_FONTS.display;
  const body = site.fonts[1] ?? ROOM_FONTS.body;

  return {
    status: "read",
    brand: {
      site: siteName(site.url),
      name: site.siteName || siteName(site.url),
      logo: site.logo,
      logoBacking: "clear",
      colours: roomColours(brandHex, accentHex, dark),
      dark,
      fonts: { display, body },
      values: [],
      arriving: [],
      arrival: site.logo ? "breathe" : "gather",
      mood: null,
      reading: `Your colours${site.fonts.length ? ", your type" : ""}${site.logo ? " and your mark" : ""}, carried into the room.`,
    },
  };
}
