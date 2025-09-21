"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { ArrowUp, ArrowDown, Minus, GraduationCap, Search, ChevronLeft, ChevronRight } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { fetchTeacherLeaderboard } from "@/lib/clients/leaderboard.client"
import type { TeacherLeaderboardRow } from "@/lib/types/shared"
// Мок-данные удалены. Источник — API /api/leaderboard.

function DeltaArrow({ delta }: { delta: number }) {
  if (delta === 0) {
    return (
      <div className="flex items-center space-x-1 text-muted-foreground">
        <Minus className="h-4 w-4" />
        <span className="text-sm font-medium">0</span>
      </div>
    )
  }

  const isPositive = delta > 0
  return (
    <div className={`flex items-center space-x-1 ${isPositive ? "text-[#7A9B28]" : "text-red-500"}`}>
      {isPositive ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
      <span className="text-sm font-medium">{Math.abs(delta)}</span>
    </div>
  )
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

interface TeacherLeaderboardProps {
  showOnlyCards?: boolean
}

export function TeacherLeaderboard({ showOnlyCards = false }: TeacherLeaderboardProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCategory, setFilterCategory] = useState("all")
  const [filterBranch, setFilterBranch] = useState("all")
  const [sortBy, setSortBy] = useState("rank")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  const [rows, setRows] = useState<TeacherLeaderboardRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(false)

  useEffect(() => {
    let ignore = false
    const load = async () => {
      try {
        setLoading(true)
        const data = await fetchTeacherLeaderboard()
        if (!ignore) setRows(data)
      } catch (e) {
        console.warn("Teacher leaderboard API unavailable")
        if (!ignore) {
          setError((e as Error)?.message ?? "Failed to load")
          setRows([])
        }
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    load()
    return () => {
      ignore = true
    }
  }, [])

  const handleTeacherClick = (teacher: TeacherLeaderboardRow) => {
    router.push(`/teacher/${teacher.teacher_id}`)
  }

  const source = rows ?? []

  const filteredTeachers = source
    .filter((teacher) => {
      const matchesSearch = teacher.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = filterCategory === "all" || teacher.category === filterCategory
      const matchesBranch = filterBranch === "all" || (teacher.branch_name ?? "") === filterBranch
      return matchesSearch && matchesCategory && matchesBranch
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "score":
          return Number(b.score) - Number(a.score)
        case "name":
          return a.name.localeCompare(b.name)
        case "delta":
          return Number(b.delta_score ?? 0) - Number(a.delta_score ?? 0)
        case "category":
          return a.category.localeCompare(b.category)
        case "branch":
          return (a.branch_name ?? "").localeCompare(b.branch_name ?? "")
        default:
          return Number(a.rank) - Number(b.rank)
      }
    })

  const totalPages = Math.ceil(filteredTeachers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedTeachers = filteredTeachers.slice(startIndex, endIndex)

  const handleFilterChange = (setter: (value: string) => void) => (value: string) => {
    setter(value)
    setCurrentPage(1)
  }

  if (showOnlyCards) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
        {loading ? Array.from({ length: 12 }).map((_, i) => (
          <Card key={`skeleton-${i}`} className={`border-2 border-muted`}>
            <CardContent className="p-4">
              <div className="h-24 animate-pulse bg-muted rounded" />
            </CardContent>
          </Card>
        )) : source.slice(0, 12).map((teacher) => (
          <Card
            key={teacher.rank}
            className={`hover:shadow-xl transition-shadow cursor-pointer border-2 border-muted`}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-10 h-10 rounded-full bg-[#7A9B28]/10 flex items-center justify-center">
                    <GraduationCap className="h-6 w-6 text-[#7A9B28]" />
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-muted-foreground">#{Number(teacher.rank)}</div>
                </div>
              </div>

              <h3
                className="font-semibold text-foreground mb-2 text-sm cursor-pointer hover:text-[#7A9B28] transition-colors"
                onClick={() => handleTeacherClick(teacher)}
              >
                {teacher.name}
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold text-foreground">{Number(teacher.score)}</div>
                  <DeltaArrow delta={Number(teacher.delta_score ?? 0)} />
                </div>

                <div className="flex flex-wrap gap-1">
                  <Badge className={getCategoryColor(teacher.category)}>{teacher.category}</Badge>
                  <Badge variant="outline" className="text-xs">
                    {teacher.branch_name ?? ""}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center space-x-2">
        <GraduationCap className="h-6 w-6 text-[#7A9B28]" />
        <h2 className="text-2xl font-bold text-foreground">All Teachers</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search teachers..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            className="pl-10"
          />
        </div>
        <Select value={filterCategory} onValueChange={handleFilterChange(setFilterCategory)}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by category..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="Senior">Senior</SelectItem>
            <SelectItem value="Middle">Middle</SelectItem>
            <SelectItem value="Junior">Junior</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterBranch} onValueChange={handleFilterChange(setFilterBranch)}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by branch..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Branches</SelectItem>
            <SelectItem value="Центральный">Центральный</SelectItem>
            <SelectItem value="Северный">Северный</SelectItem>
            <SelectItem value="Восточный">Восточный</SelectItem>
            <SelectItem value="Западный">Западный</SelectItem>
            <SelectItem value="Южный">Южный</SelectItem>
            <SelectItem value="Приморский">Приморский</SelectItem>
            <SelectItem value="Горный">Горный</SelectItem>
            <SelectItem value="Речной">Речной</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={handleFilterChange(setSortBy)}>
          <SelectTrigger>
            <SelectValue placeholder="Sort by..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="rank">Sort by Rank</SelectItem>
            <SelectItem value="score">Sort by Score</SelectItem>
            <SelectItem value="name">Sort by Name</SelectItem>
            <SelectItem value="delta">Sort by Delta</SelectItem>
            <SelectItem value="category">Sort by Category</SelectItem>
            <SelectItem value="branch">Sort by Branch</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-2 border-muted shadow-lg">
        <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/30">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span>Teacher Rankings</span>
              <Badge variant="outline" className="text-xs">
                {filteredTeachers.length} teachers
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Rank</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Teacher</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Score</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Category</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Branch</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Prize</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr className="border-b border-border/50">
                    <td colSpan={6} className="py-8 px-4 text-center text-muted-foreground">
                      Loading...
                    </td>
                  </tr>
                )}
                {!loading && paginatedTeachers.length === 0 && (
                  <tr className="border-b border-border/50">
                    <td colSpan={6} className="py-8 px-4 text-center text-muted-foreground">
                      {error ? `Error: ${error}` : "No data"}
                    </td>
                  </tr>
                )}
                {!loading && paginatedTeachers.map((teacher) => (
                  <tr
                    key={teacher.rank}
                    className="border-b border-border/50 hover:bg-gradient-to-r hover:from-[#7A9B28]/5 hover:to-transparent transition-colors"
                  >
                    <td className="py-4 px-4">
                      <div className="text-lg font-bold text-muted-foreground">#{Number(teacher.rank)}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-[#7A9B28]/10 flex items-center justify-center flex-shrink-0">
                          <GraduationCap className="h-4 w-4 text-[#7A9B28]" />
                        </div>
                        <span
                          className="font-semibold text-foreground text-lg cursor-pointer hover:text-[#7A9B28] transition-colors"
                          onClick={() => handleTeacherClick(teacher)}
                        >
                          {teacher.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        <div className="text-lg font-bold text-foreground">{Number(teacher.score)}</div>
                        <DeltaArrow delta={Number(teacher.delta_score ?? 0)} />
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <Badge className={getCategoryColor(teacher.category)}>{teacher.category}</Badge>
                    </td>
                    <td className="py-4 px-4">
                      <Badge variant="outline" className="text-xs">
                        {teacher.branch_name ?? ""}
                      </Badge>
                    </td>
                    <td className="py-4 px-4">
                      {Number(teacher.rank) <= 2 ? (
                        <Badge className="bg-blue-600 text-white">iPad</Badge>
                      ) : Number(teacher.rank) <= 12 ? (
                        <Badge className="bg-[#7A9B28] text-white">Tablet PC</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">No prize</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-4 border-t border-border">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredTeachers.length)} of {filteredTeachers.length}{" "}
                teachers
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
