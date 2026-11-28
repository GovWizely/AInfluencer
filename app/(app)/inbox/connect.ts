"use server";

import { randomUUID } from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/session";
import { publicEnv } from "@/lib/env";
import { instagramConfig } from "@/lib/instagram/config";
import { authorizationUrl } from "@/lib/instagram/meta";
import {
  connectCookie,
  handleSchema,
  inboxUrl,
} from "@/lib/instagram/onboarding";
import { seedSampleInbox } from "@/lib/instagram/sample-inbox";
import { createAdminClient } from "@/lib/supabase/admin";
import { isLocalSupabaseUrl } from "@/scripts/demo/seed.mjs";

export async function connectInstagram(form: FormData) {
  const user = await requireUser();
  const handle = handleSchema.safeParse(form.get("handle"));
  if (!handle.success) redirect(inboxUrl("invalid"));

  const config = instagramConfig();
  if (!config) {
    if (
      process.env.NODE_ENV === "development" &&
      process.env.SUPABASE_SECRET_KEY &&
      isLocalSupabaseUrl(publicEnv.NEXT_PUBLIC_SUPABASE_URL)
    ) {
      try {
        await seedSampleInbox(createAdminClient(), user.id, handle.data);
      } catch {
        redirect(inboxUrl("failed", handle.data));
      }
      redirect(inboxUrl("demo"));
    }
    redirect(inboxUrl("unavailable", handle.data));
  }

  const state = randomUUID();
  (await cookies()).set(
    connectCookie,
    JSON.stringify({ state, ownerId: user.id, handle: handle.data }),
    {
      httpOnly: true,
      secure: config.redirectUri.startsWith("https:"),
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    },
  );
  redirect(
    authorizationUrl(config, state, form.get("forceReauth") === "true").href,
  );
}
