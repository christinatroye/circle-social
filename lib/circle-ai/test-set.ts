import "server-only";

/**
 * The websites every change to Circle AI must still turn into rooms Christina would sign off on.
 * The first five are her own rooms; the rest cover the hosts Circle is for. Christina chooses the last five.
 */
export const TEST_SET: { site: string; kind: string; expect: string }[] = [
  { site: "speedrun.a16z.com", kind: "startup fund", expect: "Matches the Speedrun example: blue sky, violet in one corner, letters with no box." },
  { site: "lionheart.vc", kind: "fund, wellbeing", expect: "Matches the Lionheart example: dark forest, the lion breathing." },
  { site: "murielhaas.com", kind: "artist", expect: "Matches the Oxblood example." },
  { site: "entercircle.co", kind: "Circle itself", expect: "Circle's own warm room." },
  { site: "electricwoman", kind: "women's community", expect: "Matches the Electric Woman example: white and gold, veils." },
  { site: "", kind: "coach", expect: "" },
  { site: "", kind: "therapist", expect: "" },
  { site: "", kind: "creative studio", expect: "" },
  { site: "", kind: "community", expect: "" },
  { site: "", kind: "startup all-hands", expect: "" },
];
