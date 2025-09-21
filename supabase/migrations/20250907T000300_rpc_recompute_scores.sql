  -- PRD v1 — recompute_current_scores: считает ранги и дельты, пишет снапшоты

  create or replace function public.recompute_current_scores()
  returns void
  language plpgsql
  security definer
  as $$
  begin
    -- Teacher overall: ранжирование по score и upsert без SELECT в конце
    insert into public.current_scores (scope, context, teacher_id, branch_id, score, rank)
    select 'teacher_overall', 'all', r.teacher_id, r.branch_id, coalesce(r.score,0), r.rnk
    from (
      select tm.teacher_id,
            tm.branch_id,
            tm.score,
            dense_rank() over (order by tm.score desc nulls last) as rnk
      from public.teacher_metrics tm
    ) as r
    on conflict (scope, context, teacher_id, branch_id) do update
      set score = excluded.score,
          rank  = excluded.rank,
          updated_at = now();

    -- Branch overall: взвешенный по весам и upsert без SELECT в конце
    insert into public.current_scores (scope, context, teacher_id, branch_id, score, rank)
    select 'branch_overall', 'all', null, r.branch_id, coalesce(r.score,0), r.rnk
    from (
      select a.branch_id,
            case when a.weight_sum > 0 then round(a.weighted_score_sum / a.weight_sum, 2) else 0 end as score,
            dense_rank() over (
              order by (case when a.weight_sum > 0 then round(a.weighted_score_sum / a.weight_sum, 2) else 0 end) desc nulls last
            ) as rnk
      from (
        select tm.branch_id,
              sum((coalesce(tm.last_year_base,0) + coalesce(tm.trial_total,0))::numeric) as weight_sum,
              sum(coalesce(tm.score,0) * (coalesce(tm.last_year_base,0) + coalesce(tm.trial_total,0))) as weighted_score_sum
        from public.teacher_metrics tm
        where tm.branch_id is not null
        group by tm.branch_id
      ) as a
    ) as r
    on conflict (scope, context, teacher_id, branch_id) do update
      set score = excluded.score,
          rank  = excluded.rank,
          updated_at = now();

    -- Сравнение с последним snapshot и запись новых снапшотов при изменениях
    -- Teacher
    with latest as (
      select distinct on (teacher_id) teacher_id, score, rank
      from public.snapshots
      where scope = 'teacher_overall' and context = 'all'
      order by teacher_id, created_at desc
    ),
    diffs as (
      select cs.teacher_id, cs.branch_id, cs.score, cs.rank,
            l.score as prev_score, l.rank as prev_rank
      from public.current_scores cs
      left join latest l on l.teacher_id = cs.teacher_id
      where cs.scope = 'teacher_overall' and cs.context = 'all'
    ),
    changed as (
      select * from diffs where (prev_score is distinct from score) or (prev_rank is distinct from rank)
    )
    insert into public.snapshots(scope, context, teacher_id, branch_id, score, rank)
    select 'teacher_overall','all', teacher_id, branch_id, score, rank
    from changed;

    -- Branch
    with latest as (
      select distinct on (branch_id) branch_id, score, rank
      from public.snapshots
      where scope = 'branch_overall' and context = 'all'
      order by branch_id, created_at desc
    ),
    diffs as (
      select cs.branch_id, cs.score, cs.rank,
            l.score as prev_score, l.rank as prev_rank
      from public.current_scores cs
      left join latest l on l.branch_id = cs.branch_id
      where cs.scope = 'branch_overall' and cs.context = 'all'
    ),
    changed as (
      select * from diffs where (prev_score is distinct from score) or (prev_rank is distinct from rank)
    )
    insert into public.snapshots(scope, context, teacher_id, branch_id, score, rank)
    select 'branch_overall','all', null, branch_id, score, rank
    from changed;
  end;
  $$;

  comment on function public.recompute_current_scores() is 'Пересчитывает current_scores и пишет snapshots при изменениях';


