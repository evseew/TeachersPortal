"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import SidebarNav from "@/components/sidebar-nav"
import TopNav from "@/components/top-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowUp, ArrowDown, User } from "lucide-react"

type TeacherApi = {
  teacher_id: string
  name: string
  email: string
  role: string
  category: string | null
  branch_id: string | null
  branch_name?: string | null
  avatar_url?: string | null
  created_at?: string
  rank: number | null
  score: number
  delta_rank: number | null
  delta_score: number | null
  return_pct: number | null
  trial_pct: number | null
  metrics: any | null
  history: Array<{ created_at: string; rank: number; score: number }>
}

function getCategoryColor(category: string) {
  switch (category) {
    case "Senior":
      return "bg-[#7A9B28] text-white"
    case "Middle":
      return "bg-blue-600 text-white"
    case "Junior":
      return "bg-orange-600 text-white"
    default:
      return "bg-muted text-muted-foreground"
  }
}

export default function TeacherDetailPage() {
  const router = useRouter()
  const params = useParams()
  const teacherId = decodeURIComponent(params?.id as string || '')

  const [teacher, setTeacher] = useState<TeacherApi | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false
    const load = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/teacher/${teacherId}`, { cache: "no-store" })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          throw new Error(j?.error ?? `Failed to load teacher ${teacherId}`)
        }
        const data = (await res.json()) as TeacherApi
        if (!ignore) setTeacher(data)
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
  }, [teacherId])

  if (loading) {
    return (
      <div className="flex h-screen bg-background">
        <SidebarNav />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopNav />
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-6">
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          </main>
        </div>
      </div>
    )
  }

  if (error || !teacher) {
    return (
      <div className="flex h-screen bg-background">
        <SidebarNav />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopNav />
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-6">
            <div className="text-center py-12">
              <h1 className="text-2xl font-bold text-foreground mb-4">{error ? "Error" : "Teacher Not Found"}</h1>
              {error && <p className="text-muted-foreground mb-4">{error}</p>}
              <Button onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      <SidebarNav />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNav />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button variant="outline" onClick={() => router.back()}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-[#7A9B28]/10 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-[#7A9B28]" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-foreground">{teacher.name}</h1>
                    <p className="text-muted-foreground flex items-center space-x-2">
                      <span>Teacher Performance Details</span>
                      <span>•</span>
                      <span>{teacher.branch_name ?? ""} Branch</span>
                      <span>•</span>
                      <Badge className={getCategoryColor(teacher.category ?? "")} variant="secondary">
                        {teacher.category ?? "Unknown"}
                      </Badge>
                    </p>
                  </div>
                </div>
              </div>
              <Badge className={getCategoryColor(teacher.category ?? "")} variant="secondary">
                {teacher.category ?? "Unknown"} Teacher
              </Badge>
            </div>

            {/* Stats Cards */}
            {/* Overall Performance Group */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Overall Rank Card */}
              <Card className="lg:col-span-1 border-0 shadow-lg bg-gradient-to-br from-[#7A9B28]/10 via-white to-white">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-[#7A9B28] rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-white">#{teacher.rank ?? "-"}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">Overall Rank</h3>
                  <p className="text-sm text-muted-foreground">overall</p>
                </CardContent>
              </Card>

              {/* Performance Score Card */}
              <Card className="lg:col-span-1 border-0 shadow-lg bg-gradient-to-br from-blue-50 via-white to-white">
                <CardContent className="p-6 text-center">
                  <div className="mb-4">
                    <div className="text-3xl font-bold text-foreground mb-2">{Number(teacher.score)}</div>
                    <div
                      className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium ${
                        (teacher.delta_score ?? 0) > 0 ? "bg-[#7A9B28]/10 text-[#7A9B28]" : "bg-red-500/10 text-red-500"
                      }`}
                    >
                      {(teacher.delta_score ?? 0) > 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                      <span>{Math.abs(Number(teacher.delta_score ?? 0))}</span>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">Performance Score</h3>
                  <p className="text-sm text-muted-foreground">monthly change</p>
                </CardContent>
              </Card>

              {/* Category Rank Card */}
              <Card className="lg:col-span-1 border-0 shadow-lg bg-gradient-to-br from-purple-50 via-white to-white">
                <CardContent className="p-6 text-center">
                  <div className="mb-4">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <span className="text-3xl font-bold text-foreground">#{teacher.rank ?? "-"}</span>
                      <div
                        className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                          (teacher.delta_rank ?? 0) < 0 ? "bg-[#7A9B28]/10 text-[#7A9B28]" : "bg-red-500/10 text-red-500"
                        }`}
                      >
                        {(teacher.delta_rank ?? 0) < 0 ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        )}
                        <span>{Math.abs(Number(teacher.delta_rank ?? 0))}</span>
                      </div>
                    </div>
                    <Badge className={getCategoryColor(teacher.category ?? "")} variant="secondary">
                      {teacher.category ?? "Unknown"}
                    </Badge>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">Category Rank</h3>
                  <p className="text-sm text-muted-foreground">in category</p>
                </CardContent>
              </Card>

              {/* Branch Rank Card */}
              <Card className="lg:col-span-1 border-0 shadow-lg bg-gradient-to-br from-orange-50 via-white to-white">
                <CardContent className="p-6 text-center">
                  <div className="mb-4">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <span className="text-3xl font-bold text-foreground">#{teacher.rank ?? "-"}</span>
                      <div
                        className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                          (teacher.delta_rank ?? 0) < 0 ? "bg-[#7A9B28]/10 text-[#7A9B28]" : "bg-red-500/10 text-red-500"
                        }`}
                      >
                        {(teacher.delta_rank ?? 0) < 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                        <span>{Math.abs(Number(teacher.delta_rank ?? 0))}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {teacher.branch_name ?? ""}
                    </Badge>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">Branch Rank</h3>
                  <p className="text-sm text-muted-foreground">in branch</p>
                </CardContent>
              </Card>
            </div>

            {/* KPI History (snapshots) */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Recent snapshots</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {teacher.history && teacher.history.length > 0 ? (
                  <div className="overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Date</th>
                          <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Rank</th>
                          <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teacher.history.map((h, index) => (
                          <tr key={index} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-3 text-sm text-muted-foreground">{new Date(h.created_at).toLocaleString()}</td>
                            <td className="py-3 px-3 text-sm font-medium text-foreground">#{h.rank}</td>
                            <td className="py-3 px-3 text-sm font-medium text-foreground">{Number(h.score)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-muted-foreground p-4">No history yet</div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
