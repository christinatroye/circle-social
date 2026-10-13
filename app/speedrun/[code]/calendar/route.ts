import { SITE_URL } from "@/lib/email.server";
import { walkthroughCalendar } from "@/lib/walkthrough-calendar";
import { walkthroughFor } from "@/lib/walkthroughs";
import { bookedTime } from "@/lib/walkthroughs.server";

/** The calendar file a guest adds after booking. */
export async function GET(_request: Request, { params }: RouteContext<"/speedrun/[code]/calendar">) {
  const { code } = await params;
  const walkthrough = walkthroughFor(code);
  const booked = walkthrough ? await bookedTime(code) : null;
  if (!walkthrough || !booked) return new Response("Not found", { status: 404 });
  return new Response(walkthroughCalendar(walkthrough, booked, `${SITE_URL}/speedrun/${code}`), {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'attachment; filename="circle.ics"', "Cache-Control": "no-store" },
  });
}
