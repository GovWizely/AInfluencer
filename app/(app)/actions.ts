"use server";

import { redirect } from "next/navigation";

import { LOGIN_PATH } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("signOut failed, clearing local session", {
      code: error.code,
    });
    await supabase.auth.signOut({ scope: "local" });
  }
  redirect(LOGIN_PATH);
}
