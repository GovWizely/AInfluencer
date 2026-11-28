"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { LOGIN_PATH } from "@/lib/auth/routes";
import { getCurrentUser } from "@/lib/auth/session";
import { replySchema } from "@/lib/inbox/schemas";
import { instagramConfig } from "@/lib/instagram/config";
import { storeMessages } from "@/lib/instagram/inbox";
import { instagram } from "@/lib/instagram/meta";
import {
  closedWindowMessage,
  isDemoAccount,
  replyWindowOpen,
} from "@/lib/instagram/replies";
import { createAdminClient } from "@/lib/supabase/admin";
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

  const supabase = await createClient();
  const { data: conversation } = await supabase
    .from("conversations")
    .select(
      "id, participant_external_id, last_inbound_at, account:social_accounts!inner(id, external_id)",
    )
    .eq("id", parsed.data.conversationId)
    .maybeSingle();
  if (!conversation)
    return { error: "We couldn't find this conversation.", body };

  if (!isDemoAccount(conversation.account.external_id)) {
    if (!replyWindowOpen(conversation.last_inbound_at))
      return { error: closedWindowMessage, body };
    const config = instagramConfig();
    if (!config || !conversation.participant_external_id) {
      return {
        error:
          "Replies aren't available here right now. Try replying on Instagram.",
        body,
      };
    }
    let sent;
    try {
      const { data, error } = await createAdminClient()
        .from("instagram_credentials")
        .select("access_token, expires_at")
        .eq("account_id", conversation.account.id)
        .maybeSingle();
      if (error) throw error;
      if (!data || Date.parse(data.expires_at) <= Date.now()) {
        return {
          error: "Connect your Instagram again from the inbox to send a reply.",
          body,
        };
      }
      sent = await instagram(config, data.access_token).send(
        conversation.account.external_id,
        conversation.participant_external_id,
        parsed.data.body,
      );
    } catch {
      return {
        error:
          "We couldn't send your reply. Check the conversation on Instagram before trying again.",
        body,
      };
    }
    try {
      await storeMessages(conversation.id, [
        {
          external_id: sent.message_id,
          direction: "outbound",
          sent_by: "creator",
          body: parsed.data.body,
          sent_at: new Date().toISOString(),
        },
      ]);
    } catch {
      return {
        error: "Your reply was sent to Instagram but isn't visible here yet.",
      };
    }
    refresh();
    return { error: null, sentAt: Date.now() };
  }

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
