import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/session";
import { instagramConfig } from "@/lib/instagram/config";
import { importMessages } from "@/lib/instagram/inbox";
import { exchangeCode, instagram } from "@/lib/instagram/meta";
import {
  connectCookie,
  connectCookieSchema,
  inboxUrl,
} from "@/lib/instagram/onboarding";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const user = await requireUser();
  const config = instagramConfig();
  const params = new URL(request.url).searchParams;
  const jar = await cookies();
  const cookie = jar.get(connectCookie);
  jar.delete(connectCookie);

  let state: unknown;
  try {
    state = JSON.parse(cookie?.value ?? "");
  } catch {
    redirect(inboxUrl("expired"));
  }
  const pending = connectCookieSchema.safeParse(state);
  if (
    !pending.success ||
    pending.data.ownerId !== user.id ||
    pending.data.state !== params.get("state")
  )
    redirect(inboxUrl("expired"));
  const { handle } = pending.data;
  if (!config) redirect(inboxUrl("unavailable", handle));

  const code = params.get("code");
  if (!code) redirect(inboxUrl("denied", handle));

  let status = "failed";
  try {
    const credential = await exchangeCode(config, code);
    const api = instagram(config, credential.token);
    const profile = await api.profile();
    if (
      !["BUSINESS", "MEDIA_CREATOR", "CREATOR"].includes(
        profile.account_type.toUpperCase(),
      )
    ) {
      status = "personal";
    } else if (profile.username.toLowerCase() !== handle) {
      status = "different";
    } else {
      const { data, error } = await createAdminClient().rpc(
        "connect_instagram",
        {
          creator_id: user.id,
          instagram_id: profile.user_id,
          instagram_handle: profile.username,
          instagram_name: profile.name || profile.username,
          follower_count: profile.followers_count ?? 0,
          credential: credential.token,
          expiration: credential.expiresAt,
        },
      );
      if (error) throw error;
      if (!data) {
        status = "taken";
      } else {
        status = "import_failed";
        await api.subscribe(profile.user_id);
        await importMessages(
          { id: data, external_id: profile.user_id },
          instagram(config, credential.token, profile.user_id),
        );
        status = "connected";
      }
    }
  } catch {
    console.error("Instagram connection did not complete", { stage: status });
  }
  redirect(inboxUrl(status, handle));
}
