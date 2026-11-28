import "server-only";

import { z } from "zod";

import type { InstagramConfig } from "./config";

const graph = "https://graph.instagram.com";
const conversationRequestIntervalMs = 510;
const conversationSlots = new Map<string | symbol, Promise<void>>();

async function waitForConversationSlot(account: string | symbol) {
  const previous = conversationSlots.get(account) ?? Promise.resolve();
  const next = previous.then(
    () =>
      new Promise<void>((resolve) =>
        setTimeout(resolve, conversationRequestIntervalMs),
      ),
  );
  conversationSlots.set(account, next);
  void next.then(() => {
    if (conversationSlots.get(account) === next)
      conversationSlots.delete(account);
  });
  await previous;
}
const instagramId = z
  .union([z.string().min(1), z.number().int().safe()])
  .transform(String);
const pageSchema = <T extends z.ZodType>(item: T) =>
  z.object({
    data: z.array(item),
    paging: z.object({ next: z.string().optional() }).optional(),
  });
const idOnly = z.object({ id: instagramId });
const conversationPage = pageSchema(idOnly);
const person = idOnly.extend({ username: z.string().optional() });
const shortToken = z.object({ access_token: z.string().min(1) });
const longToken = shortToken.extend({ expires_in: z.number().positive() });
const profileSchema = z.object({
  user_id: instagramId,
  username: z.string().min(1),
  account_type: z.string(),
  name: z.string().optional(),
  followers_count: z.number().int().nonnegative().optional(),
});
const messageSchema = idOnly.extend({
  created_time: z
    .string()
    .refine((value) => Number.isFinite(Date.parse(value))),
  from: person,
  to: pageSchema(person),
  message: z.string().nullable().optional(),
});

export function authorizationUrl(
  config: InstagramConfig,
  state: string,
  forceReauth = false,
) {
  const url = new URL("https://www.instagram.com/oauth/authorize");
  url.search = new URLSearchParams({
    client_id: config.appId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: "instagram_business_basic,instagram_business_manage_messages",
    enable_fb_login: "false",
    ...(forceReauth ? { force_reauth: "true" } : {}),
    state,
  }).toString();
  return url;
}

async function request<T>(url: URL, schema: z.ZodType<T>, init?: RequestInit) {
  const timeout = AbortSignal.timeout(15_000);
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    signal: init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout,
    redirect: "error",
  });
  if (!response.ok)
    throw new Error(`Instagram request failed (${response.status})`);
  return schema.parse(await response.json());
}

export async function exchangeCode(config: InstagramConfig, code: string) {
  const short = await request(
    new URL("https://api.instagram.com/oauth/access_token"),
    shortToken,
    {
      method: "POST",
      body: new URLSearchParams({
        client_id: config.appId,
        client_secret: config.appSecret,
        redirect_uri: config.redirectUri,
        grant_type: "authorization_code",
        code,
      }),
    },
  );
  const url = new URL("/access_token", graph);
  url.search = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: config.appSecret,
    access_token: short.access_token,
  }).toString();
  const result = await request(url, longToken);
  return {
    token: result.access_token,
    expiresAt: new Date(Date.now() + result.expires_in * 1000).toISOString(),
  };
}

export function instagram(
  config: InstagramConfig,
  token: string,
  accountId?: string,
) {
  const conversationKey = accountId ?? Symbol();
  function url(path: string, params?: Record<string, string>) {
    const result = new URL(`/${config.version}/${path}`, graph);
    result.search = new URLSearchParams(params).toString();
    return result;
  }

  function call<T>(
    url: URL,
    schema: z.ZodType<T>,
    body?: unknown,
    signal?: AbortSignal,
  ) {
    if (url.origin !== graph) throw new Error("Unexpected Instagram URL");
    url.searchParams.delete("access_token");
    return request(url, schema, {
      signal,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { method: "POST", body: JSON.stringify(body) } : {}),
    });
  }

  async function conversationCall<T>(
    url: URL,
    schema: z.ZodType<T>,
    signal?: AbortSignal,
  ) {
    signal?.throwIfAborted();
    await waitForConversationSlot(conversationKey);
    return call(url, schema, undefined, signal);
  }

  async function* conversations(participant?: string, signal?: AbortSignal) {
    let next: URL | undefined = url(
      "me/conversations",
      participant ? { user_id: participant } : { platform: "instagram" },
    );
    while (next) {
      const page: z.infer<typeof conversationPage> = await conversationCall(
        next,
        conversationPage,
        signal,
      );
      yield* page.data;
      next = page.paging?.next ? new URL(page.paging.next) : undefined;
    }
  }

  return {
    profile: () =>
      call(
        url("me", {
          fields: "user_id,username,account_type,name,followers_count",
        }),
        profileSchema,
      ),
    participant: (id: string) =>
      call(url(encodeURIComponent(id), { fields: "username" }), person),
    conversations,
    async messages(conversationId: string, limit = 20, signal?: AbortSignal) {
      const thread = await conversationCall(
        url(encodeURIComponent(conversationId), {
          fields: `messages.limit(${limit})`,
        }),
        z.object({ messages: pageSchema(idOnly).optional() }),
        signal,
      );
      const ids = (thread.messages?.data ?? []).slice(0, limit);
      const messages: z.infer<typeof messageSchema>[] = [];
      for (const { id } of ids) {
        const message = await conversationCall(
          url(encodeURIComponent(id), {
            fields: "id,created_time,from,to,message",
          }),
          messageSchema,
          signal,
        ).catch(() => null);
        if (message) messages.push(message);
      }
      return messages;
    },
    subscribe: (id: string) =>
      call(
        url(`${encodeURIComponent(id)}/subscribed_apps`, {
          subscribed_fields: "messages",
        }),
        z.object({ success: z.literal(true) }),
        {},
      ),
    send: (id: string, recipient: string, text: string) =>
      call(
        url(`${encodeURIComponent(id)}/messages`),
        z.object({ message_id: instagramId }),
        { recipient: { id: recipient }, message: { text } },
      ),
  };
}

export type Instagram = ReturnType<typeof instagram>;
