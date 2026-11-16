# AInfluencer

Next.js 16 + Supabase app. This repo currently contains user login (email magic links, optional Google OAuth) and a protected placeholder inbox.

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

After changing migrations, run `pnpm supabase:reset`.

To try Google locally, set `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` / `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`, set `enabled = true` under `[auth.external.google]` in `supabase/config.toml`, and restart Supabase. The Google button only renders when the provider is enabled.

## How auth works

| Piece                                       | Purpose                                                                                     |
| ------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `proxy.ts` / `lib/supabase/proxy.ts`        | Refreshes the session cookie, redirects signed-out users away from `/inbox` and `/settings` |
| `app/(auth)/login`                          | Magic-link form + Google button (server actions)                                            |
| `app/auth/confirm`                          | Verifies the magic-link `token_hash`, sets the session                                      |
| `app/auth/callback`                         | Exchanges the Google OAuth `code` for a session                                             |
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

## Hosted Supabase setup

1. Apply migrations: `supabase link --project-ref <ref>` then `supabase db push` (or paste the migration into the SQL editor).
2. Authentication > URL Configuration: set Site URL and add redirect URLs for each environment, e.g. `https://<domain>/**`, `http://127.0.0.1:3000/**`.
3. Authentication > Email Templates > Magic Link and Confirm signup: use the HTML in `supabase/templates/` (links must go to `/auth/confirm?token_hash=...`).
4. Authentication > Providers > Google: enable and add the Google client ID/secret. In Google Cloud, add `https://<ref>.supabase.co/auth/v1/callback` as an authorized redirect URI.
5. Authentication > SMTP: configure a real provider (e.g. Resend, SES). The built-in sender is rate-limited and only for testing.
6. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (and optionally `NEXT_PUBLIC_SITE_URL`) in the deployment environment.
