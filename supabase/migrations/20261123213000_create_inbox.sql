-- Connected social accounts, their posts, and DM conversations.
-- Rows are written by trusted importers (secret key); users read their own
-- data and may only add outbound replies and mark conversations read.

create table public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  platform text not null check (platform in ('instagram')),
  external_id text not null,
  handle text not null,
  display_name text,
  bio text,
  followers integer not null default 0 check (followers >= 0),
  created_at timestamptz not null default now(),
  unique (platform, external_id)
);

create index social_accounts_owner_id_idx on public.social_accounts (owner_id);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.social_accounts (id) on delete cascade,
  external_id text not null,
  caption text not null default '',
  posted_at timestamptz not null,
  like_count integer not null default 0 check (like_count >= 0),
  comment_count integer not null default 0 check (comment_count >= 0),
  unique (account_id, external_id)
);

create index posts_account_id_posted_at_idx on public.posts (account_id, posted_at desc);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.social_accounts (id) on delete cascade,
  external_id text not null,
  participant_handle text not null,
  participant_name text,
  last_message_at timestamptz,
  last_inbound_at timestamptz,
  last_message_preview text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (account_id, external_id)
);

create index conversations_account_id_last_message_at_idx
  on public.conversations (account_id, last_message_at desc nulls last);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  external_id text,
  direction text not null check (direction in ('inbound', 'outbound')),
  sent_by text not null check (sent_by in ('fan', 'creator')),
  body text not null check (char_length(body) between 1 and 2000),
  sent_at timestamptz not null default now(),
  constraint messages_direction_matches_sender
    check ((direction = 'inbound') = (sent_by = 'fan')),
  unique (conversation_id, external_id)
);

create index messages_conversation_id_sent_at_idx on public.messages (conversation_id, sent_at);

-- Ownership check shared by policies. security definer so policies on child
-- tables don't depend on the caller's grants on social_accounts.
create function public.owns_account(target_account_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.social_accounts
    where id = target_account_id and owner_id = (select auth.uid())
  );
$$;

create function public.owns_conversation(target_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.conversations c
    join public.social_accounts a on a.id = c.account_id
    where c.id = target_conversation_id and a.owner_id = (select auth.uid())
  );
$$;

revoke execute on function public.owns_account(uuid) from public, anon;
revoke execute on function public.owns_conversation(uuid) from public, anon;
grant execute on function public.owns_account(uuid) to authenticated;
grant execute on function public.owns_conversation(uuid) to authenticated;

alter table public.social_accounts enable row level security;
alter table public.posts enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy "Users can view their own accounts"
  on public.social_accounts for select
  to authenticated
  using (owner_id = (select auth.uid()));

create policy "Users can view posts on their accounts"
  on public.posts for select
  to authenticated
  using (public.owns_account(account_id));

create policy "Users can view their conversations"
  on public.conversations for select
  to authenticated
  using (public.owns_account(account_id));

create policy "Users can mark their conversations read"
  on public.conversations for update
  to authenticated
  using (public.owns_account(account_id))
  with check (public.owns_account(account_id));

create policy "Users can view messages in their conversations"
  on public.messages for select
  to authenticated
  using (public.owns_conversation(conversation_id));

create policy "Users can reply in their conversations"
  on public.messages for insert
  to authenticated
  with check (
    direction = 'outbound'
    and sent_by = 'creator'
    and public.owns_conversation(conversation_id)
  );

revoke all on table public.social_accounts, public.posts, public.conversations, public.messages from anon;
revoke all on table public.social_accounts, public.posts, public.conversations, public.messages from authenticated;
grant select on table public.social_accounts, public.posts, public.conversations, public.messages to authenticated;
grant update (read_at) on table public.conversations to authenticated;
grant insert (conversation_id, direction, sent_by, body) on table public.messages to authenticated;

-- Keep the conversation summary in sync with its messages.
create function public.refresh_conversation_summary()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid := coalesce(new.conversation_id, old.conversation_id);
begin
  -- Serialize concurrent writers on this conversation; the update below then
  -- runs with a fresh snapshot that includes any message committed meanwhile.
  perform 1 from public.conversations where id = target for update;

  update public.conversations c
  set
    last_message_at = s.last_message_at,
    last_inbound_at = s.last_inbound_at,
    last_message_preview = s.preview,
    read_at = case
      when new.direction = 'outbound' and tg_op = 'INSERT'
        then greatest(c.read_at, new.sent_at)
      else c.read_at
    end
  from (
    select
      max(m.sent_at) as last_message_at,
      max(m.sent_at) filter (where m.direction = 'inbound') as last_inbound_at,
      (
        select left(m2.body, 140) from public.messages m2
        where m2.conversation_id = target
        order by m2.sent_at desc, m2.id desc
        limit 1
      ) as preview
    from public.messages m
    where m.conversation_id = target
  ) s
  where c.id = target;
  return null;
end;
$$;

revoke execute on function public.refresh_conversation_summary() from public, anon, authenticated;

create trigger messages_refresh_conversation_summary
  after insert or update or delete on public.messages
  for each row execute function public.refresh_conversation_summary();
