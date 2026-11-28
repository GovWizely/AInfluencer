# AInfluencer

Next.js 16 + Supabase app with email sign-in and a unified inbox for Instagram messages.

## Requirements

- Node 24, pnpm 10 (`corepack enable`)
- Docker + [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) for the local stack

## Local development

```bash
pnpm install
pnpm supabase:start   # local Postgres, Auth, Studio, Mailpit
pnpm supabase:env     # writes .env.local with the local URL + keys
pnpm dev
```

- App: http://127.0.0.1:3000 (use `127.0.0.1`, not `localhost`, so it matches `site_url` and the cookie domain of the login link)
- Mailpit (catches login emails): http://127.0.0.1:54324
- Studio: http://127.0.0.1:54323

After changing migrations, run `pnpm supabase:reset` and `pnpm supabase:types`.

### Demo inbox data

In local development, if Instagram is not configured, sign in with a new email, enter an Instagram handle, and choose **Open sample inbox**. This loads synthetic conversations for that handle; it neither looks up a real profile nor contacts Instagram. Outside local development, an unconfigured deployment shows a coming-soon message.

```bash
pnpm seed:demo --email you@example.com
```

The command loads 5 anonymized Instagram creators (posts plus synthetic DMs) from `supabase/fixtures/demo-instagram.json` under that login, creating the user if needed. It only runs against local Supabase and is safe to re-run. Replies to sample conversations are stored locally and never sent to Instagram.

The fixture was generated once with `node scripts/build-demo-fixture.mjs <dataset.json>` from a scraped profile dataset. The raw dataset contains real accounts; don't commit it.

### Instagram integration

1. In the Meta App Dashboard, set up [Instagram API with Instagram Login](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/). Set the matching `INSTAGRAM_APP_ID` and `INSTAGRAM_APP_SECRET` on the server.
2. Set `INSTAGRAM_REDIRECT_URI` to the exact allowed OAuth redirect URI, e.g. `https://your-domain.example/inbox/instagram-callback`. Use the same HTTPS origin for sign-in and the callback so the sign-in and connection cookies are available.
3. Configure the Instagram `messages` webhook field with callback `https://your-domain.example/api/instagram/webhook` and a random secret `INSTAGRAM_WEBHOOK_VERIFY_TOKEN`. Set `INSTAGRAM_WEBHOOK_APP_SECRET` if the Meta app secret used for signing differs from the Instagram Login app secret.
4. Apply the migrations and set the server-only `SUPABASE_SECRET_KEY`. For accounts outside your app roles, request Meta Advanced Access for `instagram_business_basic` and `instagram_business_manage_messages`. Connected accounts must allow message access in Instagram.

The app fetches the profile only after consent. It imports up to the 20 latest messages per conversation (Meta's message-detail limit); old requests or some message types may be unavailable. New DMs and replies go into the same inbox. Replies must be within 24 hours of the last incoming DM. Comments and public posts are not imported. The long-lived credentials are only accessible to the server. If access is revoked or expires, reconnect the account from the inbox.

## How auth works

| Piece                                       | Purpose                                                                                     |
| ------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `proxy.ts` / `lib/supabase/proxy.ts`        | Refreshes the session cookie, redirects signed-out users away from `/inbox` and `/settings` |
| `app/(auth)/login`                          | Magic-link form (server action)                                                             |
| `app/auth/confirm`                          | Verifies the magic-link `token_hash`, sets the session                                      |
| `lib/auth/session.ts`                       | `getCurrentUser()` / `requireUser()` for server components (uses `getClaims()`)             |
| `lib/auth/routes.ts`                        | Protected routes and `next` redirect sanitizing (no open redirects)                         |
| `supabase/migrations/*_create_profiles.sql` | `public.profiles` row per user, created by trigger, RLS: self read/update                   |

## Scripts

| Command                 | Description                                                      |
| ----------------------- | ---------------------------------------------------------------- |
| `pnpm dev`              | Dev server                                                       |
| `pnpm build`            | Production build                                                 |
| `pnpm lint:fix`         | ESLint + Prettier auto-fix                                       |
| `pnpm ts`               | Type check                                                       |
| `pnpm test:unit`        | Unit tests (`*.unit.test.ts`)                                    |
| `pnpm test:integration` | Tests against the local Supabase stack (`*.integration.test.ts`) |
| `pnpm seed:demo`        | Load demo inbox data for `--email` (local only)                  |
| `pnpm supabase:types`   | Regenerate `lib/supabase/database.types.ts`                      |

## Hosted Supabase setup

1. Apply migrations: `supabase link --project-ref <ref>` then `supabase db push` (or paste the migration into the SQL editor).
2. Authentication > URL Configuration: set Site URL and add redirect URLs for each environment, e.g. `https://<domain>/**`, `http://127.0.0.1:3000/**`.
3. Authentication > Email Templates > Magic Link and Confirm signup: use the HTML in `supabase/templates/` (links must go to `/auth/confirm?token_hash=...`).
4. Authentication > SMTP: configure a real provider (e.g. Resend, SES). The built-in sender is rate-limited and only for testing.
5. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (and optionally `NEXT_PUBLIC_SITE_URL`) in the deployment environment.
