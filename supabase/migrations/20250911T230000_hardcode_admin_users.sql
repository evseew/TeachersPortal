-- Захардкоженные администраторы: автоматическое назначение роли Administrator
-- для email'ов из списка ADMIN_EMAILS при создании/обновлении профиля

-- Обновляем функцию ensure_profile для автоматического назначения роли Administrator
-- захардкоженным email'ам администраторов
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
  v_is_admin boolean := false;
begin
  -- Проверяем, является ли email захардкоженным администратором
  -- Список должен синхронизироваться с ADMIN_EMAILS в lib/constants/user-management.ts
  if p_email = 'info@planetenglish.ru' then
    v_is_admin := true;
  end if;

  insert into public.profiles (email, avatar_url, full_name, role)
  values (
    p_email, 
    p_avatar_url, 
    p_full_name,
    case when v_is_admin then 'Administrator'::user_role else 'Teacher'::user_role end
  )
  on conflict (email) do update
    set avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
        full_name  = coalesce(excluded.full_name, public.profiles.full_name),
        role       = case 
                       when v_is_admin then 'Administrator'::user_role 
                       else public.profiles.role 
                     end,
        updated_at = now()
  returning * into v_profile;

  return v_profile;
end;
$$;

comment on function public.ensure_profile(text, text, text) is 'Создаёт профиль при первом входе; обновляет avatar/full_name при повторном. Автоматически назначает роль Administrator захардкоженным email''ам.';

-- Обновляем существующий профиль info@planetenglish.ru до роли Administrator (если он уже существует)
update public.profiles 
set role = 'Administrator'::user_role, updated_at = now()
where email = 'info@planetenglish.ru' and role != 'Administrator';
