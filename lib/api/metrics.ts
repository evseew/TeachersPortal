export type KpiUpsertRow = {
  teacher_id: string
  last_year_base: number | null
  last_year_returned: number | null
  trial_total: number | null
  trial_converted: number | null
}

export async function batchUpsertMetrics(rows: KpiUpsertRow[], editorEmail?: string) {
  const res = await fetch("/api/metrics/batch-upsert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rows, editorEmail }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error ?? `Failed to upsert metrics (${res.status})`)
  }
  return (await res.json()) as { affected: number }
}


