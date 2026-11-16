import { afterAll, describe, expect, it } from "vitest";

import { admin, anonClient, mailpitUrl, uniqueEmail } from "./helpers";

const siteUrl = "http://127.0.0.1:3000";
const created: string[] = [];

afterAll(async () => {
  await Promise.all(created.map((id) => admin.auth.admin.deleteUser(id)));
});

type MailpitMessage = { ID: string; To: { Address: string }[] };

async function findLoginLink(email: string): Promise<URL> {
  for (let attempt = 0; attempt < 40; attempt++) {
    const search = await fetch(
      `${mailpitUrl}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
    ).then((res) => res.json() as Promise<{ messages: MailpitMessage[] }>);

    const message = search.messages?.[0];
    if (message) {
      const body = await fetch(
        `${mailpitUrl}/api/v1/message/${message.ID}`,
      ).then((res) => res.json() as Promise<{ HTML: string }>);
      const href = body.HTML.match(/href="([^"]+)"/)?.[1];
      if (!href) throw new Error("Login email has no link");
      return new URL(href.replaceAll("&amp;", "&"));
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`No email for ${email} in Mailpit`);
}

describe("magic link email", () => {
  it.each(["new", "returning"])(
    "sends a %s user a token_hash link to /auth/confirm",
    async (kind) => {
      const email = uniqueEmail(`magic-${kind}`);
      if (kind === "returning") {
        const { data } = await admin.auth.admin.createUser({
          email,
          email_confirm: true,
        });
        created.push(data.user!.id);
      }

      const client = anonClient();
      const { error } = await client.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${siteUrl}/settings` },
      });
      expect(error).toBeNull();

      const link = await findLoginLink(email);
      expect(link.origin).toBe(siteUrl);
      expect(link.pathname).toBe("/auth/confirm");
      expect(link.searchParams.get("type")).toBe("email");
      expect(link.searchParams.get("next")).toBe(`${siteUrl}/settings`);

      const tokenHash = link.searchParams.get("token_hash");
      expect(tokenHash).toBeTruthy();

      const verified = await client.auth.verifyOtp({
        type: "email",
        token_hash: tokenHash!,
      });
      expect(verified.error).toBeNull();
      expect(verified.data.user?.email).toBe(email);
      if (kind === "new") created.push(verified.data.user!.id);

      const reused = await anonClient().auth.verifyOtp({
        type: "email",
        token_hash: tokenHash!,
      });
      expect(reused.error).not.toBeNull();
    },
  );
});
