// Writes .env.local pointing at the local Supabase stack (`supabase start`).
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const status = JSON.parse(
  execFileSync("supabase", ["status", "-o", "json"], { encoding: "utf8" }),
);

const lines = [
  `NEXT_PUBLIC_SUPABASE_URL=${status.API_URL}`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${status.PUBLISHABLE_KEY}`,
  `SUPABASE_SECRET_KEY=${status.SECRET_KEY}`,
  `MAILPIT_URL=${status.MAILPIT_URL}`,
];

writeFileSync(".env.local", `${lines.join("\n")}\n`);
console.log("Wrote .env.local for local Supabase");
