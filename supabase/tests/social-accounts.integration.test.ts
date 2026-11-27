import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  admin,
  anonClient,
  createUser,
  deleteUser,
  uniqueEmail,
} from "./helpers";

const owners: string[] = [];

async function setupAccount(platform: "facebook" | "reddit") {
  const { user, client } = await createUser(uniqueEmail(platform));
  owners.push(user.id);
  const { data: account, error: accountError } = await admin
    .from("social_accounts")
    .insert({
      owner_id: user.id,
      platform,
      external_id: randomUUID(),
      handle: platform,
    })
    .select("id")
    .single();
  if (accountError) throw accountError;

  const { data: post, error: postError } = await admin
    .from("posts")
    .insert({
      account_id: account.id,
      external_id: "post-1",
      posted_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (postError) throw postError;

  const { data: comment, error: commentError } = await admin
    .from("comments")
    .insert({
      post_id: post.id,
      external_id: "comment-1",
      author: "reader",
      body: "A question",
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (commentError) throw commentError;

  const { error: credentialsError } = await admin
    .from("account_credentials")
    .insert({ account_id: account.id, access_token: "fixture-token" });
  if (credentialsError) throw credentialsError;

  return {
    client,
    accountId: account.id,
    postId: post.id,
    commentId: comment.id,
  };
}

describe("social account settings RLS", () => {
  let alice: Awaited<ReturnType<typeof setupAccount>>;
  let bob: Awaited<ReturnType<typeof setupAccount>>;

  beforeAll(async () => {
    alice = await setupAccount("facebook");
    bob = await setupAccount("reddit");
  });

  afterAll(async () => {
    await Promise.all(owners.map(deleteUser));
  });

  it("allows users to read only their own posts' comments, without write access", async () => {
    const visible = await alice.client
      .from("comments")
      .select("id, needs_reply");
    expect(visible.error).toBeNull();
    expect(visible.data).toEqual([{ id: alice.commentId, needs_reply: true }]);

    const edited = await alice.client
      .from("comments")
      .update({ needs_reply: false })
      .eq("id", alice.commentId);
    expect(edited.error?.code).toBe("42501");

    const visitor = await anonClient().from("comments").select("id");
    expect(visitor.error?.code).toBe("42501");
  });

  it("keeps even a user's own credentials inaccessible to client roles", async () => {
    for (const client of [alice.client, anonClient()]) {
      const read = await client
        .from("account_credentials")
        .select("account_id")
        .eq("account_id", alice.accountId);
      expect(read.error?.code).toBe("42501");

      const write = await client
        .from("account_credentials")
        .update({ access_token: "blocked" })
        .eq("account_id", alice.accountId);
      expect(write.error?.code).toBe("42501");
    }
  });

  it("allows only the owner to disconnect and cascades to their imported data", async () => {
    const visitor = await anonClient()
      .from("social_accounts")
      .delete()
      .eq("id", alice.accountId);
    expect(visitor.error?.code).toBe("42501");

    const other = await alice.client
      .from("social_accounts")
      .delete()
      .eq("id", bob.accountId)
      .select("id");
    expect(other.error).toBeNull();
    expect(other.data).toEqual([]);

    const own = await alice.client
      .from("social_accounts")
      .delete()
      .eq("id", alice.accountId)
      .select("id");
    expect(own.error).toBeNull();
    expect(own.data).toEqual([{ id: alice.accountId }]);

    const removed = await Promise.all([
      admin.from("posts").select("id").eq("id", alice.postId),
      admin.from("comments").select("id").eq("id", alice.commentId),
      admin
        .from("account_credentials")
        .select("account_id")
        .eq("account_id", alice.accountId),
    ]);
    for (const result of removed) {
      expect(result.error).toBeNull();
      expect(result.data).toEqual([]);
    }

    const remaining = await bob.client
      .from("social_accounts")
      .select("id")
      .eq("id", bob.accountId)
      .single();
    expect(remaining.error).toBeNull();
    expect(remaining.data).toEqual({ id: bob.accountId });
  });
});
