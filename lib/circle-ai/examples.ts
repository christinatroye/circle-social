import "server-only";
import type { ArrivalKind } from "@/lib/brand";

/**
 * Christina's own rooms, each as: the website, what it stands for, the room she made, and why.
 * Circle AI learns from these the way an apprentice learns from a master's work.
 * `confirmed: false` marks details Claude inferred that Christina hasn't checked yet.
 */
export type RoomExample = {
  name: string;
  site: string;
  values: string[];
  colours: { brand: string; accent: string; dark: boolean; notes: string };
  fonts: { display: string; body: string };
  arrival: ArrivalKind | "custom";
  arrivalNotes: string;
  why: string;
  confirmed: boolean;
};

export const EXAMPLES: RoomExample[] = [
  {
    name: "Speedrun",
    site: "speedrun.a16z.com",
    values: ["investing in the future", "speed", "craft"],
    colours: {
      brand: "#6238cf", accent: "#35c0d9", dark: false,
      notes: "A pale sky blue (#c6e4f6 to #7e9cd8) with violet only in the top right corner and aqua down the left; a warm ivory and peach light at the centre; ink #241d3f.",
    },
    fonts: { display: "Cormorant Garamond", body: "Mulish" },
    arrival: "breathe",
    arrivalNotes: "The silver SR letters breathe on the light. Speedrun's moving gradient shows only through the letter shapes, with a little extra contrast and a far, faint shadow.",
    why: "A fund that invests in the future: a clear morning sky, light and forward-looking, with the brand's own moving mark rather than anything that races.",
    confirmed: true,
  },
  {
    name: "Lionheart",
    site: "lionheart.vc",
    values: ["mental health", "mindfulness", "the future"],
    colours: {
      brand: "#1e5f4b", accent: "#d8c894", dark: true,
      notes: "Candlelight through foliage at dusk: parchment and lichen at the core (#d8c894, #a9aa69), moss and olive through the middle, deep forest (#172718) into a near-black edge.",
    },
    fonts: { display: "Cormorant Garamond", body: "Mulish" },
    arrival: "breathe",
    arrivalNotes: "Lionheart's lion glows and breathes in the light, with Rumi's The Guest House as the sound.",
    why: "A fund about mental health and mindfulness: a dark, calm forest where the lion breathes slowly, so guests slow down as they arrive.",
    confirmed: true,
  },
  {
    name: "Oxblood",
    site: "murielhaas.com",
    values: ["embodiment", "pleasure", "power", "peace"],
    colours: {
      brand: "#110608", accent: "#e5b3a4", dark: true,
      notes: "An oxblood ground (#110608) with a soft rose light (#e5b3a4). Her brand guide is near-black #14191E, cream #F3EBE0 and oxblood #681119; the room takes the oxblood far deeper and adds a rose that isn't in the guide, because her brief asked for warmth, softness and an exhale. Her moodboard: crimson silk, pomegranate, red velvet, oxblood leather, honey, a dark flower.",
    },
    fonts: { display: "Ideas", body: "Public Sans" },
    arrival: "custom",
    arrivalNotes: "Muriel's flower opens, and a ball of light expands like a breath (her words: \"the expanding light ball that feels like breath expanding\").",
    why: "Weekly coaching and group sessions. Her brief: arriving should feel calm, grounded, down-regulated, connected to the senses, soft and sensual; \"entering feels like an exhale, a warm embrace\". The room came from that brief and her moodboard, not from her website.",
    confirmed: true,
  },
  {
    name: "Alien",
    site: "entercircle.co",
    values: ["curiosity", "wonder", "science"],
    colours: { brand: "#b0743e", accent: "#d9b784", dark: true, notes: "Circle's own warm room: amber and sand on a dark brown edge." },
    fonts: { display: "Cormorant Garamond", body: "Mulish" },
    arrival: "gather",
    arrivalNotes: "Stars gather into the talk's title, \"Do aliens speak physics?\", for Daniel Whiteson's evening.",
    why: "A talk about whether aliens would share our physics: stars gathering out of the dark into a question.",
    confirmed: false,
  },
  {
    name: "Electric Woman",
    site: "electricwoman",
    values: ["sisterhood", "the sacred feminine", "aliveness"],
    colours: { brand: "#b49a59", accent: "#a68a64", dark: false, notes: "Gold (#b49a59) and white with dusk greige; the room stays white and gold." },
    fonts: { display: "Cormorant Garamond", body: "Mulish" },
    arrival: "veils",
    arrivalNotes: "Her slim gold bolt breathes in front of her softened sepia photo, with sheer veils drifting slowly. Gold leaf from the photo can fill the bolt.",
    why: "A women's circle about aliveness and the sacred feminine, with a palo santo feeling: warm gold light, veils and one quiet bolt of energy.",
    confirmed: false,
  },
];
