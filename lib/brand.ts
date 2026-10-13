/** What Circle reads from a host's website, and the rules that turn it into a room. */

/**
 * The quiet arrivals Circle can suggest. Each one is one living thing doing one quiet thing,
 * on the 6.5 second breath; none of them races, spins or flashes.
 */
export const ARRIVALS = {
  breathe: { name: "Your mark, breathing", line: "Your mark rests on the light and breathes with it." },
  "first-light": { name: "First light", line: "The night lifts slowly into your colours, and your mark breathes in the light." },
  gather: { name: "Stars gathering", line: "Points of light drift in from the dark and gather into your name." },
  veils: { name: "Veils of light", line: "Sheer veils drift slowly across the light, and your mark glows in time with the breath." },
} as const;

export type ArrivalKind = keyof typeof ARRIVALS;

export const SIZES = [
  { id: "small", label: "2 to 5", note: "close and personal", seats: 5 },
  { id: "circle", label: "6 to 12", note: "a circle", seats: 10 },
  { id: "gathering", label: "13 to 25", note: "a gathering", seats: 16 },
] as const;

export const PURPOSES = ["Team meeting", "All-hands", "Client sessions", "Coaching group", "Community", "Talk or launch", "Workshop", "Something else"] as const;

export const RHYTHMS = ["Once", "Every week", "Every two weeks", "Every month"] as const;

export type Brand = {
  /** The address as Circle read it, e.g. "speedrun.a16z.com". */
  site: string;
  name: string;
  logo: string | null;
  /** What the logo file sits on, so the room can lift it off a white or black box. */
  /** What the logo file sits on. "boxed" is a box of its own colour, whose edges are softened into the room. */
  logoBacking: "clear" | "light" | "dark" | "boxed";
  /** An image shown only through the mark's shape, like Speedrun's moving gradient through its letters. */
  texture?: string | null;
  /** The mark's width over its height, when known. */
  logoRatio?: number;
  /** The room's ground, its light, and the ink that sits on them. */
  colours: { brand: string; accent: string; field: string; ground: string; edge: string; light: string; ink: string; muted: string };
  dark: boolean;
  fonts: { display: string; body: string };
  /** What they stand for, not what they sell. Empty when Circle couldn't read it. */
  values: string[];
  arriving: string[];
  arrival: ArrivalKind;
  /** One sentence: what Circle read, and why that arrival. */
  reading: string;
  /** An image the host added for the mood. Stays in their browser; only the preview uses it. */
  mood: string | null;
};

/** The room's own type, used when a site's fonts can't be carried in. */
export const ROOM_FONTS = { display: "Cormorant Garamond", body: "Mulish" };

type Rgb = [number, number, number];

export function parseHex(value: string): Rgb | null {
  const hex = value.trim().replace(/^#/, "");
  if (!/^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return null;
  const full = hex.length === 3 ? [...hex].map(c => c + c).join("") : hex;
  return [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16)) as Rgb;
}

export const toHex = (rgb: Rgb) => "#" + rgb.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");

export const mix = (a: Rgb, b: Rgb, amount: number): Rgb => [0, 1, 2].map(i => a[i] + (b[i] - a[i]) * amount) as Rgb;

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function luminance([r, g, b]: Rgb) {
  const channel = (v: number) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function saturation([r, g, b]: Rgb) {
  const max = Math.max(r, g, b) / 255, min = Math.min(r, g, b) / 255;
  if (max === min) return 0;
  const l = (max + min) / 2;
  return (max - min) / (1 - Math.abs(2 * l - 1));
}

/** How far apart two colours sit on the colour wheel, in degrees. */
function hueGap(a: Rgb, b: Rgb) {
  const hue = ([r, g, b]: Rgb) => {
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    if (!d) return 0;
    const h = max === r ? (g - b) / d : max === g ? 2 + (b - r) / d : 4 + (r - g) / d;
    return (h * 60 + 360) % 360;
  };
  const gap = Math.abs(hue(a) - hue(b));
  return Math.min(gap, 360 - gap);
}

const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];
const WARM_LIGHT: Rgb = [253, 231, 210];

/**
 * The rule: their main colour becomes the ground, and the room keeps a warm light in the middle.
 * A light brand gets a pale ground washed with its colour; a dark brand gets its colour deepened.
 */
export function roomColours(brandHex: string, accentHex: string, dark: boolean): Brand["colours"] {
  const brand = parseHex(brandHex) ?? [98, 56, 207];
  const accent = parseHex(accentHex) ?? brand;
  if (dark) {
    const ground = mix(brand, BLACK, 0.72);
    return {
      brand: toHex(brand), accent: toHex(accent), field: toHex(brand), ground: toHex(ground), edge: toHex(ground),
      light: toHex(mix(mix(accent, WARM_LIGHT, 0.6), ground, 0.35)),
      ink: toHex(mix(WARM_LIGHT, WHITE, 0.4)), muted: toHex(mix(mix(WARM_LIGHT, WHITE, 0.4), ground, 0.4)),
    };
  }
  // When a brand has two distinct colours, the room's open sky blends them, leaning to the second, so the strong
  // first colour keeps to one corner instead of filling the room (Speedrun: violet and aqua give a blue sky).
  // Colours that are close, or would mix to grey, are not blended: the sky is then the first colour, kept pale.
  const blend = mix(brand, accent, 0.6);
  const two = hueGap(brand, accent) > 40 && saturation(blend) >= 0.6 * Math.min(saturation(brand), saturation(accent));
  const field = two ? blend : brand;
  const ground = mix(field, WHITE, two ? 0.7 : 0.78);
  const edge = mix(ground, field, two ? 0.45 : 0.18);
  const ink = mix(brand, BLACK, luminance(brand) > 0.3 ? 0.82 : 0.6);
  return {
    brand: toHex(brand), accent: toHex(accent), field: toHex(field), ground: toHex(ground), edge: toHex(edge),
    light: toHex(mix(WARM_LIGHT, WHITE, 0.15)), ink: toHex(ink), muted: toHex(mix(ink, ground, 0.35)),
  };
}

/** The colour a picture is made of: its most frequent saturated tone, and whether it is dark overall. */
export function pictureColours(pixels: Uint8ClampedArray) {
  const tally = new Map<string, { rgb: Rgb; n: number }>();
  let light = 0, count = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 128) continue;
    const rgb: Rgb = [pixels[i], pixels[i + 1], pixels[i + 2]];
    light += luminance(rgb); count++;
    if (saturation(rgb) < 0.2 || luminance(rgb) < 0.03 || luminance(rgb) > 0.9) continue;
    const key = rgb.map(v => v >> 5).join(",");
    const entry = tally.get(key);
    if (entry) { entry.n++; entry.rgb = mix(entry.rgb, rgb, 1 / entry.n); } else tally.set(key, { rgb, n: 1 });
  }
  const ranked = [...tally.values()].sort((a, b) => b.n - a.n);
  return { main: ranked[0] ? toHex(ranked[0].rgb) : null, second: ranked[1] ? toHex(ranked[1].rgb) : null, dark: count > 0 && light / count < 0.18 };
}

/** Readable host name from an address: "https://www.lionheart.vc/about" becomes "lionheart.vc". */
export function siteName(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}
