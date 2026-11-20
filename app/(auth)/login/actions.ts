"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { safeNextPath } from "@/lib/auth/routes";
import { getSiteUrl } from "@/lib/auth/site-url";
import { createClient } from "@/lib/supabase/server";

export type LoginFormState = { error: string | null };

const emailSchema = z
  .email("Enter a valid email address.")
  .transform((email) => email.trim().toLowerCase());

export async function sendMagicLink(
  _prev: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const parsed = emailSchema.safeParse(
    String(formData.get("email") ?? "").trim(),
  );
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid email." };
  }

  const email = parsed.data;
  const next = safeNextPath(String(formData.get("next") ?? ""));
  const siteUrl = await getSiteUrl();

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${siteUrl}${next}` },
  });

  if (error) {
    console.error("signInWithOtp failed", {
      status: error.status,
      code: error.code,
    });
    if (error.status === 429) {
      return {
        error: "Too many attempts. Please wait a minute and try again.",
      };
    }
    return { error: "We couldn't send your login link. Please try again." };
  }

  redirect(`/login/check-email?${new URLSearchParams({ email })}`);
}
