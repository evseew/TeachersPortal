-- Fix branch leaderboard view: correct sorting by rank for final result
-- The DISTINCT ON requires ORDER BY to start with the DISTINCT ON columns,
-- but we want the final result sorted by rank

create schema if not exists api_v1;

create or replace view api_v1.vw_leaderboard_branch_overall_all as
select * from (
  select distinct on (b.id)
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
  order by b.id, cs.updated_at desc
) as unique_branches
order by rank asc;

comment on view api_v1.vw_leaderboard_branch_overall_all is 'Отображает уникальные записи для каждого филиала, отсортированные по рангу.';





