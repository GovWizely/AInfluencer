import { instagramConfig } from "@/lib/instagram/config";
import {
  messageBody,
  redactUnsentMessage,
  storeIncomingMessage,
} from "@/lib/instagram/inbox";
import { instagram } from "@/lib/instagram/meta";
import { parseEvents, validSignature } from "@/lib/instagram/webhook";
import { createAdminClient } from "@/lib/supabase/admin";

const maxBodyBytes = 1024 * 1024;

async function readBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) return Buffer.concat(chunks, size);
      size += value.byteLength;
      if (size > maxBodyBytes) {
        void reader.cancel().catch(() => {});
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
}

export function GET(request: Request) {
  const config = instagramConfig();
  if (!config) return new Response(null, { status: 503 });
  const params = new URL(request.url).searchParams;
  const challenge = params.get("hub.challenge");
  if (
    params.get("hub.mode") !== "subscribe" ||
    params.get("hub.verify_token") !== config.verifyToken ||
    challenge === null
  ) {
    return new Response(null, { status: 403 });
  }
  return new Response(challenge);
}

export async function POST(request: Request) {
  const config = instagramConfig();
  if (!config) return new Response(null, { status: 503 });
  const signature = request.headers.get("x-hub-signature-256");
  if (!signature) return new Response(null, { status: 401 });
  if (Number(request.headers.get("content-length")) > maxBodyBytes)
    return new Response(null, { status: 413 });
  let bytes: Buffer | null;
  try {
    bytes = await readBody(request);
  } catch {
    return new Response(null, { status: 400 });
  }
  if (!bytes) return new Response(null, { status: 413 });
  if (!validSignature(config.webhookSecret, bytes, signature))
    return new Response(null, { status: 401 });
  let payload: unknown;
  try {
    payload = JSON.parse(bytes.toString("utf8"));
  } catch {
    return new Response(null, { status: 400 });
  }
  try {
    const admin = createAdminClient();
    for (const event of parseEvents(payload)) {
      const result = await admin
        .from("social_accounts")
        .select(
          "id, external_id, instagram_credentials!inner(access_token, expires_at)",
        )
        .eq("platform", "instagram")
        .eq("external_id", event.accountId)
        .maybeSingle();
      if (result.error) throw result.error;
      const account = result.data;
      const credential = account?.instagram_credentials;
      if (!account || !credential) continue;
      if (event.deleted) {
        await redactUnsentMessage(
          account.id,
          event.participantId,
          event.messageId,
        );
        continue;
      }
      await storeIncomingMessage(
        account,
        instagram(config, credential.access_token, account.external_id),
        event.participantId,
        {
          external_id: event.messageId,
          body: messageBody(event.text),
          direction: event.outbound ? "outbound" : "inbound",
          sent_by: event.outbound ? "creator" : "fan",
          sent_at: event.sentAt,
        },
      );
    }
  } catch {
    console.error("Instagram message could not be stored");
    return new Response(null, { status: 503 });
  }
  return new Response(null, { status: 200 });
}
