"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Check, Save, Edit3 } from "lucide-react"
import { batchUpsertMetrics } from "@/lib/clients/metrics.client"
import type { KpiUpsertRow } from "@/lib/types/shared"
import { useToast } from "@/hooks/use-toast"

// Моки удалены. Данные грузим из /api/system/users + /api/metrics.

export function MassKpiInput() {
  const [kpis, setKpis] = useState<any[]>([])
  const [savedRows, setSavedRows] = useState<Set<string>>(new Set())
  const [selectedBranch, setSelectedBranch] = useState<string>("all")
  const { toast } = useToast()
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)

  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false
    const load = async () => {
      try {
        setLoading(true)
        // 1) Пользователи
        const usersRes = await fetch("/api/system/users", { cache: "no-store" })
        if (!usersRes.ok) throw new Error("Failed to load users")
        const users = (await usersRes.json()) as Array<any>
        const teachers = users.filter((u) => (u.role ?? "").toLowerCase().includes("teacher"))

        // 2) Метрики
        const metricsRes = await fetch("/api/metrics", { cache: "no-store" })
        if (!metricsRes.ok) throw new Error("Failed to load metrics")
        const metrics = (await metricsRes.json()) as Array<any>
        const mById = new Map<string, any>(metrics.map((m) => [m.teacher_id, m]))

        const rows = teachers.map((t) => {
          const m = mById.get(t.user_id)
          return {
            id: String(t.user_id),
            name: t.full_name ?? t.email,
            branch: t.branch_name ?? "—",
            lastYearBase: m?.last_year_base ?? 0,
            returned: m?.last_year_returned ?? 0,
            trialTotal: m?.trial_total ?? 0,
            trialConverted: m?.trial_converted ?? 0,
          }
        })

        if (!ignore) setKpis(rows)
      } catch (e) {
        if (!ignore) setError((e as Error)?.message ?? "Failed to load")
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    load()
    return () => {
      ignore = true
    }
  }, [])

  const branches = useMemo(() => {
    const set = new Set<string>()
    kpis.forEach((k) => set.add(k.branch ?? "—"))
    return Array.from(set).sort()
  }, [kpis])

  const filteredKpis = selectedBranch === "all" ? kpis : kpis.filter((kpi) => (kpi.branch ?? "—") === selectedBranch)

  const updateKpi = (id: string, field: string, value: string) => {
    const numValue = Number.parseInt(value) || 0
    setKpis((prev) => prev.map((kpi) => (kpi.id === id ? { ...kpi, [field]: numValue } : kpi)))
    setSavedRows((prev) => {
      const newSet = new Set(prev)
      newSet.delete(id)
      return newSet
    })
    // авто-сохранение с дебаунсом
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      void persistChanges([id])
    }, 400)
  }

  async function persistChanges(ids: string[]) {
    const rows: KpiUpsertRow[] = kpis
      .filter((k) => ids.includes(k.id))
      .map((k) => ({
        teacher_id: String(k.id),
        last_year_base: k.lastYearBase ?? null,
        last_year_returned: k.returned ?? null,
        trial_total: k.trialTotal ?? null,
        trial_converted: k.trialConverted ?? null,
      }))
    if (rows.length === 0) return
    try {
      const res = await batchUpsertMetrics(rows)
      toast({ title: "Saved", description: `${res.affected} row(s) updated` })
      setSavedRows((prev) => {
        const s = new Set(prev)
        ids.forEach((id) => s.add(String(id)))
        return s
      })
      setTimeout(() => {
        setSavedRows((prev) => {
          const s = new Set(prev)
          ids.forEach((id) => s.delete(String(id)))
          return s
        })
      }, 1500)
    } catch (e: any) {
      toast({ title: "Error", description: String(e?.message ?? e), variant: "destructive" as any })
    }
  }

  const saveRow = (id: string) => {
    void persistChanges([id])
  }

  const calculateReturnRate = (returned: number, base: number) => {
    return base > 0 ? Math.round((returned / base) * 100) : 0
  }

  const calculateTrialRate = (converted: number, total: number) => {
    return total > 0 ? Math.round((converted / total) * 100) : 0
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center space-x-2">
        <Edit3 className="h-6 w-6 text-[#A4C736]" />
        <h1 className="text-3xl font-bold text-foreground">Mass KPI Input</h1>
        <Badge variant="secondary">Admin/Senior Only</Badge>
      </div>
      <p className="text-muted-foreground">
        Edit teacher performance metrics and KPI data. Changes are auto-saved after editing.
      </p>

      {loading && <div className="text-sm text-muted-foreground">Loading...</div>}
      {error && <div className="text-sm text-red-500">Error: {error}</div>}

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <label htmlFor="branch-filter" className="text-sm font-medium">
            Filter by Branch:
          </label>
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select branch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches.map((branch) => (
                <SelectItem key={branch} value={branch}>
                  {branch}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground">
          Showing {filteredKpis.length} of {kpis.length} teachers
        </div>
      </div>

      <Card className="border border-border shadow-sm">
        <CardHeader className="border-b border-border">
          <CardTitle>Teacher Performance Data</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-muted/50">
                <tr className="border-b-2 border-border hover:bg-muted/30 transition-colors">
                  <th className="text-left py-4 px-4 font-semibold text-foreground border-r border-border/50">
                    Teacher
                  </th>
                  <th className="text-left py-4 px-4 font-semibold text-foreground border-r border-border/50">
                    Branch
                  </th>
                  <th className="text-left py-4 px-4 font-semibold text-foreground border-r border-border/50">
                    Last Year Base
                  </th>
                  <th className="text-left py-4 px-4 font-semibold text-foreground border-r border-border/50">
                    Returned
                  </th>
                  <th className="text-left py-4 px-4 font-semibold text-foreground border-r border-border/50">
                    Return %
                  </th>
                  <th className="text-left py-4 px-4 font-semibold text-foreground border-r border-border/50">
                    Trial Total
                  </th>
                  <th className="text-left py-4 px-4 font-semibold text-foreground border-r border-border/50">
                    Trial Converted
                  </th>
                  <th className="text-left py-4 px-4 font-semibold text-foreground border-r border-border/50">
                    Trial %
                  </th>
                  <th className="text-left py-4 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredKpis.map((kpi, index) => (
                  <tr
                    key={kpi.id}
                    className={`border-b border-border hover:bg-muted/30 transition-colors ${index % 2 === 0 ? "bg-muted/10" : "bg-background"}`}
                  >
                    <td className="py-4 px-4 font-medium border-r border-border/30">{kpi.name}</td>
                    <td className="py-4 px-4 border-r border-border/30">
                      <Badge variant="outline">{kpi.branch}</Badge>
                    </td>
                    <td className="py-4 px-4 border-r border-border/30">
                      <Input
                        type="number"
                        value={kpi.lastYearBase ?? 0}
                        onChange={(e) => updateKpi(kpi.id, "lastYearBase", e.target.value)}
                        className="w-20 h-8 border-input"
                      />
                    </td>
                    <td className="py-4 px-4 border-r border-border/30">
                      <Input
                        type="number"
                        value={kpi.returned ?? 0}
                        onChange={(e) => updateKpi(kpi.id, "returned", e.target.value)}
                        className="w-20 h-8 border-input"
                      />
                    </td>
                    <td className="py-4 px-4 border-r border-border/30">
                      <span className="font-semibold text-[#7A9B28]">
                        {calculateReturnRate(kpi.returned ?? 0, kpi.lastYearBase ?? 0)}%
                      </span>
                    </td>
                    <td className="py-4 px-4 border-r border-border/30">
                      <Input
                        type="number"
                        value={kpi.trialTotal ?? 0}
                        onChange={(e) => updateKpi(kpi.id, "trialTotal", e.target.value)}
                        className="w-20 h-8 border-input"
                      />
                    </td>
                    <td className="py-4 px-4 border-r border-border/30">
                      <Input
                        type="number"
                        value={kpi.trialConverted ?? 0}
                        onChange={(e) => updateKpi(kpi.id, "trialConverted", e.target.value)}
                        className="w-20 h-8 border-input"
                      />
                    </td>
                    <td className="py-4 px-4 border-r border-border/30">
                      <span className="font-semibold text-[#7A9B28]">
                        {calculateTrialRate(kpi.trialConverted ?? 0, kpi.trialTotal ?? 0)}%
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => saveRow(kpi.id)}
                        className="h-8 w-8 p-0 border border-border/50 hover:border-border"
                      >
                        {savedRows.has(String(kpi.id)) ? (
                          <Check className="h-4 w-4 text-[#7A9B28]" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}

export { MassKpiInput as MassKPIInput }
