import { WALKTHROUGH_MINUTES, type Walkthrough } from "@/lib/walkthroughs";

const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/**
 * The calendar file for a booked walk-through. Its only link is the guest's own page, which opens the room on the day.
 * With `invite`, it's a meeting request (organiser and attendee), so a calendar adds it straight from the email.
 */
export function walkthroughCalendar(walkthrough: Walkthrough, startsAt: string, link: string, invite?: { organizer: string; attendee: string }) {
  const start = new Date(startsAt), end = new Date(start.getTime() + WALKTHROUGH_MINUTES * 60_000);
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Circle//Walk-through//EN", `METHOD:${invite ? "REQUEST" : "PUBLISH"}`,
    "BEGIN:VEVENT",
    `UID:${walkthrough.code}-${stamp(start)}@entercircle.co`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${walkthrough.title}`,
    `DESCRIPTION:${walkthrough.guest} and Christina Lundberg\\, ${WALKTHROUGH_MINUTES} minutes\\, online.\\n\\nJoin: ${link}`,
    `LOCATION:${link}`,
    `URL:${link}`,
    ...(invite ? [`ORGANIZER:mailto:${invite.organizer}`, `ATTENDEE;PARTSTAT=ACCEPTED;RSVP=FALSE:mailto:${invite.attendee}`] : []),
    "END:VEVENT", "END:VCALENDAR", "",
  ].join("\r\n");
}
