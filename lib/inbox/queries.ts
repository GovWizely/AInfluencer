import "server-only";

import { createClient } from "@/lib/supabase/server";

// All reads go through the signed-in user's client, so RLS limits results
// to accounts they own.

export async function listAccounts() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("social_accounts")
    .select("id, handle, display_name, followers")
    .order("followers", { ascending: false });
  if (error) throw new Error(`Failed to load accounts: ${error.message}`);
  return data;
}

export async function listConversations(accountId?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("conversations")
    .select(
      "id, participant_handle, participant_name, last_message_at, last_inbound_at, last_message_preview, read_at, account:social_accounts!inner(id, handle)",
    )
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(200);
  if (accountId) query = query.eq("account_id", accountId);
  const { data, error } = await query;
  if (error) throw new Error(`Failed to load conversations: ${error.message}`);
  return data;
}

export async function getConversation(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .select(
      "id, participant_handle, participant_name, last_inbound_at, read_at, account:social_accounts!inner(id, handle, display_name), messages(id, direction, sent_by, body, sent_at)",
    )
    .eq("id", id)
    .order("sent_at", { referencedTable: "messages", ascending: true })
    .maybeSingle();
  if (error) throw new Error(`Failed to load conversation: ${error.message}`);
  return data;
}
