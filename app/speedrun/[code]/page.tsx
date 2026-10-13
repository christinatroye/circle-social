import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SITE_URL } from "@/lib/email.server";
import { WALKTHROUGH_MINUTES, walkthroughFor } from "@/lib/walkthroughs";
import { bookedTime } from "@/lib/walkthroughs.server";
import { bookTime, bringSomeone, suggestTime } from "./actions";
import { Booking } from "./Booking";
import "./speedrun.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/speedrun/[code]">): Promise<Metadata> {
  const walkthrough = walkthroughFor((await params).code);
  if (!walkthrough) return { title: "Circle" };
  const title = walkthrough.title, description = `${walkthrough.guest} and Christina Lundberg · ${WALKTHROUGH_MINUTES} minutes · online`;
  return {
    metadataBase: new URL(SITE_URL), title, description,
    robots: { index: false, follow: false },
    openGraph: { title, description, siteName: "Circle", type: "website" },
  };
}

/** A personal booking page for a short walk-through of Circle, in the colours of the room made for it. */
export default async function WalkthroughPage({ params }: PageProps<"/speedrun/[code]">) {
  const { code } = await params;
  const walkthrough = walkthroughFor(code);
  if (!walkthrough) notFound();
  const booked = await bookedTime(code);
  return (
    <main className="sr-page">
      <Booking
        walkthrough={walkthrough}
        booked={booked}
        pageUrl={`${SITE_URL}/speedrun/${code}`}
        book={bookTime.bind(null, code)}
        bring={bringSomeone.bind(null, code)}
        suggest={suggestTime.bind(null, code)}
      />
    </main>
  );
}
