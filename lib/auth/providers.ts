import "server-only";

import { cacheLife } from "next/cache";

import { publicEnv } from "@/lib/env";

type AuthSettings = { external?: Record<string, boolean> };

export async function isGoogleLoginEnabled(): Promise<boolean> {
  "use cache";
  cacheLife("minutes");

  try {
    const res = await fetch(
      `${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`,
      { headers: { apikey: publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY } },
    );
    if (!res.ok) return false;
    const settings = (await res.json()) as AuthSettings;
    return settings.external?.google === true;
  } catch {
    return false;
  }
}
