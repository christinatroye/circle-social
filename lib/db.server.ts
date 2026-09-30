import "server-only";
import { neon } from "@neondatabase/serverless";

export function database() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  return neon(process.env.DATABASE_URL);
}

/** A fixed window: at most `limit` attempts per `windowSeconds` for one key. */
export async function withinLimit(key: string, limit: number, windowSeconds: number) {
  const sql = database();
  const [row] = await sql`
    INSERT INTO rate_limits (key, attempts, window_started) VALUES (${key}, 1, now())
    ON CONFLICT (key) DO UPDATE SET
      attempts = CASE WHEN rate_limits.window_started < now() - make_interval(secs => ${windowSeconds}) THEN 1 ELSE rate_limits.attempts + 1 END,
      window_started = CASE WHEN rate_limits.window_started < now() - make_interval(secs => ${windowSeconds}) THEN now() ELSE rate_limits.window_started END
    RETURNING attempts
  `;
  return Number(row.attempts) <= limit;
}
