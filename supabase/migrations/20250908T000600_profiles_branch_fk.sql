-- Add missing FK: profiles.branch_id -> branch.id and supporting index
-- Safe to run multiple times

do $$ begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_branch_id_fkey'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_branch_id_fkey
      foreign key (branch_id)
      references public.branch(id)
      on delete set null;
  end if;
end $$;

create index if not exists idx_profiles_branch_id on public.profiles(branch_id);


