-- Profiles Directory Functions
-- These functions allow both anonymous and authenticated users to view profiles
-- Email addresses are never exposed to maintain privacy
-- Edit permissions are handled separately via RLS on the profiles table

-- Function: List all profiles (public version - no auth required)
create or replace function public.list_profile_cards_public()
returns table (
  id uuid,
  full_name text,
  avatar_url text,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- No auth check - anyone can view
  -- Still returns safe fields only (no email)
  return query
  select
    p.id,
    p.full_name,
    p.avatar_url,
    p.updated_at
  from public.profiles p
  order by p.updated_at desc nulls last;
end;
$$;

-- Grant execute permission to both anonymous and authenticated users
grant execute on function public.list_profile_cards_public() to anon;
grant execute on function public.list_profile_cards_public() to authenticated;

-- Function: Get single profile (public version - no auth required)
create or replace function public.get_profile_card_public(target_id uuid)
returns table (
  id uuid,
  full_name text,
  avatar_url text,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Validate input
  if target_id is null then
    raise exception 'Profile ID is required';
  end if;

  -- No auth check - anyone can view
  -- Still returns safe fields only (no email)
  return query
  select
    p.id,
    p.full_name,
    p.avatar_url,
    p.updated_at
  from public.profiles p
  where p.id = target_id
  limit 1;
end;
$$;

-- Grant execute permission to both anonymous and authenticated users
grant execute on function public.get_profile_card_public(uuid) to anon;
grant execute on function public.get_profile_card_public(uuid) to authenticated;

-- Add comments for documentation
comment on function public.list_profile_cards_public() is
'Public version of list_profile_cards. Returns all profiles without requiring authentication. No emails exposed.';

comment on function public.get_profile_card_public(uuid) is
'Public version of get_profile_card. Returns a single profile without requiring authentication. No emails exposed.';