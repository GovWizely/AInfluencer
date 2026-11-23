// Seeds anonymized Instagram demo data for one user on the LOCAL Supabase
// stack. Usage: pnpm seed:demo --email you@example.com
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";

import { createClient } from "@supabase/supabase-js";

import {
  findOrCreateUser,
  isLocalSupabaseUrl,
  seedDemo,
} from "./demo/seed.mjs";

const { values } = parseArgs({ options: { email: { type: "string" } } });
if (!values.email || !values.email.includes("@")) {
  console.error("Usage: pnpm seed:demo --email you@example.com");
  process.exit(1);
}

process.loadEnvFile(".env.local");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!isLocalSupabaseUrl(url)) {
  console.error(
    `Refusing to seed non-local Supabase at ${url}. Run pnpm supabase:env first.`,
  );
  process.exit(1);
}
if (!secretKey) {
  console.error(
    "SUPABASE_SECRET_KEY is missing from .env.local. Run pnpm supabase:env.",
  );
  process.exit(1);
}

const admin = createClient(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const fixture = JSON.parse(
  readFileSync(
    new URL("../supabase/fixtures/demo-instagram.json", import.meta.url),
    "utf8",
  ),
);

const { user, created } = await findOrCreateUser(admin, values.email);
const summary = await seedDemo(admin, user.id, fixture);
console.log(
  `${created ? "Created" : "Found"} ${user.email}; seeded ${summary.accounts} accounts, ${summary.posts} posts, ${summary.conversations} conversations, ${summary.messages} messages.`,
);
