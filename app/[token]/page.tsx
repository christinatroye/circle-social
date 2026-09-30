import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { phaseFor, type ArrivalData } from "@/lib/arrival";
import { deviceKey, deviceState, guestForToken, othersInCircle, seatCount, touch } from "@/lib/guests.server";
import Arrival from "./Arrival";
import "./arrival.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Circle", robots: { index: false, follow: false } };

/** The public invitation for each Circle, shown to the speaker. */
const INVITATIONS: Record<string, string> = { alien: "https://luma.com/d1bodo24" };

export default async function GuestPage({ params }: PageProps<"/[token]">) {
  const { token } = await params;
  const found = await guestForToken(token);
  if (!found) notFound();
  const { guest, circle } = found;
  const device = deviceState(guest, await deviceKey());
  if (device === "mine") await touch(guest.id);

  const phase = phaseFor(circle.starts_at, circle.reveal_at);
  const trusted = device !== "elsewhere";

  const data: ArrivalData = {
    token,
    device,
    phase,
    firstVisit: !guest.first_opened_at || device === "open",
    me: {
      first: guest.first_name,
      name: trusted ? guest.name : guest.first_name,
      speaker: guest.role === "speaker",
      introduction: trusted ? guest.introduction : "",
      shared: guest.shared,
      beenBefore: guest.been_before,
      confirmed: Boolean(guest.introduction_confirmed_at),
      cancelled: Boolean(guest.cancelled_at),
    },
    circle: {
      title: circle.title, speaker: circle.speaker, speakerLine: circle.speaker_line, question: circle.question,
      startsAt: circle.starts_at, revealAt: circle.reveal_at, roomUrl: trusted && phase === "day" ? circle.room_url : null,
      inviteUrl: INVITATIONS[circle.slug] ?? null,
      seats: trusted ? await seatCount(circle.id) : 0,
    },
    // Before the reveal, the speaker is the only other seat that shows.
    others: !trusted ? [] : (await othersInCircle(circle.id, guest.id)).filter(person => phase !== "before" || person.speaker),
  };
  return <Arrival data={data} />;
}
