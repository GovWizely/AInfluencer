import { readFileSync } from "node:fs";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { getConversation } from "@/lib/inbox/queries";
import { findOrCreateUser, seedDemo } from "@/scripts/demo/seed.mjs";

import {
  admin,
  anonClient,
  createUser,
  deleteUser,
  uniqueEmail,
} from "./helpers";

const created: string[] = [];
const createClient = vi.hoisted(() => vi.fn());
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient }));

afterAll(async () => {
  await Promise.all(created.map(deleteUser));
});

async function setupUser(label: string) {
  const result = await createUser(uniqueEmail(label));
  created.push(result.user.id);
  return result;
}

const smallFixture = {
  accounts: [
    {
      key: "creator-1",
      handle: "test.creator",
      display_name: "Test Creator",
      bio: "bio",
      followers: 10,
      posts: [
        {
          key: "post-1",
          caption: "hello",
          days_ago: 1,
          like_count: 1,
          comment_count: 0,
        },
      ],
      conversations: [
        {
          key: "thread-1",
          participant_handle: "fan.one",
          participant_name: "Fan One",
          read: false,
          messages: [
            { key: "m1", direction: "inbound", body: "first", minutes_ago: 30 },
            {
              key: "m2",
              direction: "inbound",
              body: "latest",
              minutes_ago: 10,
            },
          ],
        },
      ],
    },
  ],
};

async function conversationFor(ownerId: string) {
  const { data, error } = await admin
    .from("conversations")
    .select(
      "id, last_message_preview, last_inbound_at, read_at, account:social_accounts!inner(owner_id)",
    )
    .eq("account.owner_id", ownerId)
    .single();
  if (error) throw error;
  return data;
}

it("loads the latest 100 messages and displays them oldest to newest", async () => {
  const { user, client } = await setupUser("inbox-long-thread");
  await seedDemo(admin, user.id, smallFixture);
  const thread = await conversationFor(user.id);
  const { error } = await admin.from("messages").insert(
    Array.from({ length: 102 }, (_, n) => ({
      conversation_id: thread.id,
      external_id: `new-${n}`,
      direction: "inbound",
      sent_by: "fan",
      body: `message ${n}`,
      sent_at: new Date(Date.now() + n * 1000).toISOString(),
    })),
  );
  expect(error).toBeNull();
  createClient.mockResolvedValueOnce(client);
  const conversation = await getConversation(thread.id);
  expect(conversation?.messages.map(({ body }) => body)).toEqual(
    Array.from({ length: 100 }, (_, n) => `message ${n + 2}`),
  );
});

describe("inbox RLS", () => {
  let alice: Awaited<ReturnType<typeof setupUser>>;
  let bob: Awaited<ReturnType<typeof setupUser>>;
  let aliceConversation: string;
  let bobConversation: string;

  beforeAll(async () => {
    alice = await setupUser("inbox-alice");
    bob = await setupUser("inbox-bob");
    await seedDemo(admin, alice.user.id, smallFixture);
    await seedDemo(admin, bob.user.id, smallFixture);
    aliceConversation = (await conversationFor(alice.user.id)).id;
    bobConversation = (await conversationFor(bob.user.id)).id;
  });

  it("keeps the conversation summary in sync with messages", async () => {
    const conversation = await conversationFor(alice.user.id);
    expect(conversation.last_message_preview).toBe("latest");
    expect(conversation.last_inbound_at).not.toBeNull();
    expect(conversation.read_at).toBeNull();
  });

  it("only shows a user their own accounts, posts, conversations and messages", async () => {
    for (const table of [
      "social_accounts",
      "posts",
      "conversations",
    ] as const) {
      const { data, error } = await alice.client.from(table).select("id");
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    }
    const { data: messages } = await alice.client
      .from("messages")
      .select("conversation_id");
    expect(messages).toHaveLength(2);
    expect(
      messages?.every((m) => m.conversation_id === aliceConversation),
    ).toBe(true);

    const { data: other } = await alice.client
      .from("messages")
      .select("id")
      .eq("conversation_id", bobConversation);
    expect(other).toEqual([]);
  });

  it("lets a user reply in their own conversation", async () => {
    const { error } = await alice.client.from("messages").insert({
      conversation_id: aliceConversation,
      direction: "outbound",
      sent_by: "creator",
      body: "thanks!",
    });
    expect(error).toBeNull();

    const conversation = await conversationFor(alice.user.id);
    expect(conversation.last_message_preview).toBe("thanks!");
    expect(conversation.read_at).not.toBeNull();
  });

  it("rejects replies in another user's conversation", async () => {
    const { error } = await alice.client.from("messages").insert({
      conversation_id: bobConversation,
      direction: "outbound",
      sent_by: "creator",
      body: "sneaky",
    });
    expect(error?.code).toBe("42501");
  });

  it("rejects inbound messages from users", async () => {
    const { error } = await alice.client.from("messages").insert({
      conversation_id: aliceConversation,
      direction: "inbound",
      sent_by: "fan",
      body: "fake fan message",
    });
    expect(error?.code).toBe("42501");
  });

  it("rejects backdated replies", async () => {
    const { error } = await alice.client.from("messages").insert({
      conversation_id: aliceConversation,
      direction: "outbound",
      sent_by: "creator",
      body: "from the past",
      sent_at: "2000-01-01T00:00:00Z",
    });
    expect(error?.code).toBe("42501");
  });

  it("lets a user mark only their own conversations read", async () => {
    const readAt = new Date().toISOString();
    const own = await alice.client
      .from("conversations")
      .update({ read_at: readAt })
      .eq("id", aliceConversation)
      .select("id");
    expect(own.error).toBeNull();
    expect(own.data).toHaveLength(1);

    const other = await alice.client
      .from("conversations")
      .update({ read_at: readAt })
      .eq("id", bobConversation)
      .select("id");
    expect(other.data).toEqual([]);
    expect((await conversationFor(bob.user.id)).read_at).toBeNull();
  });

  it("does not let users edit or delete conversation data", async () => {
    const rename = await alice.client
      .from("conversations")
      .update({ participant_name: "changed" })
      .eq("id", aliceConversation);
    expect(rename.error?.code).toBe("42501");

    const accountUpdate = await alice.client
      .from("social_accounts")
      .update({ followers: 1_000_000 })
      .eq("owner_id", alice.user.id);
    expect(accountUpdate.error?.code).toBe("42501");

    const remove = await alice.client
      .from("messages")
      .delete()
      .eq("conversation_id", aliceConversation);
    expect(remove.error?.code).toBe("42501");

    const accountInsert = await alice.client.from("social_accounts").insert({
      owner_id: alice.user.id,
      platform: "instagram",
      external_id: "x",
      handle: "x",
    });
    expect(accountInsert.error?.code).toBe("42501");
  });

  it("hides everything from signed-out visitors", async () => {
    for (const table of [
      "social_accounts",
      "posts",
      "conversations",
      "messages",
    ] as const) {
      const { data, error } = await anonClient().from(table).select("id");
      expect(data ?? []).toEqual([]);
      if (error) expect(error.code).toBe("42501");
    }
  });
});

describe("seedDemo", () => {
  const fixture = JSON.parse(
    readFileSync("supabase/fixtures/demo-instagram.json", "utf8"),
  );

  it("is idempotent and keeps user replies", async () => {
    const { user, created: isNew } = await findOrCreateUser(
      admin,
      uniqueEmail("seed"),
    );
    created.push(user.id);
    expect(isNew).toBe(true);

    const first = await seedDemo(admin, user.id, fixture);
    const counts = async () => {
      const result: Record<string, number> = {};
      const { data: accounts } = await admin
        .from("social_accounts")
        .select("id")
        .eq("owner_id", user.id);
      const ids = (accounts ?? []).map((a) => a.id);
      result.accounts = ids.length;
      for (const table of ["posts", "conversations"] as const) {
        const { count } = await admin
          .from(table)
          .select("id", { count: "exact", head: true })
          .in("account_id", ids);
        result[table] = count ?? 0;
      }
      const { count } = await admin
        .from("messages")
        .select("id, conversation:conversations!inner(account_id)", {
          count: "exact",
          head: true,
        })
        .in("conversation.account_id", ids);
      result.messages = count ?? 0;
      return result;
    };

    expect(await counts()).toEqual(first);

    const { data: thread } = await admin
      .from("conversations")
      .select("id, account:social_accounts!inner(owner_id)")
      .eq("account.owner_id", user.id)
      .limit(1)
      .single();
    await admin.from("messages").insert({
      conversation_id: thread!.id,
      direction: "outbound",
      sent_by: "creator",
      body: "manual reply",
    });

    await seedDemo(admin, user.id, fixture);
    expect(await counts()).toEqual({ ...first, messages: first.messages + 1 });

    const again = await findOrCreateUser(admin, user.email!.toUpperCase());
    expect(again).toMatchObject({ created: false, user: { id: user.id } });
  });
});
