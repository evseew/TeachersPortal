-- PRD v1 — RPC: metrics_batch_upsert(rows, editor)

-- Тип строки KPI
do $$ begin
  if not exists (select 1 from pg_type where typname = 'kpi_row') then
    create type public.kpi_row as (
      teacher_id uuid,
      last_year_base integer,
      last_year_returned integer,
      trial_total integer,
      trial_converted integer
    );
  end if;
end $$;

create or replace function public.metrics_batch_upsert(
  p_rows jsonb,
  p_editor text
)
returns integer
language plpgsql
security definer
as $$
declare
  v_affected int := 0;
begin
  with src as (
    select *
    from jsonb_to_recordset(p_rows)
      as r(teacher_id uuid,
           last_year_base integer,
           last_year_returned integer,
           trial_total integer,
           trial_converted integer)
  ),
  upserted as (
    insert into public.teacher_metrics as tm (
      teacher_id, last_year_base, last_year_returned, trial_total, trial_converted, updated_by
    )
    select s.teacher_id, s.last_year_base, s.last_year_returned, s.trial_total, s.trial_converted, p_editor
    from src s
    on conflict (teacher_id) do update
      set last_year_base = excluded.last_year_base,
          last_year_returned = excluded.last_year_returned,
          trial_total = excluded.trial_total,
          trial_converted = excluded.trial_converted,
          updated_by = p_editor,
          updated_at = now()
      where (tm.last_year_base is distinct from excluded.last_year_base)
         or (tm.last_year_returned is distinct from excluded.last_year_returned)
         or (tm.trial_total is distinct from excluded.trial_total)
         or (tm.trial_converted is distinct from excluded.trial_converted)
    returning 1
  )
  select count(*) into v_affected from upserted;

  -- Пересчёт текущих рейтингов и снапшотов
  perform public.recompute_current_scores();

  return v_affected;
end;
$$;

comment on function public.metrics_batch_upsert(jsonb, text) is 'Идемпотентный батч-апдейт KPI, вызывает recompute_current_scores()';


