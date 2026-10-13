/** Personal booking pages for a short walk-through of Circle, one private link per person. */
export type Walkthrough = {
  code: string;
  guest: string;
  first: string;
  title: string;
  line: string;
  /** Start times offered, in UTC. Each walk-through is ten minutes. */
  slots: string[];
  /** The room the page opens on the day. Until it's set, the page doesn't offer one. */
  roomUrl?: string;
};

export const WALKTHROUGH_MINUTES = 10;

export const WALKTHROUGHS: Walkthrough[] = [
  {
    code: "andrew-kwwogb1p",
    guest: "Andrew Chen",
    first: "Andrew",
    title: "A room for Speedrun",
    line: "Step inside a Circle room we made for Speedrun. No agenda. Just see if it feels different.",
    // Friday 23 October, 5:00 and 5:30pm UK; Monday 26 October (after the clocks change), 4:00, 4:30, 5:00 and 5:30pm UK.
    slots: ["2026-10-23T16:00:00Z", "2026-10-23T16:30:00Z", "2026-10-26T16:00:00Z", "2026-10-26T16:30:00Z", "2026-10-26T17:00:00Z", "2026-10-26T17:30:00Z"],
  },
];

export function walkthroughFor(code: string) {
  return WALKTHROUGHS.find(walkthrough => walkthrough.code === code);
}
