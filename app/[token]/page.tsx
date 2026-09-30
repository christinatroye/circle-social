import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { phaseFor, type ArrivalData } from "@/lib/arrival";
import { deviceKey, deviceState, guestForToken, othersInCircle, seatCount, touch } from "@/lib/guests.server";
import Arrival from "./Arrival";
import "./arrival.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Circle", robots: { index: false, follow: false } };

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
      seats: trusted ? await seatCount(circle.id) : 0,
    },
    others: trusted && phase !== "before" ? await othersInCircle(circle.id, guest.id) : [],
  };
  return <Arrival data={data} />;
}
