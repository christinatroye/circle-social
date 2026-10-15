import type { Metadata } from "next";
import Image from "next/image";
import { CircleMark } from "@/components/CircleMark";
import { SITE_URL } from "@/lib/email.server";
import portrait from "@/public/events/heather-widdows.webp";
import { ApplyForSeat } from "./ApplyForSeat";
import "./perfect.css";

const title = "Perfect, a Circle with Heather Widdows";
const description = "Who are you, really? Tuesday 10 November, online.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title,
  description,
  openGraph: { title, description, url: "/perfect", siteName: "Circle", type: "website" },
  twitter: { card: "summary_large_image", title, description },
};

/** The public page for Perfect: what people land on from a shared link, and where they apply for a seat. */
export default function PerfectPage() {
  return (
    <main className="event">
      <div className="event-portrait">
        <Image src={portrait} alt="Heather Widdows, painted" fill priority sizes="(min-width: 900px) 50vw, 100vw" />
        <CircleMark className="event-mark" />
      </div>
      <article className="event-body">
        <h1 className="event-title">Perfect</h1>
        <p className="event-with">A Circle with Heather Widdows</p>

        <div className="event-copy">
          <p>Who are you, really? We used to answer that question by talking about character: our values, our beliefs, the kind of person we were trying to become.</p>
          <p>Now scroll for a minute: glow-ups, looksmaxxing, Ozempic, anti-ageing. We still talk about becoming a better version of ourselves, but more and more of that work seems to happen on the outside.</p>
          <p>Beauty used to be thought of as a gift, something you were born with or could afford. Philosopher Heather Widdows argues that it’s now something we’re all expected to work for, and that how we look has become part of who we are. Effort reads as virtue, and “letting yourself go” sounds like a moral failure.</p>
          <p>The work never really ends, because as soon as you fix one thing, you start noticing the next. Keeping up costs time, money and sometimes your health, but opting out has a price of its own.</p>
          <p>If you think none of this applies to you, her book <i>Perfect Me</i>, named a Book of the Year by The Atlantic and called groundbreaking by Vogue, might change your mind.</p>
          <p>So where does the self live now? And who gets to decide what a better version of us looks like?</p>
        </div>

        <p className="event-when event-when-end">Tuesday 10 November · 6pm UK time</p>
        <p className="event-facts">Online. Small group. Invite only. Not recorded.</p>
        <p className="event-opens">Heather opens, then the room joins in. You’re welcome to speak or simply listen.</p>
        <ApplyForSeat />
      </article>
    </main>
  );
}
