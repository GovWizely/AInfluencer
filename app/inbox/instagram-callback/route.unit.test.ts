import { afterEach, expect, it, vi } from "vitest";

import { GET } from "./route";

const ownerId = "332c3203-3aef-42df-8a83-dbc2e0399775";
const state = "6f1c7f0e-2f4b-4c9b-9a52-6a1d9f0b7e11";
const { after, importFirstMessages, importMessages, subscribe } = vi.hoisted(
  () => ({
    after: vi.fn(),
    importFirstMessages: vi.fn(),
    importMessages: vi.fn(),
    subscribe: vi.fn(),
  }),
);

vi.mock("next/server", () => ({ after }));
vi.mock("next/navigation", () => ({
  redirect: (path: string): never => {
    throw new Error(path);
  },
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    delete: vi.fn(),
    get: () => ({
      value: JSON.stringify({ ownerId, state, handle: "creator" }),
    }),
  }),
}));
vi.mock("@/lib/auth/session", () => ({
  requireUser: async () => ({ id: ownerId }),
}));
vi.mock("@/lib/instagram/config", () => ({ instagramConfig: () => ({}) }));
vi.mock("@/lib/instagram/inbox", () => ({
  importFirstMessages,
  importMessages,
}));
vi.mock("@/lib/instagram/meta", () => ({
  exchangeCode: async () => ({
    token: "credential",
    expiresAt: "2030-01-01T00:00:00Z",
  }),
  instagram: () => ({
    subscribe,
    profile: async () => ({
      user_id: "instagram-id",
      username: "creator",
      account_type: "CREATOR",
    }),
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    rpc: async () => ({ data: "account-id", error: null }),
  }),
}));

afterEach(() => vi.restoreAllMocks());

it("redirects once the first batch reaches its deadline, before importing history", async () => {
  const controller = new AbortController();
  vi.spyOn(AbortSignal, "timeout").mockReturnValue(controller.signal);
  importFirstMessages.mockImplementation(async () => {
    queueMicrotask(() => controller.abort());
    return new Promise<void>(() => {});
  });

  const callback = new Request(
    `https://example.test/inbox/instagram-callback?code=code&state=${state}`,
  );
  await expect(GET(callback)).rejects.toThrow(
    "/inbox?instagram=importing&handle=creator",
  );
  expect(AbortSignal.timeout).toHaveBeenCalledWith(2500);
  expect(importFirstMessages).toHaveBeenCalledOnce();
  expect(importMessages).not.toHaveBeenCalled();
  expect(subscribe).not.toHaveBeenCalled();

  await after.mock.calls[0][0]();
  expect(importMessages).toHaveBeenCalledWith(
    { id: "account-id", external_id: "instagram-id" },
    expect.anything(),
  );
  expect(subscribe).toHaveBeenCalledWith("instagram-id");
});
