import type { Metadata } from "next";
import Image from "next/image";
import { CircleMark } from "@/components/CircleMark";
import { SITE_URL } from "@/lib/email.server";
import portrait from "@/public/events/jimmy-wales.webp";
import { ApplyForSeat } from "../perfect/ApplyForSeat";
import "../perfect/perfect.css";
import "./trust.css";

const title = "Trust, a Circle with Jimmy Wales";
const description = "Who do you trust, and why? Monday 30 November, online.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title,
  description,
  openGraph: { title, description, url: "/trust", siteName: "Circle", type: "website" },
  twitter: { card: "summary_large_image", title, description },
};

/** The public page for Trust: what people land on from a shared link, and where they apply for a seat. */
export default function TrustPage() {
  return (
    <main className="event trust">
      <div className="trust-glow" aria-hidden="true" />
      <div className="event-portrait">
        <Image src={portrait} alt="Jimmy Wales" fill priority sizes="(min-width: 900px) 50vw, 100vw" />
        <CircleMark className="event-mark" />
      </div>
      <article className="event-body">
        <h1 className="event-title">Trust</h1>
        <p className="event-with">A Circle with Jimmy Wales</p>

        <div className="event-copy">
          <p>Who do you trust, and why?</p>
          <p>Most of what we know, we haven’t checked ourselves. We couldn’t. Getting through an ordinary day means relying on people we’ll never meet and decisions we weren’t there to question.</p>
          <p>Now we’re turning to AI for answers, while a handful of companies shape what billions of us see and know. Their answers are easy to get. How they arrived at them, and whose interests they serve, can be much harder to see.</p>
          <p>Jimmy Wales co-founded Wikipedia on the idea that knowledge could be built in the open, by strangers. You can follow the sources and see people disagree. What you read can be challenged and changed.</p>
          <p>He set up the non-profit that supports it, and Wikipedia remains free of advertising. How much say do we have in the other systems we’ve come to depend on?</p>
          <p>In his book, <i>The Seven Rules of Trust</i>, Jimmy explores what it takes to earn trust and keep it.</p>
          <p>What part can each of us play in building a world worth trusting? And how do we stay trustworthy ourselves, even when it costs us?</p>
        </div>

        <p className="event-when event-when-end">Monday 30 November · 6pm UK</p>
        <p className="event-opens">Jimmy opens, then the room joins in. You’re welcome to speak, or simply listen.</p>
        <p className="event-facts">Small group. Invite only. Online. Not recorded.</p>
        <ApplyForSeat event="trust" className="trust-apply" />
      </article>
    </main>
  );
}
