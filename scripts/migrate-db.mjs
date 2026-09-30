import { readFile } from "node:fs/promises";
import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

nextEnv.loadEnvConfig(process.cwd());
if (!process.env.DATABASE_URL) {
  if (process.argv.includes("--if-configured")) {
    console.log("DATABASE_URL is not set; skipping the database setup.");
  } else {
    console.error("Add DATABASE_URL to .env.local or the deployment environment first.");
    process.exitCode = 1;
  }
} else {
  try {
    const sql = neon(process.env.DATABASE_URL);
    for (const file of ["001-guests.sql"]) {
      const schema = await readFile(new URL(`../db/${file}`, import.meta.url), "utf8");
      for (const statement of schema.split(";").filter(value => value.trim())) await sql.query(statement);
    }
    console.log("Circle guest tables are ready.");
  } catch (error) {
    console.error("Could not prepare the guest tables. Check DATABASE_URL and database access.", error);
    process.exitCode = 1;
  }
}
