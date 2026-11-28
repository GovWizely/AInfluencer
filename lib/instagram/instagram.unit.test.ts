import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { InstagramConfig } from "./config";
import { authorizationUrl, exchangeCode, instagram } from "./meta";
import { handleSchema } from "./onboarding";
import { replyWindowMs, replyWindowOpen } from "./replies";
import { sampleInbox } from "./sample-inbox";
import { parseEvents, validSignature } from "./webhook";

vi.mock("server-only", () => ({}));

const config: InstagramConfig = {
  appId: "app",
  appSecret: "secret",
  redirectUri: "https://example.test/inbox/instagram-callback",
  verifyToken: "verify",
  webhookSecret: "signing-secret",
  version: "v27.0",
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("Instagram onboarding", () => {
  it("normalizes a handle and rejects URLs", () => {
    expect(handleSchema.parse(" @My.Handle ")).toBe("my.handle");
    expect(
      handleSchema.safeParse("https://instagram.com/example").success,
    ).toBe(false);
  });

  it("uses short numeric variants only when a sample sender handle is taken", () => {
    function sampleHandles(occupied: string[]) {
      return sampleInbox(
        "example.creator",
        occupied,
      ).accounts[0].conversations.map((thread) => thread.participant_handle);
    }
    const handles = sampleHandles([]);
    expect(handles.length).toBeGreaterThan(0);
    expect(handles.every((handle) => /^[a-z]+\.[a-z]+$/.test(handle))).toBe(
      true,
    );
    const [first] = handles;
    expect(sampleHandles([first, `${first}_2`])).toEqual([
      `${first}_3`,
      ...handles.slice(1),
    ]);
  });

  it("requests only the Instagram profile and messaging permissions", () => {
    const url = authorizationUrl(config, "nonce");
    expect(url.origin).toBe("https://www.instagram.com");
    expect(url.searchParams.get("state")).toBe("nonce");
    expect(url.searchParams.get("redirect_uri")).toBe(config.redirectUri);
    expect(url.searchParams.has("force_reauth")).toBe(false);
    expect(url.searchParams.get("scope")).toBe(
      "instagram_business_basic,instagram_business_manage_messages",
    );
  });

  it("forces a fresh sign-in when retrying after a handle mismatch", () => {
    expect(
      authorizationUrl(config, "nonce", true).searchParams.get("force_reauth"),
    ).toBe("true");
  });

  it("exchanges the code for a long-lived credential", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ access_token: "short" }))
      .mockResolvedValueOnce(
        Response.json({ access_token: "long", expires_in: 3600 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await exchangeCode(config, "code");
    expect(result.token).toBe("long");
    const [[shortUrl, shortOptions], [longUrl]] = fetchMock.mock.calls;
    expect(shortUrl.href).toBe("https://api.instagram.com/oauth/access_token");
    expect(shortOptions.body.get("code")).toBe("code");
    expect(shortOptions.body.get("grant_type")).toBe("authorization_code");
    expect(longUrl.searchParams.get("access_token")).toBe("short");
    expect(longUrl.searchParams.get("grant_type")).toBe("ig_exchange_token");
  });

  it("follows conversation pagination, reads message details, and sends a reply", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          data: [{ id: "thread-1" }],
          paging: {
            next: "https://graph.instagram.com/v27.0/me/conversations?after=2&access_token=old",
          },
        }),
      )
      .mockResolvedValueOnce(Response.json({ data: [{ id: "thread-2" }] }))
      .mockResolvedValueOnce(
        Response.json({ messages: { data: [{ id: "message-1" }] } }),
      )
      .mockResolvedValueOnce(
        Response.json({
          id: "message-1",
          created_time: "2022-07-12T19:11:07+0000",
          from: { id: "fan", username: "reader" },
          to: { data: [{ id: "creator" }] },
          message: "Hi!",
        }),
      )
      .mockResolvedValueOnce(Response.json({ message_id: "message-2" }));
    vi.stubGlobal("fetch", fetchMock);
    const api = instagram(config, "long");
    const listed = Array.fromAsync(api.conversations());
    await vi.runAllTimersAsync();
    const threads = await listed;
    expect(threads.map((thread) => thread.id)).toEqual([
      "thread-1",
      "thread-2",
    ]);
    expect(fetchMock.mock.calls[1][0].searchParams.has("access_token")).toBe(
      false,
    );
    const messages = api.messages(threads[0].id);
    await vi.runAllTimersAsync();
    expect((await messages)[0].message).toBe("Hi!");
    expect(await api.send("creator", "fan", "Hello!")).toEqual({
      message_id: "message-2",
    });
    expect(fetchMock.mock.calls[4][0].pathname).toBe("/v27.0/creator/messages");
    expect(JSON.parse(fetchMock.mock.calls[4][1].body)).toEqual({
      recipient: { id: "fan" },
      message: { text: "Hello!" },
    });
  });

  it("paces conversation and message-detail requests even if an individual request fails", async () => {
    vi.useFakeTimers();
    let active = 0;
    let peak = 0;
    const started: number[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: URL) => {
        started.push(Date.now());
        const id = url.pathname.split("/").at(-1);
        if (id === "thread") {
          return Response.json({
            messages: {
              data: Array.from({ length: 9 }, (_, n) => ({
                id: `message-${n}`,
              })),
            },
          });
        }
        active++;
        peak = Math.max(active, peak);
        await Promise.resolve();
        active--;
        if (id === "message-2") return Response.json({}, { status: 429 });
        return Response.json({
          id,
          created_time: "2022-07-12T19:11:07+0000",
          from: { id: "fan" },
          to: { data: [{ id: "creator" }] },
        });
      }),
    );
    const first = instagram(config, "long", "creator").messages("thread");
    const second = instagram(config, "long", "creator").messages("thread");
    await vi.runAllTimersAsync();
    const messages = await first;
    expect(messages.map(({ id }) => id)).toEqual([
      "message-0",
      "message-1",
      "message-3",
      "message-4",
      "message-5",
      "message-6",
      "message-7",
      "message-8",
    ]);
    expect(await second).toEqual(messages);
    expect(peak).toBe(1);
    expect(started).toHaveLength(20);
    for (let i = 1; i < started.length; i++) {
      expect(started[i] - started[i - 1]).toBeGreaterThanOrEqual(500);
    }
  });
});

describe("Instagram message delivery", () => {
  const inbound = {
    sender: { id: "fan" },
    recipient: { id: "creator" },
    timestamp: 1000,
    message: { mid: "message-1", text: "Hi!" },
  };

  it("checks the exact signed bytes", () => {
    const body = Buffer.from(JSON.stringify(inbound));
    const signature = `sha256=${createHmac("sha256", config.webhookSecret).update(body).digest("hex")}`;
    expect(validSignature(config.webhookSecret, body, signature)).toBe(true);
    expect(
      validSignature(
        config.webhookSecret,
        Buffer.concat([body, Buffer.from(" ")]),
        signature,
      ),
    ).toBe(false);
    expect(validSignature(config.webhookSecret, body, "sha256=zz")).toBe(false);
  });

  it("normalizes incoming DMs and outgoing echoes, ignoring unrelated events", () => {
    const events = parseEvents({
      object: "instagram",
      entry: [
        {
          id: "creator",
          messaging: [
            inbound,
            { ...inbound, message: undefined, read: {} },
            {
              ...inbound,
              sender: { id: "creator" },
              recipient: { id: "fan" },
              message: { mid: "echo", is_echo: true },
            },
          ],
        },
      ],
    });
    expect(events).toMatchObject([
      {
        accountId: "creator",
        participantId: "fan",
        messageId: "message-1",
        outbound: false,
      },
      {
        accountId: "creator",
        participantId: "fan",
        messageId: "echo",
        outbound: true,
      },
    ]);
  });

  it("closes replies exactly 24 hours after the last incoming message", () => {
    const inbound = new Date(0).toISOString();
    expect(replyWindowOpen(inbound, replyWindowMs - 1)).toBe(true);
    expect(replyWindowOpen(inbound, replyWindowMs)).toBe(false);
    expect(replyWindowOpen(null, 0)).toBe(false);
  });
});
