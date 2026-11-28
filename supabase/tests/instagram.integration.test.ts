import { createHmac } from "node:crypto";
import { afterAll, afterEach, expect, it, vi } from "vitest";

import { GET, POST } from "@/app/api/instagram/webhook/route";

import { admin, createUser, deleteUser, uniqueEmail } from "./helpers";

const users: string[] = [];
const requireUser = vi.hoisted(() => vi.fn());
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/session", () => ({ requireUser }));
vi.mock("next/navigation", () => ({
  redirect: (path: string): never => {
    throw new Error(path);
  },
}));
vi.mock("@/lib/supabase/admin", async () => ({
  createAdminClient: () => admin,
}));
afterEach(() => vi.unstubAllEnvs());
afterAll(async () => {
  await Promise.all(users.map(deleteUser));
});

it("populates a new local inbox with sample conversations for the submitted handle", async () => {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("INSTAGRAM_APP_ID", "");
  const { user, client } = await createUser(uniqueEmail("instagram-demo"));
  users.push(user.id);
  requireUser.mockResolvedValueOnce(user);
  const { connectInstagram } = await import("@/app/(app)/inbox/connect");
  const form = new FormData();
  form.set("handle", "@example.creator");
  await expect(connectInstagram(form)).rejects.toThrow("/inbox?instagram=demo");
  const accounts = await client.from("social_accounts").select("handle");
  expect(accounts.data).toEqual([{ handle: "example.creator" }]);
  const messages = await client.from("messages").select("id");
  expect(messages.data?.length).toBeGreaterThan(0);
});

it("keeps Instagram credentials server-only and prevents another creator from claiming the same account", async () => {
  const alice = await createUser(uniqueEmail("instagram-alice"));
  users.push(alice.user.id);
  const bob = await createUser(uniqueEmail("instagram-bob"));
  users.push(bob.user.id);
  const args = {
    creator_id: alice.user.id,
    instagram_id: uniqueEmail("instagram-account"),
    instagram_handle: "creator",
    instagram_name: "Creator",
    follower_count: 23,
    credential: "test-credential",
    expiration: "2030-01-01T00:00:00Z",
  };
  const created = await admin.rpc("connect_instagram", args);
  expect(created.error).toBeNull();
  expect(created.data).toBeTypeOf("string");

  const stolen = await admin.rpc("connect_instagram", {
    ...args,
    creator_id: bob.user.id,
    credential: "other",
  });
  expect(stolen.error).toBeNull();
  expect(stolen.data).toBeNull();
  expect(
    (await bob.client.rpc("connect_instagram", args)).error,
  ).not.toBeNull();
  expect(
    (await alice.client.from("instagram_credentials").select("access_token"))
      .error,
  ).not.toBeNull();
  const { data: credential } = await admin
    .from("instagram_credentials")
    .select("access_token")
    .eq("account_id", created.data)
    .single();
  expect(credential?.access_token).toBe(args.credential);

  const thread = await admin
    .from("conversations")
    .insert({
      account_id: created.data,
      external_id: "thread",
      participant_handle: "reader",
      participant_external_id: "fan",
    })
    .select("id")
    .single();
  expect(thread.error).toBeNull();
  const forged = await alice.client.from("messages").insert({
    conversation_id: thread.data?.id,
    direction: "outbound",
    sent_by: "creator",
    body: "Not actually sent",
  });
  expect(forged.error).not.toBeNull();
});

it("verifies webhook challenges and stores a signed delivery once", async () => {
  vi.stubEnv("INSTAGRAM_APP_ID", "test-app");
  vi.stubEnv("INSTAGRAM_APP_SECRET", "test-signing-secret");
  vi.stubEnv("INSTAGRAM_WEBHOOK_APP_SECRET", "");
  vi.stubEnv(
    "INSTAGRAM_REDIRECT_URI",
    "https://example.test/inbox/instagram-callback",
  );
  vi.stubEnv("INSTAGRAM_WEBHOOK_VERIFY_TOKEN", "verify");
  const webhook = "https://example.test/api/instagram/webhook";
  expect(
    await GET(
      new Request(
        `${webhook}?hub.mode=subscribe&hub.verify_token=verify&hub.challenge=123`,
      ),
    ).text(),
  ).toBe("123");
  expect(
    GET(
      new Request(
        `${webhook}?hub.mode=subscribe&hub.verify_token=bad&hub.challenge=123`,
      ),
    ).status,
  ).toBe(403);

  const { user, client } = await createUser(uniqueEmail("instagram-webhook"));
  users.push(user.id);
  const instagramId = uniqueEmail("instagram-account");
  const account = await admin.rpc("connect_instagram", {
    creator_id: user.id,
    instagram_id: instagramId,
    instagram_handle: "creator",
    instagram_name: "Creator",
    follower_count: 0,
    credential: "test-credential",
    expiration: "2030-01-01T00:00:00Z",
  });
  expect(account.error).toBeNull();
  const thread = await admin
    .from("conversations")
    .insert({
      account_id: account.data,
      external_id: "thread",
      participant_handle: "reader",
      participant_external_id: "fan",
    })
    .select("id")
    .single();
  expect(thread.error).toBeNull();
  const body = JSON.stringify({
    object: "instagram",
    entry: [
      {
        id: instagramId,
        messaging: [
          {
            sender: { id: "fan" },
            recipient: { id: instagramId },
            timestamp: Date.now(),
            message: { mid: "test-message", text: "Hi!" },
          },
        ],
      },
    ],
  });
  const signature = `sha256=${createHmac("sha256", "test-signing-secret").update(body).digest("hex")}`;
  const deliver = (value: string) =>
    POST(
      new Request(webhook, {
        method: "POST",
        body,
        headers: { "x-hub-signature-256": value },
      }),
    );
  expect((await deliver("invalid")).status).toBe(401);
  expect((await deliver(signature)).status).toBe(200);
  expect((await deliver(signature)).status).toBe(200);
  const messages = await client
    .from("messages")
    .select("external_id, body, direction")
    .eq("conversation_id", thread.data?.id);
  expect(messages.data).toEqual([
    { external_id: "test-message", body: "Hi!", direction: "inbound" },
  ]);
  const unsent = body.replace('"text":"Hi!"', '"is_deleted":true');
  const unsentSignature = `sha256=${createHmac("sha256", "test-signing-secret").update(unsent).digest("hex")}`;
  expect(
    (
      await POST(
        new Request(webhook, {
          method: "POST",
          body: unsent,
          headers: { "x-hub-signature-256": unsentSignature },
        }),
      )
    ).status,
  ).toBe(200);
  expect((await deliver(signature)).status).toBe(200);
  const redacted = await client
    .from("messages")
    .select("body")
    .eq("conversation_id", thread.data?.id)
    .single();
  expect(redacted.data?.body).toBe("This message was unsent on Instagram.");
  const preview = await client
    .from("conversations")
    .select("last_message_preview")
    .eq("id", thread.data?.id)
    .single();
  expect(preview.data?.last_message_preview).toBe(redacted.data?.body);
});
