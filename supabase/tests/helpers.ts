import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Run \`pnpm supabase:start && pnpm supabase:env\` first.`,
    );
  }
  return value;
}

export const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
export const publishableKey = requireEnv(
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
);
export const mailpitUrl = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(supabaseUrl)) {
  throw new Error("Integration tests must run against a local Supabase stack.");
}

const noPersist = { auth: { persistSession: false, autoRefreshToken: false } };

export const admin = createClient(
  supabaseUrl,
  requireEnv("SUPABASE_SECRET_KEY"),
  noPersist,
);

export function anonClient(): SupabaseClient {
  return createClient(supabaseUrl, publishableKey, noPersist);
}

export function uniqueEmail(label: string) {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

export async function createUser(
  email: string,
  metadata: Record<string, string> = {},
) {
  const password = `pw-${Math.random().toString(36).slice(2)}-A1!`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  });
  if (error) throw error;

  const client = anonClient();
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;

  return { user: data.user, client };
}

export async function deleteUser(id: string) {
  await admin.auth.admin.deleteUser(id);
}
