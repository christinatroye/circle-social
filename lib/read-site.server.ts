import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { parseHex, saturation, luminance, toHex } from "@/lib/brand";

/** What a website says about itself, before anything is interpreted. */
export type SiteReading = {
  url: string;
  title: string;
  siteName: string;
  description: string;
  themeColour: string | null;
  /** Saturated colours from the page and its stylesheets, most used first. */
  colours: string[];
  /** Whether the page itself sits on a dark background. */
  darkPage: boolean;
  /** Google Fonts families the site loads, in the order it loads them. */
  fonts: string[];
  logo: string | null;
  image: string | null;
  /** Visible words from the page, for reading what the brand stands for. */
  text: string;
};

const MAX_BYTES = 1_500_000;
const TIMEOUT_MS = 8000;

/** Private, loopback and link-local ranges: a pasted address must never reach inside our own network. */
function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 6) {
    const a = address.toLowerCase();
    return a === "::1" || a === "::" || a.startsWith("fc") || a.startsWith("fd") || a.startsWith("fe80") || a.startsWith("::ffff:") && isPrivateAddress(a.slice(7));
  }
  const [p, q] = address.split(".").map(Number);
  return p === 10 || p === 127 || p === 0 || (p === 169 && q === 254) || (p === 172 && q >= 16 && q <= 31) || (p === 192 && q === 168) || (p === 100 && q >= 64 && q <= 127) || p >= 224;
}

async function assertPublic(url: URL) {
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Only web addresses can be read.");
  if (url.port && url.port !== "80" && url.port !== "443") throw new Error("Only web addresses can be read.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (!addresses.length || addresses.some(a => isPrivateAddress(a.address))) throw new Error("That address can't be read.");
}

/** Fetches a public page, following at most three redirects and checking each hop. */
async function fetchPublic(start: string, accept: string) {
  let url = new URL(start);
  for (let hop = 0; hop < 4; hop++) {
    await assertPublic(url);
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { accept, "user-agent": "Mozilla/5.0 (compatible; CircleRoomMaker/1.0; +https://entercircle.co)" },
    });
    const next = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && next) { url = new URL(next, url); continue; }
    if (!response.ok || !response.body) throw new Error(`The site answered ${response.status}.`);
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (size < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      size += value.length;
    }
    await reader.cancel().catch(() => {});
    return { url, body: new TextDecoder().decode(Buffer.concat(chunks)) };
  }
  throw new Error("The site redirected too many times.");
}

const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");

function meta(html: string, key: string) {
  const tag = html.match(new RegExp(`<meta[^>]+(?:name|property)=["']${key}["'][^>]*>`, "i"))?.[0];
  return tag ? decode(tag.match(/content=["']([^"']*)["']/i)?.[1] ?? "").trim() : "";
}

function absolute(href: string | undefined, base: URL) {
  if (!href) return null;
  try { const u = new URL(decode(href), base); return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null; } catch { return null; }
}

/** The most likely logo: an image or link named like one, then a large touch icon. */
function findLogo(html: string, base: URL) {
  for (const tag of html.match(/<img[^>]+>/gi) ?? []) {
    if (/logo|brand|wordmark/i.test(tag)) {
      const src = tag.match(/\ssrc=["']([^"']+)["']/i)?.[1];
      if (src && !src.startsWith("data:")) return absolute(src, base);
    }
  }
  const icon = html.match(/<link[^>]+rel=["'][^"']*apple-touch-icon[^"']*["'][^>]*>/i)?.[0];
  return absolute(icon?.match(/href=["']([^"']+)["']/i)?.[1], base);
}

function countColours(css: string, tally: Map<string, number>) {
  for (const match of css.matchAll(/#([0-9a-f]{6}|[0-9a-f]{3})\b/gi)) {
    const rgb = parseHex(match[0]);
    if (!rgb || saturation(rgb) < 0.25 || luminance(rgb) > 0.85 || luminance(rgb) < 0.02) continue;
    const hex = toHex(rgb);
    tally.set(hex, (tally.get(hex) ?? 0) + 1);
  }
  for (const match of css.matchAll(/rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/gi)) {
    const rgb = [match[1], match[2], match[3]].map(Number) as [number, number, number];
    if (saturation(rgb) < 0.25 || luminance(rgb) > 0.85 || luminance(rgb) < 0.02) continue;
    const hex = toHex(rgb);
    tally.set(hex, (tally.get(hex) ?? 0) + 1);
  }
}

/** Whether the page's own background is dark, from the body or html rule. */
function readsDark(css: string) {
  const rule = css.match(/(?:^|[}\s])(?:html|body)\s*\{[^}]*background(?:-color)?\s*:\s*([^;}]+)/i)?.[1];
  const rgb = rule ? parseHex(rule.match(/#[0-9a-f]{3,6}\b/i)?.[0] ?? "") : null;
  return rgb ? luminance(rgb) < 0.12 : false;
}

/** Reads one website: its name, words, colours, type and mark. Throws a sentence a host can read. */
export async function readSite(input: string): Promise<SiteReading> {
  const raw = input.trim();
  const start = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const { url, body: html } = await fetchPublic(start, "text/html,application/xhtml+xml");

  const sheets = [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi)]
    .map(m => absolute(m[0].match(/href=["']([^"']+)["']/i)?.[1], url))
    .filter((href): href is string => !!href && !href.includes("fonts.googleapis.com"))
    .slice(0, 3);
  const external = (await Promise.all(sheets.map(href => fetchPublic(href, "text/css").then(r => r.body).catch(() => "")))).join("\n");
  return interpretSite(html, url, external);
}

/** What a page says about itself, from its HTML and the stylesheets it links. */
export function interpretSite(html: string, url: URL, external: string): SiteReading {
  const styles = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map(m => m[1]).join("\n");
  const inline = [...html.matchAll(/style=["']([^"']+)["']/gi)].map(m => m[1]).join(";");
  const tally = new Map<string, number>();
  countColours(styles + "\n" + inline + "\n" + external, tally);
  const colours = [...tally.entries()].sort((a, b) => b[1] - a[1]).map(([hex]) => hex).slice(0, 8);

  const fonts = [...html.matchAll(/fonts\.googleapis\.com\/css2?\?([^"'\s>]+)/gi)]
    .flatMap(m => [...decode(m[1]).matchAll(/family=([^&:]+)/g)].map(f => decodeURIComponent(f[1].replace(/\+/g, " "))))
    .filter((f, i, all) => all.indexOf(f) === i);

  const title = decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/\s+/g, " ").trim();
  const text = decode(html
    .replace(/<(script|style|noscript|svg|template)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ").trim().slice(0, 6000);

  return {
    url: url.toString(),
    title,
    siteName: meta(html, "og:site_name") || title.split(/\s[|–—-]\s/)[0].trim(),
    description: meta(html, "description") || meta(html, "og:description"),
    themeColour: parseHex(meta(html, "theme-color")) ? toHex(parseHex(meta(html, "theme-color"))!) : null,
    colours,
    darkPage: readsDark(styles + "\n" + external),
    fonts,
    logo: findLogo(html, url),
    image: absolute(meta(html, "og:image") || undefined, url),
    text,
  };
}
