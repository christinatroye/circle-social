import type { Metadata } from "next";
import { Maker } from "./Maker";
import "./make.css";

// Circle AI reads the site while the host answers the questions; give it time to think.
export const maxDuration = 60;

export const metadata: Metadata = {
  title: "Make a room · Circle",
  description: "Design your gathering. Your words become the room.",
};

/** The room maker: a host pastes their website and walks through a Circle room made from their brand. Not linked from anywhere yet. */
export default function MakePage() {
  return <Maker />;
}
