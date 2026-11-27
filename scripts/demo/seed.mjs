// Loads the demo fixture under one user. Uses deterministic external IDs so
// re-running updates rows in place instead of duplicating them.

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

function must({ data, error }, what) {
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
}

export async function seedDemo(admin, ownerId, fixture, now = Date.now()) {
  const summary = { accounts: 0, posts: 0, conversations: 0, messages: 0 };

  for (const account of fixture.accounts) {
    const [row] = must(
      await admin
        .from("social_accounts")
        .upsert(
          {
            owner_id: ownerId,
            platform: "instagram",
            external_id: `demo:${ownerId}:${account.key}`,
            handle: account.handle,
            display_name: account.display_name,
            bio: account.bio,
            followers: account.followers,
          },
          { onConflict: "platform,external_id" },
        )
        .select("id"),
      `account ${account.handle}`,
    );
    summary.accounts++;

    if (account.posts.length > 0) {
      must(
        await admin.from("posts").upsert(
          account.posts.map((post) => ({
            account_id: row.id,
            external_id: post.key,
            caption: post.caption,
            posted_at: new Date(now - post.days_ago * DAY).toISOString(),
            like_count: post.like_count,
            comment_count: post.comment_count,
          })),
          { onConflict: "account_id,external_id" },
        ),
        `posts for ${account.handle}`,
      );
      summary.posts += account.posts.length;
    }

    for (const conversation of account.conversations) {
      const latest = Math.min(
        ...conversation.messages.map((m) => m.minutes_ago),
      );
      const [thread] = must(
        await admin
          .from("conversations")
          .upsert(
            {
              account_id: row.id,
              external_id: conversation.key,
              participant_handle: conversation.participant_handle,
              participant_name: conversation.participant_name,
              read_at: conversation.read
                ? new Date(now - latest * MINUTE).toISOString()
                : null,
            },
            { onConflict: "account_id,external_id" },
          )
          .select("id"),
        `conversation ${conversation.key}`,
      );
      summary.conversations++;

      must(
        await admin.from("messages").upsert(
          conversation.messages.map((message) => ({
            conversation_id: thread.id,
            external_id: message.key,
            direction: message.direction,
            sent_by: message.direction === "inbound" ? "fan" : "creator",
            body: message.body,
            sent_at: new Date(now - message.minutes_ago * MINUTE).toISOString(),
          })),
          { onConflict: "conversation_id,external_id" },
        ),
        `messages for ${conversation.key}`,
      );
      summary.messages += conversation.messages.length;
    }
  }

  return summary;
}

export async function findOrCreateUser(admin, email) {
  const normalized = email.trim().toLowerCase();
  for (let page = 1; ; page++) {
    const { users } = must(
      await admin.auth.admin.listUsers({ page, perPage: 1000 }),
      "list users",
    );
    const match = users.find(
      (user) => user.email?.toLowerCase() === normalized,
    );
    if (match) return { user: match, created: false };
    if (users.length < 1000) break;
  }
  const { user } = must(
    await admin.auth.admin.createUser({
      email: normalized,
      email_confirm: true,
    }),
    "create user",
  );
  return { user, created: true };
}

export function isLocalSupabaseUrl(url) {
  return /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/.test(
    String(url ?? ""),
  );
}
