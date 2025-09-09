"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowUp, ArrowDown, User, Loader2 } from "lucide-react"
import { useRouter, useParams } from "next/navigation"
import SidebarNav from "@/components/sidebar-nav"
import TopNav from "@/components/top-nav"
import { fetchTeacherDetail, type TeacherDetailRow } from "@/lib/api/users"

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
  const teacherId = params.id as string
  
  const [teacher, setTeacher] = useState<TeacherDetailRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false

    const loadTeacher = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await fetchTeacherDetail(teacherId)
        if (!ignore) {
          setTeacher(data)
        }
      } catch (err: any) {
        if (!ignore) {
          setError(err?.message ?? "Failed to load teacher")
          console.error("Error loading teacher:", err)
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    loadTeacher()
    return () => { ignore = true }
  }, [teacherId])

  if (loading) {
    return (
      <div className="flex h-screen bg-background">
        <SidebarNav />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopNav />
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-6">
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-foreground mb-4">Loading Teacher...</h1>
            </div>
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
              <h1 className="text-2xl font-bold text-foreground mb-4">
                {error === "Teacher not found" ? "Teacher Not Found" : "Error Loading Teacher"}
              </h1>
              <p className="text-muted-foreground mb-4">{error}</p>
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
                      <span>{teacher.branch_name || "No Branch"} Branch</span>
                    </p>
                  </div>
                </div>
              </div>
              <Badge className={getCategoryColor(teacher.category || "")} variant="secondary">
                {teacher.category || "Unknown"} Teacher
              </Badge>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Overall Rank Card */}
              <Card className="lg:col-span-1 border-0 shadow-lg bg-gradient-to-br from-[#7A9B28]/10 via-white to-white">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-[#7A9B28] rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-white">#{teacher.rank || "N/A"}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">Overall Rank</h3>
                  <p className="text-sm text-muted-foreground">current ranking</p>
                </CardContent>
              </Card>

              {/* Performance Score Card */}
              <Card className="lg:col-span-1 border-0 shadow-lg bg-gradient-to-br from-blue-50 via-white to-white">
                <CardContent className="p-6 text-center">
                  <div className="mb-4">
                    <div className="text-3xl font-bold text-foreground mb-2">{teacher.score}</div>
                    {teacher.delta_score !== null && (
                      <div
                        className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium ${
                          teacher.delta_score > 0 ? "bg-[#7A9B28]/10 text-[#7A9B28]" : "bg-red-500/10 text-red-500"
                        }`}
                      >
                        {teacher.delta_score > 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                        <span>{Math.abs(teacher.delta_score)}</span>
                      </div>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">Performance Score</h3>
                  <p className="text-sm text-muted-foreground">monthly change</p>
                </CardContent>
              </Card>

              {/* Return Rate Card */}
              <Card className="lg:col-span-1 border-0 shadow-lg bg-gradient-to-br from-purple-50 via-white to-white">
                <CardContent className="p-6 text-center">
                  <div className="mb-4">
                    <div className="text-3xl font-bold text-foreground mb-2">{teacher.return_pct || 0}%</div>
                    <Badge className={getCategoryColor(teacher.category || "")} variant="secondary">
                      {teacher.category || "Unknown"}
                    </Badge>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">Return Rate</h3>
                  <p className="text-sm text-muted-foreground">last year students</p>
                </CardContent>
              </Card>

              {/* Trial Conversion Card */}
              <Card className="lg:col-span-1 border-0 shadow-lg bg-gradient-to-br from-orange-50 via-white to-white">
                <CardContent className="p-6 text-center">
                  <div className="mb-4">
                    <div className="text-3xl font-bold text-foreground mb-2">{teacher.trial_pct || 0}%</div>
                    <Badge variant="outline" className="text-xs">
                      {teacher.branch_name || "No Branch"}
                    </Badge>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">Trial Rate</h3>
                  <p className="text-sm text-muted-foreground">trial conversion</p>
                </CardContent>
              </Card>
            </div>

            {/* KPI History */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">KPI Changes History</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Date</th>
                        <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Field</th>
                        <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Score</th>
                        <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Rank</th>
                        <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teacher.history && teacher.history.length > 0 ? (
                        teacher.history.map((snapshot, index) => (
                          <tr key={index} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-3 text-sm text-muted-foreground">
                              {new Date(snapshot.created_at).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-3 text-sm font-medium text-foreground">Score Update</td>
                            <td className="py-3 px-3">
                              <span className="font-medium text-[#7A9B28]">{snapshot.score}</span>
                            </td>
                            <td className="py-3 px-3">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-500">
                                Rank #{snapshot.rank}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-sm text-muted-foreground">System</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-muted-foreground">
                            No history available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
