-- PRD v1 — VIEW для стабильного чтения api_v1.*

create schema if not exists api_v1;

-- Teacher overall view
create or replace view api_v1.vw_leaderboard_teacher_overall_all as
select
  p.user_id as teacher_id,
  coalesce(p.full_name, p.email) as name,
  p.category,
  b.id as branch_id,
  b.name as branch_name,
  tm.return_pct,
  tm.trial_pct,
  cs.score,
  cs.rank,
  coalesce(cs.updated_at, now()) as updated_at,
  -- deltas считаем относительно последнего снапшота
  (cs.rank - s.rank) as delta_rank,
  (cs.score - s.score) as delta_score,
  null::text as prize
from public.current_scores cs
join public.profiles p on p.user_id = cs.teacher_id
left join public.teacher_metrics tm on tm.teacher_id = p.user_id
left join public.branch b on b.id = tm.branch_id
left join lateral (
  select s2.rank, s2.score
  from public.snapshots s2
  where s2.scope = 'teacher_overall' and s2.context = 'all' and s2.teacher_id = cs.teacher_id
  order by s2.created_at desc
  limit 1
) s on true
where cs.scope = 'teacher_overall' and cs.context = 'all'
order by cs.rank asc;

-- Branch overall view
create or replace view api_v1.vw_leaderboard_branch_overall_all as
select
  b.id as branch_id,
  b.name as branch_name,
  cs.score,
  cs.rank,
  coalesce(cs.updated_at, now()) as updated_at,
  (cs.rank - s.rank) as delta_rank,
  (cs.score - s.score) as delta_score,
  case cs.rank
    when 1 then 'Grand Prize'
    when 2 then 'Prize 2'
    when 3 then 'Prize 3'
    when 4 then 'Prize 4'
    when 5 then 'Prize 5'
    else null
  end as prize
from public.current_scores cs
join public.branch b on b.id = cs.branch_id
left join lateral (
  select s2.rank, s2.score
  from public.snapshots s2
  where s2.scope = 'branch_overall' and s2.context = 'all' and s2.branch_id = cs.branch_id
  order by s2.created_at desc
  limit 1
) s on true
where cs.scope = 'branch_overall' and cs.context = 'all'
order by cs.rank asc;


