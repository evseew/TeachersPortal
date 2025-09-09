-- Fix teacher leaderboard view: source of truth is profiles, LEFT JOIN current_scores

create schema if not exists api_v1;

create or replace view api_v1.vw_leaderboard_teacher_overall_all as
select
  p.user_id as teacher_id,
  coalesce(p.full_name, p.email) as name,
  p.category,
  b.id as branch_id,
  b.name as branch_name,
  tm.return_pct,
  tm.trial_pct,
  coalesce(cs.score, 0) as score,
  coalesce(cs.rank, 999) as rank,
  coalesce(cs.updated_at, now()) as updated_at,
  case 
    when cs.rank is not null and s.rank is not null then (cs.rank - s.rank)
    else null
  end as delta_rank,
  case 
    when cs.score is not null and s.score is not null then (cs.score - s.score)
    else null
  end as delta_score,
  null::text as prize
from public.profiles p
left join public.teacher_metrics tm on tm.teacher_id = p.user_id
left join public.branch b on b.id = tm.branch_id
left join public.current_scores cs on cs.teacher_id = p.user_id 
  and cs.scope = 'teacher_overall' 
  and cs.context = 'all'
left join lateral (
  select s2.rank, s2.score
  from public.snapshots s2
  where s2.scope = 'teacher_overall' and s2.context = 'all' and s2.teacher_id = p.user_id
  order by s2.created_at desc
  limit 1
) s on true
where p.role = 'Teacher'
order by 
  case when cs.rank is null then 1 else 0 end,
  coalesce(cs.rank, 999) asc;

comment on view api_v1.vw_leaderboard_teacher_overall_all is 'Отображает всех преподавателей из profiles с их рейтингами (если есть). Источник истины — profiles.';


