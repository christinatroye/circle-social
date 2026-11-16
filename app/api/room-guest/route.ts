import { guestInRoom, roomMayAsk } from "@/lib/room-guest.server";

export const dynamic = "force-dynamic";

/** Asked by room.entercircle.co when someone joins: their name and introduction, or nothing. */
export async function POST(request: Request) {
  if (!roomMayAsk(request.headers.get("authorization"))) return Response.json({}, { status: 404 });
  let body: { links?: unknown; guest?: unknown; name?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({}, { status: 400 });
  }
  const text = (value: unknown, max: number) => (typeof value === "string" ? value.slice(0, max) : "");
  const links = Array.isArray(body.links) ? body.links.slice(0, 20).map(link => text(link, 300)) : [];
  const found = await guestInRoom(links, text(body.guest, 60), text(body.name, 40));
  return Response.json(found ?? {}, { headers: { "Cache-Control": "no-store" } });
}
