create table public.instagram_credentials (
  account_id uuid primary key references public.social_accounts (id) on delete cascade,
  access_token text not null,
  expires_at timestamptz not null
);

alter table public.instagram_credentials enable row level security;
revoke all on table public.instagram_credentials from public, anon, authenticated;
grant select, insert, update on table public.instagram_credentials to service_role;

alter table public.conversations add column participant_external_id text;

create index conversations_instagram_participant_idx
  on public.conversations (account_id, participant_external_id);

create function public.connect_instagram(
  creator_id uuid,
  instagram_id text,
  instagram_handle text,
  instagram_name text,
  follower_count integer,
  credential text,
  expiration timestamptz
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  connected_id uuid;
begin
  insert into public.social_accounts as a (owner_id, platform, external_id, handle, display_name, followers)
  values (creator_id, 'instagram', instagram_id, instagram_handle, instagram_name, follower_count)
  on conflict (platform, external_id) do update
    set handle = excluded.handle, display_name = excluded.display_name, followers = excluded.followers
    where a.owner_id = excluded.owner_id
  returning id into connected_id;

  if connected_id is null then
    return null;
  end if;

  insert into public.instagram_credentials (account_id, access_token, expires_at)
  values (connected_id, credential, expiration)
  on conflict (account_id) do update
    set access_token = excluded.access_token, expires_at = excluded.expires_at;
  return connected_id;
end;
$$;

revoke execute on function public.connect_instagram(uuid, text, text, text, integer, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.connect_instagram(uuid, text, text, text, integer, text, timestamptz)
  to service_role;

drop policy "Users can reply in their conversations" on public.messages;
create policy "Users can save replies on demo accounts"
  on public.messages for insert
  to authenticated
  with check (
    direction = 'outbound'
    and sent_by = 'creator'
    and exists (
      select 1 from public.conversations c
      join public.social_accounts a on a.id = c.account_id
      where c.id = conversation_id and a.external_id like 'demo:%'
    )
  );
