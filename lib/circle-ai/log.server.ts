import "server-only";
import { database } from "@/lib/db.server";
import type { SiteReading } from "@/lib/read-site.server";
import type { Design } from "./design.server";

/**
 * Records every room Circle AI designs: what the site said, what Circle AI chose and why, and what it cost.
 * Christina's corrections are added to the same row later, so the record becomes Circle's own taste data.
 */
export async function logRoom(site: SiteReading | null, gathering: string, design: Design | null) {
  if (!process.env.DATABASE_URL) return;
  // The page's words can be long; the rest is enough to see what Circle AI was given.
  const reading = { gathering, site: site && { ...site, text: site.text.slice(0, 500) } };
  try {
    await database()`
      INSERT INTO room_log (site, reading, choice, model, ms, input_tokens, output_tokens)
      VALUES (${(site?.url ?? "(described only)").slice(0, 300)}, ${JSON.stringify(reading)}, ${design ? JSON.stringify(design.choice) : null},
        ${design?.model ?? null}, ${design?.ms ?? null}, ${design?.inputTokens ?? null}, ${design?.outputTokens ?? null})
    `;
  } catch (error) {
    // A missing table or a busy database must never stop a host seeing their room.
    console.error("Could not log the room.", error);
  }
}
