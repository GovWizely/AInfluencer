"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { LOGIN_PATH } from "@/lib/auth/routes";
import { getCurrentUser } from "@/lib/auth/session";
import { replySchema } from "@/lib/inbox/schemas";
import { createClient } from "@/lib/supabase/server";

export type ReplyFormState = {
  error: string | null;
  body?: string;
  sentAt?: number;
};

export async function sendReply(
  conversationId: string,
  _prev: ReplyFormState,
  formData: FormData,
): Promise<ReplyFormState> {
  const body = String(formData.get("body") ?? "");
  const parsed = replySchema.safeParse({ conversationId, body });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid reply.", body };
  }

  if (!(await getCurrentUser())) redirect(LOGIN_PATH);

  // Stored only; nothing is sent to Instagram yet (GOV-20).
  const supabase = await createClient();
  const { error } = await supabase.from("messages").insert({
    conversation_id: parsed.data.conversationId,
    direction: "outbound",
    sent_by: "creator",
    body: parsed.data.body,
  });
  if (error) {
    console.error("sendReply failed", { code: error.code });
    return { error: "We couldn't save your reply. Please try again.", body };
  }

  refresh();
  return { error: null, sentAt: Date.now() };
}

export async function markConversationRead(conversationId: string) {
  if (!z.uuid().safeParse(conversationId).success) return;
  if (!(await getCurrentUser())) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("conversations")
    .update({ read_at: new Date().toISOString() })
    .eq("id", conversationId);
  if (error) console.error("markConversationRead failed", { code: error.code });
}
