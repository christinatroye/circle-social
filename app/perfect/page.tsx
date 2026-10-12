import type { Metadata } from "next";
import Image from "next/image";
import { CircleMark } from "@/components/CircleMark";
import { SITE_URL } from "@/lib/email.server";
import portrait from "@/public/events/heather-widdows.webp";
import { ApplyForSeat } from "./ApplyForSeat";
import "./perfect.css";

const title = "Perfect, a Circle with Heather Widdows";
const description = "What does it mean to be beautiful now? Tuesday 10 November, online.";

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
        <p className="event-when">Tuesday 10 November · 6pm UK time</p>

        <div className="event-copy">
          <p>What does it mean to be beautiful now? When filters reshape our faces before anyone sees them. When AI generates faces that don’t exist and we compare ourselves to them anyway. When a whole industry runs on the feeling that you’re almost, but never quite, enough.</p>
          <p>Prof. Heather Widdows is the philosopher who argued that beauty isn’t vanity. It’s ethics. Her book <i>Perfect Me: Beauty as an Ethical Ideal</i> makes the case that beauty has quietly become one of the dominant moral frameworks of our time, shaping how we judge ourselves, each other, and what counts as a good life. Vogue called it groundbreaking. The Atlantic named it one of the best books of 2018.</p>
          <p>This is not a conversation about skincare or self-love. It’s about how beauty became a moral demand, and what it costs us to comply.</p>
          <p className="event-opens">Heather opens, then the room joins in.</p>
        </div>

        <p className="event-facts">Small group. Invite only. Online. Not recorded.</p>
        <ApplyForSeat />
      </article>
    </main>
  );
}
