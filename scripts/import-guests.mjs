// Imports a Luma guest export into circle-social.
//   npm run import -- circles/alien.json guests.csv
// The CSV needs name (or first_name and last_name) and email. Optional columns:
// introduction (Christina's draft), been_before (yes/no), role (guest/speaker).
// If Luma's approval_status column is present, only approved guests are imported.
// Re-running is safe: existing guests keep their link, and an introduction a guest
// has already confirmed is never overwritten. Nobody is removed.
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

const CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const SITE_URL = (process.env.SITE_URL ?? "https://in.entercircle.co").replace(/\/$/, "");

function newToken(firstName) {
  const slug = firstName.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "guest";
  const code = Array.from(randomBytes(8), byte => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");
  return `${slug.slice(0, 30)}-${code}`;
}

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += char;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [header, ...body] = rows.filter(cells => cells.some(cell => cell.trim()));
  const keys = header.map(key => key.trim().toLowerCase().replace(/\s+/g, "_"));
  return body.map(cells => Object.fromEntries(keys.map((key, index) => [key, (cells[index] ?? "").trim()])));
}

const yes = value => /^(y|yes|true|1)$/i.test(value ?? "");

const [circlePath, csvPath] = process.argv.slice(2);
if (!circlePath || !csvPath) {
  console.error("Usage: npm run import -- circles/alien.json guests.csv");
  process.exit(1);
}
nextEnv.loadEnvConfig(process.cwd());
if (!process.env.DATABASE_URL) {
  console.error("Add DATABASE_URL to .env.local first.");
  process.exit(1);
}

const circle = JSON.parse(await readFile(circlePath, "utf8"));
const people = parseCsv(await readFile(csvPath, "utf8"))
  .filter(person => !person.approval_status || person.approval_status.toLowerCase() === "approved")
  .map(person => {
    const name = person.name || [person.first_name, person.last_name].filter(Boolean).join(" ");
    return {
      name, first: person.first_name || name.split(/\s+/)[0], email: (person.email || "").toLowerCase(),
      introduction: (person.introduction || "").slice(0, 320), beenBefore: yes(person.been_before),
      role: person.role === "speaker" ? "speaker" : "guest",
    };
  })
  .filter(person => person.name && person.email);
if (circle.speaker_email) {
  people.unshift({
    name: circle.speaker, first: circle.speaker.split(/\s+/)[0], email: circle.speaker_email.toLowerCase(),
    introduction: circle.speaker_line.slice(0, 320), beenBefore: false, role: "speaker",
  });
}

const sql = neon(process.env.DATABASE_URL);
const [saved] = await sql`
  INSERT INTO circles (slug, title, speaker, speaker_line, question, starts_at, reveal_at, room_url)
  VALUES (${circle.slug}, ${circle.title}, ${circle.speaker}, ${circle.speaker_line ?? ""}, ${circle.question ?? ""},
    ${circle.starts_at}, ${circle.reveal_at}, ${circle.room_url || null})
  ON CONFLICT (slug) DO UPDATE SET title = excluded.title, speaker = excluded.speaker, speaker_line = excluded.speaker_line,
    question = excluded.question, starts_at = excluded.starts_at, reveal_at = excluded.reveal_at, room_url = excluded.room_url
  RETURNING id
`;

for (const person of people) {
  const [row] = await sql`
    INSERT INTO guests (circle_id, role, name, first_name, email, introduction, been_before, token)
    VALUES (${saved.id}, ${person.role}, ${person.name}, ${person.first}, ${person.email}, ${person.introduction}, ${person.beenBefore}, ${newToken(person.first)})
    ON CONFLICT (circle_id, email) DO UPDATE SET
      role = excluded.role, name = excluded.name, first_name = excluded.first_name,
      introduction = CASE WHEN guests.introduction_confirmed_at IS NULL AND excluded.introduction <> '' THEN excluded.introduction ELSE guests.introduction END,
      been_before = CASE WHEN guests.introduction_confirmed_at IS NULL THEN excluded.been_before ELSE guests.been_before END
    RETURNING name, email, token, introduction
  `;
  console.log(`${row.name}\t${row.email}\t${SITE_URL}/${row.token}${row.introduction ? "" : "\t(no introduction yet)"}`);
}
console.log(`\n${people.length} people in ${circle.title}.`);
