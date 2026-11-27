alter table public.social_accounts
  drop constraint social_accounts_platform_check,
  add constraint social_accounts_platform_check
    check (platform in ('instagram', 'facebook', 'reddit'));

create policy "Users can delete their own accounts"
  on public.social_accounts for delete
  to authenticated
  using (owner_id = (select auth.uid()));

grant delete on table public.social_accounts to authenticated;

create table public.account_credentials (
  account_id uuid primary key references public.social_accounts (id) on delete cascade,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  scopes text[] not null default '{}'
);

alter table public.account_credentials enable row level security;
revoke all on table public.account_credentials from public, anon, authenticated;
grant select, insert, update, delete on table public.account_credentials to service_role;

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  external_id text not null,
  author text not null,
  body text not null,
  created_at timestamptz not null,
  parent_id uuid,
  replied_at timestamptz,
  needs_reply boolean not null default true,
  unique (post_id, external_id),
  unique (post_id, id),
  foreign key (post_id, parent_id) references public.comments (post_id, id)
    on delete set null (parent_id),
  check (not needs_reply or replied_at is null)
);

create index comments_post_id_created_at_idx on public.comments (post_id, created_at);
create index comments_post_id_parent_id_idx on public.comments (post_id, parent_id);

alter table public.comments enable row level security;

create policy "Users can view comments on their posts"
  on public.comments for select
  to authenticated
  using (exists (
    select 1 from public.posts
    where posts.id = comments.post_id and public.owns_account(posts.account_id)
  ));

revoke all on table public.comments from public, anon, authenticated;
grant select on table public.comments to authenticated;
grant select, insert, update, delete on table public.comments to service_role;
