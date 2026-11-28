import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { TablesInsert } from "@/lib/supabase/database.types";

import type { Instagram } from "./meta";

type Account = { id: string; external_id: string };
type Participant = { id: string; username?: string };
type Message = Omit<TablesInsert<"messages">, "conversation_id">;

export function messageBody(text: string | null | undefined) {
  return Array.from(text?.trim() || "View this message on Instagram.")
    .slice(0, 2000)
    .join("");
}

async function threadId(
  accountId: string,
  externalId: string,
  participant: Participant,
) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("conversations")
    .upsert(
      {
        account_id: accountId,
        external_id: externalId,
        participant_external_id: participant.id,
        participant_handle: participant.username || "Instagram user",
      },
      { onConflict: "account_id,external_id", ignoreDuplicates: true },
    )
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (data) return data.id;
  const existing = admin
    .from("conversations")
    .select("id")
    .eq("account_id", accountId)
    .eq("external_id", externalId);
  const result = await existing.single();
  if (result.error) throw result.error;
  if (participant.username) {
    const { error } = await admin
      .from("conversations")
      .update({ participant_handle: participant.username })
      .eq("id", result.data.id);
    if (error) throw error;
  }
  return result.data.id;
}

export async function storeMessages(
  conversationId: string,
  messages: Message[],
) {
  if (!messages.length) return;
  const { error } = await createAdminClient()
    .from("messages")
    .upsert(
      messages.map((message) => ({
        ...message,
        conversation_id: conversationId,
      })),
      { onConflict: "conversation_id,external_id", ignoreDuplicates: true },
    );
  if (error) throw error;
}

export async function importMessages(account: Account, api: Instagram) {
  for await (const thread of api.conversations()) {
    const messages = await api.messages(thread.id);
    const participant = messages
      .flatMap((message) => [message.from, ...message.to.data])
      .find((person) => person.id !== account.external_id);
    if (!participant) continue;
    const id = await threadId(account.id, thread.id, participant);
    await storeMessages(
      id,
      messages.map((message) => {
        const inbound = message.from.id === participant.id;
        return {
          external_id: message.id,
          direction: inbound ? "inbound" : "outbound",
          sent_by: inbound ? "fan" : "creator",
          body: messageBody(message.message),
          sent_at: new Date(message.created_time).toISOString(),
        };
      }),
    );
  }
}

export async function storeIncomingMessage(
  account: Account,
  api: Instagram,
  sender: string,
  message: Message,
) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("conversations")
    .select("id")
    .eq("account_id", account.id)
    .eq("participant_external_id", sender)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (data) {
    await storeMessages(data.id, [message]);
    return;
  }
  for await (const thread of api.conversations(sender)) {
    const participant = await api
      .participant(sender)
      .catch(() => ({ id: sender }));
    const id = await threadId(account.id, thread.id, participant);
    await storeMessages(id, [message]);
    return;
  }
  throw new Error("Instagram conversation is not available yet");
}

export async function redactUnsentMessage(
  accountId: string,
  participantId: string,
  messageId: string,
) {
  const admin = createAdminClient();
  const threads = await admin
    .from("conversations")
    .select("id")
    .eq("account_id", accountId)
    .eq("participant_external_id", participantId);
  if (threads.error) throw threads.error;
  if (!threads.data.length) return;
  const { error } = await admin
    .from("messages")
    .update({ body: "This message was unsent on Instagram." })
    .in(
      "conversation_id",
      threads.data.map(({ id }) => id),
    )
    .eq("external_id", messageId);
  if (error) throw error;
}
