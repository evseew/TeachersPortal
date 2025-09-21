-- PRD v1 — Шаг 1: профили и RPC ensure_profile

-- Типы ролей и категорий
do $$ begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum (
      'Administrator',
      'Senior Teacher',
      'Teacher',
      'Salesman',
      'Head of Sales'
    );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'teacher_category') then
    create type teacher_category as enum (
      'Partner', 'Senior', 'Middle', 'Junior', 'Newcomer'
    );
  end if;
end $$;

-- Таблица профилей
create table if not exists public.profiles (
  user_id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role user_role not null default 'Teacher',
  branch_id uuid null,
  category teacher_category null,
  full_name text null,
  avatar_url text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Триггер updated_at
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end; $$;

drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at
before update on public.profiles
for each row execute function public.tg_set_updated_at();

-- RPC: ensure_profile(email, avatar_url, full_name)
create or replace function public.ensure_profile(
  p_email text,
  p_avatar_url text default null,
  p_full_name text default null
)
returns public.profiles
language plpgsql
security definer
as $$
declare
  v_profile public.profiles;
begin
  insert into public.profiles (email, avatar_url, full_name)
  values (p_email, p_avatar_url, p_full_name)
  on conflict (email) do update
    set avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
        full_name  = coalesce(excluded.full_name, public.profiles.full_name),
        updated_at = now()
  returning * into v_profile;

  return v_profile;
end;
$$;

comment on function public.ensure_profile(text, text, text) is 'Создаёт профиль при первом входе; обновляет avatar/full_name при повторном.';


