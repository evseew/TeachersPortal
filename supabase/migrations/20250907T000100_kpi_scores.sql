-- PRD v1 — Шаг 2: KPI и рейтинги

-- Филиалы
create table if not exists public.branch (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at on public.branch;
create trigger set_updated_at
before update on public.branch
for each row execute function public.tg_set_updated_at();

-- KPI преподавателей (v1: один филиал на преподавателя)
create table if not exists public.teacher_metrics (
  teacher_id uuid primary key references public.profiles(user_id) on delete cascade,
  branch_id uuid null references public.branch(id) on delete set null,
  last_year_base integer null,
  last_year_returned integer null,
  trial_total integer null,
  trial_converted integer null,
  return_pct numeric(6,2) generated always as (
    case when coalesce(last_year_base,0) > 0 then round( (coalesce(last_year_returned,0)::numeric * 100.0) / last_year_base, 2) else null end
  ) stored,
  trial_pct numeric(6,2) generated always as (
    case when coalesce(trial_total,0) > 0 then round( (coalesce(trial_converted,0)::numeric * 100.0) / trial_total, 2) else null end
  ) stored,
  score numeric(8,2) generated always as (
    (
      case when coalesce(last_year_base,0) > 0
        then round((coalesce(last_year_returned,0)::numeric * 100.0) / last_year_base, 2)
        else 0
      end
    )
    +
    (
      case when coalesce(trial_total,0) > 0
        then round((coalesce(trial_converted,0)::numeric * 100.0) / trial_total, 2)
        else 0
      end
    )
  ) stored,
  updated_by text null,
  updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at on public.teacher_metrics;
create trigger set_updated_at
before update on public.teacher_metrics
for each row execute function public.tg_set_updated_at();

create index if not exists idx_teacher_metrics_branch on public.teacher_metrics(branch_id);

-- Текущие рейтинги
create table if not exists public.current_scores (
  id bigserial primary key,
  scope text not null check (scope in ('teacher_overall','branch_overall')),
  context text not null default 'all',
  teacher_id uuid null references public.profiles(user_id) on delete cascade,
  branch_id uuid null references public.branch(id) on delete cascade,
  score numeric(8,2) not null,
  rank integer not null,
  updated_at timestamptz not null default now(),
  unique(scope, context, teacher_id, branch_id)
);

create index if not exists idx_current_scores_scope on public.current_scores(scope, context);
create index if not exists idx_current_scores_teacher on public.current_scores(teacher_id) where teacher_id is not null;
create index if not exists idx_current_scores_branch on public.current_scores(branch_id) where branch_id is not null;

-- Снимки (snapshots)
create table if not exists public.snapshots (
  id bigserial primary key,
  scope text not null check (scope in ('teacher_overall','branch_overall')),
  context text not null default 'all',
  teacher_id uuid null references public.profiles(user_id) on delete cascade,
  branch_id uuid null references public.branch(id) on delete cascade,
  score numeric(8,2) not null,
  rank integer not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_snapshots_scope on public.snapshots(scope, context);
create index if not exists idx_snapshots_teacher on public.snapshots(teacher_id) where teacher_id is not null;
create index if not exists idx_snapshots_branch on public.snapshots(branch_id) where branch_id is not null;

-- Матрица прав ролей (как источник для UI)
create table if not exists public.role_permissions (
  role user_role primary key,
  permissions jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at on public.role_permissions;
create trigger set_updated_at
before update on public.role_permissions
for each row execute function public.tg_set_updated_at();

-- Предзаполнение ролей (пустые разрешения, UI будет редактировать)
insert into public.role_permissions(role) values
  ('Administrator'), ('Senior Teacher'), ('Teacher'), ('Salesman'), ('Head of Sales')
on conflict (role) do nothing;


