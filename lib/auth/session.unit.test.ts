import { beforeEach, describe, expect, it, vi } from "vitest";

const { connection, createClient, getClaims, redirect } = vi.hoisted(() => ({
  connection: vi.fn(),
  createClient: vi.fn(),
  getClaims: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ connection }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/supabase/server", () => ({ createClient }));

import { getCurrentUser, requireUser } from "./session";

beforeEach(() => {
  vi.resetAllMocks();
  createClient.mockResolvedValue({ auth: { getClaims } });
});

describe("getCurrentUser", () => {
  it("waits for a request before creating the auth client or reading claims", async () => {
    let connect!: () => void;
    connection.mockReturnValue(
      new Promise<void>((resolve) => (connect = resolve)),
    );
    getClaims.mockResolvedValue({
      data: { claims: { sub: "user-id", email: "user@example.com" } },
      error: null,
    });

    const user = getCurrentUser();
    expect(createClient).not.toHaveBeenCalled();
    expect(getClaims).not.toHaveBeenCalled();
    connect();

    await expect(user).resolves.toEqual({
      id: "user-id",
      email: "user@example.com",
    });
  });

  it.each([
    { data: null, error: null },
    { data: { claims: {} }, error: null },
    { data: { claims: { sub: "user-id" } }, error: new Error("Invalid JWT") },
  ])("returns null for missing or invalid claims: %j", async (result) => {
    getClaims.mockResolvedValue(result);
    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("normalizes an absent email", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "user-id" } },
      error: null,
    });
    await expect(getCurrentUser()).resolves.toEqual({
      id: "user-id",
      email: null,
    });
  });
});

describe("requireUser", () => {
  it("redirects a signed-out user to login", async () => {
    getClaims.mockResolvedValue({ data: null, error: null });
    await requireUser();
    expect(redirect).toHaveBeenCalledWith("/login");
  });
});
