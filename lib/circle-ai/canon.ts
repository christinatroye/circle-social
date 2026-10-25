import "server-only";

/**
 * Circle's canon: the design rules every room follows. This is the taste Circle AI is taught,
 * and it never leaves the server. Each rule is written the way Christina said it, with why.
 * Add a rule here whenever Christina corrects a room, and add the room that taught it to the test set.
 */
export const CANON = {
  structure: [
    "The room's structure never changes: the ring of people, the light at the centre, the names in capitals, the host's toolbar, End the circle at the top right. A brand changes colour, type, mark and words only.",
    "The centre holds only a light. No artwork, question or slide sits in the middle of the room.",
    "Every guest walks the same four moments: sign in, the arrival (which is also the waiting room, with camera and mic), the room, and before you go.",
  ],
  arrival: [
    "The arrival comes from what the brand stands for, not what it sells. Read its values first (Speedrun: investing in the future; Lionheart: mental health, mindfulness and the future), then choose the arrival that expresses them.",
    "One living thing doing one quiet thing: it breathes, shimmers, glows, opens, gathers, drifts or rises. Never races, spins, flashes or streaks. It must never feel tacky.",
    "One breath lasts 6.5 seconds, rising for 42% of it and falling for the rest. Movement stays under 3%. Backgrounds drift over 20 seconds or more.",
    "A logo never swells. A logo that grows reads as an advert, not a threshold.",
  ],
  colour: [
    "The host's own words lead. What they say the gathering is for and how people should feel decides the room's mood, depth and light; the website comes second (Christina: \"the website should not be the first order informer\").",
    "Brand colours are a starting point, not a paint chart. Take them deeper or softer to suit the feeling: Muriel's brand oxblood is #681119, but her room's ground is the far deeper #110608 with a soft rose light (#e5b3a4) that isn't in her brand at all, because her brief asked for an exhale and a warm embrace.",
    "The brand's colour becomes the room's ground, with a warm light at the centre. Without a description, the website decides whether the room is light or dark.",
    "When a brand has two distinct colours, the room's sky is a pale blend of both, leaning to the second, and the strong first colour keeps to one corner. A room filled with one strong colour is too much (Christina on Speedrun: \"too purple, make it more blue, white with shades of purple\").",
    "Pick the brand's real colours, not a stray link or button colour. The host's mood picture may lend the accent; it never turns a light room dark.",
    "The people are the brightest thing in the room, not the room.",
  ],
  mark: [
    "The mark melts into the room. Never show a logo as a box or card (Christina: \"it melts in\"). Show a moving or coloured logo only through the shape of the mark, as the Speedrun room shows its gradient through its letters.",
    "Give the mark a touch more contrast than the light behind it, and a far, faint shadow that follows its shape, so it reads as a gap rather than a sticker.",
    "A logo on white or black is lifted off its background, never shown on it.",
  ],
  type: [
    "Carry the brand's own typefaces into the room. When they can't be loaded, the room's own Cormorant Garamond and Mulish stand in.",
  ],
  words: [
    "The room speaks in the live room's own words unless the host changes them: \"Take a moment to breathe and arrive.\", \"Enter when ready\", \"Before you go\".",
    "The feeling to aim for: this is new and exciting, I want to be part of this; a place to breathe and be; beautiful; the new club for smart people.",
    "Check every line for how it could be misread before it is shown.",
  ],
} as const;
