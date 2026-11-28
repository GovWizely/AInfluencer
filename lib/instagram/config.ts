import "server-only";

export function instagramConfig() {
  const appId = process.env.INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;
  const verifyToken = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN;
  const version = process.env.INSTAGRAM_GRAPH_VERSION || "v27.0";
  if (
    !appId ||
    !appSecret ||
    !redirectUri ||
    !verifyToken ||
    !/^https?:\/\//.test(redirectUri) ||
    !/^v\d+\.\d+$/.test(version) ||
    !process.env.SUPABASE_SECRET_KEY
  )
    return null;
  const webhookSecret = process.env.INSTAGRAM_WEBHOOK_APP_SECRET || appSecret;
  return { appId, appSecret, redirectUri, verifyToken, webhookSecret, version };
}

export type InstagramConfig = NonNullable<ReturnType<typeof instagramConfig>>;
