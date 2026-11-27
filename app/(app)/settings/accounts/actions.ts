"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function disconnectAccount(
  accountId: string,
): Promise<{ error: string | null }> {
  const user = await requireUser();
  if (!z.uuid().safeParse(accountId).success) {
    return { error: "Invalid account." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("social_accounts")
    .delete()
    .eq("id", accountId)
    .eq("owner_id", user.id);
  if (error) {
    console.error("disconnectAccount failed", { code: error.code });
    return { error: "Couldn't disconnect the account. Please try again." };
  }

  refresh();
  return { error: null };
}
