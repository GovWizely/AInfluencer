import { afterAll, describe, expect, it } from "vitest";

import {
  admin,
  anonClient,
  createUser,
  deleteUser,
  uniqueEmail,
} from "./helpers";

const created: string[] = [];

afterAll(async () => {
  await Promise.all(created.map(deleteUser));
});

async function setupUser(label: string, metadata?: Record<string, string>) {
  const result = await createUser(uniqueEmail(label), metadata);
  created.push(result.user.id);
  return result;
}

describe("profiles", () => {
  it("creates a profile when a user signs up", async () => {
    const { user } = await setupUser("trigger", {
      full_name: "Ada Lovelace",
      avatar_url: "https://example.com/ada.png",
    });

    const { data, error } = await admin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    expect(error).toBeNull();
    expect(data).toMatchObject({
      id: user.id,
      email: user.email,
      display_name: "Ada Lovelace",
      avatar_url: "https://example.com/ada.png",
    });
  });

  it("deletes the profile when the user is deleted", async () => {
    const { user } = await createUser(uniqueEmail("cascade"));
    await deleteUser(user.id);

    const { data } = await admin
      .from("profiles")
      .select("id")
      .eq("id", user.id);
    expect(data).toEqual([]);
  });

  it("lets a user read only their own profile", async () => {
    const alice = await setupUser("alice");
    const bob = await setupUser("bob");

    const { data } = await alice.client.from("profiles").select("id");
    expect(data?.map((row) => row.id)).toEqual([alice.user.id]);

    const { data: other } = await alice.client
      .from("profiles")
      .select("id")
      .eq("id", bob.user.id);
    expect(other).toEqual([]);
  });

  it("lets a user update their own display name but not someone else's", async () => {
    const alice = await setupUser("alice-update");
    const bob = await setupUser("bob-update");

    const own = await alice.client
      .from("profiles")
      .update({ display_name: "Alice" })
      .eq("id", alice.user.id)
      .select("display_name")
      .single();
    expect(own.error).toBeNull();
    expect(own.data?.display_name).toBe("Alice");

    const other = await alice.client
      .from("profiles")
      .update({ display_name: "Hacked" })
      .eq("id", bob.user.id)
      .select();
    expect(other.data).toEqual([]);

    const { data: bobProfile } = await admin
      .from("profiles")
      .select("display_name")
      .eq("id", bob.user.id)
      .single();
    expect(bobProfile?.display_name).toBeNull();
  });

  it("does not let a user change their profile email", async () => {
    const alice = await setupUser("alice-email");

    const { error } = await alice.client
      .from("profiles")
      .update({ email: "other@example.com" })
      .eq("id", alice.user.id);
    expect(error?.code).toBe("42501");
  });

  it("does not let a user insert or delete profiles", async () => {
    const alice = await setupUser("alice-insert");

    const insert = await alice.client
      .from("profiles")
      .insert({ id: crypto.randomUUID(), email: "x@example.com" });
    expect(insert.error?.code).toBe("42501");

    await alice.client.from("profiles").delete().eq("id", alice.user.id);
    const { data } = await admin
      .from("profiles")
      .select("id")
      .eq("id", alice.user.id);
    expect(data).toHaveLength(1);
  });

  it("hides profiles from signed-out visitors", async () => {
    await setupUser("anon-check");
    const { data, error } = await anonClient().from("profiles").select("id");
    expect(data ?? []).toEqual([]);
    if (error) expect(error.code).toBe("42501");
  });
});
