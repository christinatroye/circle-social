import type { Metadata } from "next";
import Image from "next/image";
import { CircleMark } from "@/components/CircleMark";
import { SITE_URL } from "@/lib/email.server";
import portrait from "@/public/events/jimmy-wales.webp";
import { ApplyForSeat } from "../perfect/ApplyForSeat";
import "../perfect/perfect.css";
import "./trust.css";

const title = "Trust, a Circle with Jimmy Wales";
const description = "Who do you trust, and why? Tuesday 24 November, online.";

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
          <p>We’re handing more of our lives to AI that even its builders don’t fully understand, and to a handful of companies that shape what billions of us see and know. Anyone can now fake a voice, a face or a headline. We can check more than ever, yet still struggle to know what to believe.</p>
          <p>Jimmy Wales co-founded Wikipedia on the idea that knowledge could be built in the open, by strangers, with sources to follow and mistakes others could correct. He set up the non-profit that supports it, and Wikipedia remains free of advertising. It depends on trust, but also gives us ways to question it. In <i>The Seven Rules of Trust</i>, he explores what it takes to earn trust, and keep it.</p>
          <p>We’ve always had to decide who and what to believe, but never at this scale. The question reaches into our closest relationships too. How do we stay open without being naïve? When so little feels certain, the rarest thing may be someone you can truly believe. How do we find them, and how do we become them?</p>
        </div>

        <p className="event-when event-when-end">Tuesday 24 November · 6pm UK</p>
        <p className="event-opens">Jimmy opens, then the room joins in. You’re welcome to speak, or simply listen.</p>
        <p className="event-facts">Small group. Invite only. Online. Not recorded.</p>
        <ApplyForSeat event="trust" className="trust-apply" />
      </article>
    </main>
  );
}
