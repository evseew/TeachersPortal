"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trophy, TrendingUp, TrendingDown, Sparkles, Search, Monitor, Coffee, Banknote } from "lucide-react"
import { useEffect, useState } from "react"
import { fetchBranchLeaderboard } from "@/lib/clients/leaderboard.client"
import type { BranchLeaderboardRow } from "@/lib/types/shared"
// Мок-данные удалены. Источник — API /api/leaderboard.

function getRankIcon(rank: number) {
  let bgGradient = ""
  let sparkles = false
  
  switch (rank) {
    case 1:
      bgGradient = "from-yellow-400 to-yellow-600" // Золото
      sparkles = true
      break
    case 2:
      bgGradient = "from-gray-300 to-gray-500" // Серебро
      break
    case 3:
      bgGradient = "from-amber-600 to-amber-800" // Бронза
      break
    default:
      bgGradient = "from-slate-400 to-slate-600" // Обычное место
  }
  
  return (
    <div className="relative">
      <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${bgGradient} flex items-center justify-center shadow-lg`}>
        <Trophy className="h-6 w-6 text-white" />
      </div>
      {sparkles && <Sparkles className="h-4 w-4 text-yellow-400 absolute -top-1 -right-1 animate-pulse" />}
    </div>
  )
}

function DeltaArrow({ delta }: { delta: number }) {
  const isPositive = delta > 0
  const isZero = delta === 0
  
  if (isZero) {
    return (
      <span className="text-xs text-muted-foreground font-medium">
        0.0
      </span>
    )
  }
  
  return (
    <div
      className={`flex items-center space-x-1 text-xs font-medium ${
        isPositive
          ? "text-green-600 dark:text-green-400"
          : "text-red-600 dark:text-red-400"
      }`}
    >
      {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      <span>{Math.abs(delta).toFixed(1)}</span>
    </div>
  )
}

function getCardStyling(rank: number) {
  switch (rank) {
    case 1:
      return "bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200 dark:from-yellow-950/20 dark:to-amber-950/20 dark:border-yellow-800/50 shadow-lg shadow-yellow-200/50 dark:shadow-yellow-900/20"
    case 2:
      return "bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200 dark:from-gray-950/20 dark:to-slate-950/20 dark:border-gray-800/50 shadow-lg shadow-gray-200/50 dark:shadow-gray-900/20"
    case 3:
      return "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 dark:from-amber-950/20 dark:to-orange-950/20 dark:border-amber-800/50 shadow-lg shadow-amber-200/50 dark:shadow-amber-900/20"
    default:
      return "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 dark:from-green-950/20 dark:to-emerald-950/20 dark:border-green-800/50 shadow-lg shadow-green-200/50 dark:shadow-green-900/20"
  }
}

function getPrizeIcon(rank: number) {
  switch (rank) {
    case 1:
      return <Monitor className="h-8 w-8 text-blue-600" />
    case 2:
    case 3:
      return <Coffee className="h-8 w-8 text-amber-600" />
    case 4:
    case 5:
      return <Banknote className="h-8 w-8 text-green-600" />
    default:
      return null
  }
}

interface BranchLeaderboardProps {
  showOnlyCards?: boolean
}

export function BranchLeaderboard({ showOnlyCards = false }: BranchLeaderboardProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("rank")
  const [rows, setRows] = useState<BranchLeaderboardRow[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false
    const load = async () => {
      try {
        setLoading(true)
        const data = await fetchBranchLeaderboard()
        if (!ignore) setRows(data)
      } catch (e) {
        console.error("Failed to load branch leaderboard", e)
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

  const displayRows = rows ?? []

  const filteredBranches = displayRows
    .filter((branch) => branch.branch_name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      switch (sortBy) {
        case "score":
          return Number(b.score) - Number(a.score)
        case "name":
          return a.branch_name.localeCompare(b.branch_name)
        case "delta":
          return Number(b.delta_score ?? 0) - Number(a.delta_score ?? 0)
        default:
          return Number(a.rank) - Number(b.rank)
      }
    })

  if (showOnlyCards) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={`skeleton-${i}`} className={`hover:scale-105 hover:-translate-y-1 transition-all duration-300 cursor-pointer border-2`}>
              <CardHeader className="pb-2">
                <div className="h-28 animate-pulse bg-muted rounded" />
              </CardHeader>
            </Card>
          ))
        ) : (
          displayRows.slice(0, 5).map((branch: any) => (
            <Card
            key={(branch.rank ?? 0) as number}
            className={`hover:scale-105 hover:-translate-y-1 transition-all duration-300 cursor-pointer border-2 ${getCardStyling(Number(branch.rank))}`}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                {getRankIcon(Number(branch.rank))}
                <Badge
                  variant="secondary"
                  className={`text-xs font-semibold ${
                    Number(branch.rank) <= 3
                      ? "bg-white/80 text-gray-800 dark:bg-gray-800/80 dark:text-white"
                      : "bg-white text-[#7A9B28] border border-[#A4C736]/30 dark:bg-gray-800 dark:text-[#A4C736]"
                  }`}
                >
                  #{Number(branch.rank)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <h3 className="font-bold text-lg text-foreground">{branch.branch_name}</h3>

              <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3 border border-white/20">
                <div className="flex items-center space-x-3 mb-2">
                  {getPrizeIcon(Number(branch.rank))}
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{branch.prize}</p>
                    <p className="text-xs text-muted-foreground">Prize</p>
                  </div>
                </div>
                <div className="flex items-center justify-center h-20 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-md border border-gray-200 dark:border-gray-600">
                  {Number(branch.rank) === 1 && (
                    <img
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/interactive-display-KRMU5BhAMPQzJ2DE6yAchluZ5XCkzW.png"
                      alt="Interactive Display"
                      className="h-16 w-16 object-contain"
                    />
                  )}
                  {(Number(branch.rank) === 2 || Number(branch.rank) === 3) && (
                    <img
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/coffee-machine-UCVH6mj1RvihthjwF5eaTJjt0wQa20.png"
                      alt="Coffee Machine"
                      className="h-16 w-16 object-contain"
                    />
                  )}
                  {(Number(branch.rank) === 4 || Number(branch.rank) === 5) && (
                    <img
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/money-kC8Gze9OyIKMDB4CK4hDWJfcBrBH4i.png"
                      alt="Money Prize"
                      className="h-16 w-16 object-contain"
                    />
                  )}
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center space-x-3">
                  <div className="text-lg font-bold text-foreground">{Number(branch.score) || 0}</div>
                  <DeltaArrow delta={Number(branch.delta_score ?? 0)} />
                </div>
              </div>
            </CardContent>
            </Card>
          ))
        )}
      </div>
    )
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center space-x-2">
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#A4C736] to-[#8BB32A] flex items-center justify-center">
          <Trophy className="h-5 w-5 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">All Branches</h2>
        <Trophy className="h-5 w-5 text-[#A4C736] animate-pulse" />
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search branches..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Sort by..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="rank">Sort by Rank</SelectItem>
            <SelectItem value="score">Sort by Score</SelectItem>
            <SelectItem value="name">Sort by Name</SelectItem>
            <SelectItem value="delta">Sort by Delta</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-2 border-muted shadow-lg">
        <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/30">
          <CardTitle className="flex items-center space-x-2">
            <span>Branch Rankings</span>
            <Badge variant="outline" className="text-xs">
              {filteredBranches.length} branches
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground w-16">Rank</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground w-48">Branch</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground w-20">Score</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground w-16">Delta</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Prize</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr className="border-b border-border/50">
                    <td colSpan={5} className="py-8 px-4 text-center text-muted-foreground">Loading...</td>
                  </tr>
                )}
                {!loading && filteredBranches.length === 0 && (
                  <tr className="border-b border-border/50">
                    <td colSpan={5} className="py-8 px-4 text-center text-muted-foreground">
                      {error ? `Error: ${error}` : "No data"}
                    </td>
                  </tr>
                )}
                {filteredBranches.map((branch) => (
                  <tr
                    key={branch.rank}
                    className="border-b border-border/50 hover:bg-gradient-to-r hover:from-[#A4C736]/5 hover:to-transparent transition-colors"
                  >
                    <td className="py-4 px-4">{getRankIcon(branch.rank)}</td>
                    <td className="py-4 px-4 font-semibold text-foreground text-lg">{branch.branch_name}</td>
                    <td className="py-4 px-4">
                      <div className="text-lg font-bold text-foreground">{Number(branch.score) || 0}</div>
                    </td>
                    <td className="py-4 px-4">
                      <DeltaArrow delta={Number(branch.delta_score ?? 0)} />
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        {"prize" in branch ? (
                          <Badge variant="secondary" className="bg-[#A4C736]/20 text-[#A4C736]">
                            {branch.prize}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                        <div className="ml-2">
                          {branch.rank === 1 && (
                            <img
                              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/interactive-display-KRMU5BhAMPQzJ2DE6yAchluZ5XCkzW.png"
                              alt="Interactive Display"
                              className="h-8 w-8 object-contain"
                            />
                          )}
                          {(branch.rank === 2 || branch.rank === 3) && (
                            <img
                              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/coffee-machine-UCVH6mj1RvihthjwF5eaTJjt0wQa20.png"
                              alt="Coffee Machine"
                              className="h-8 w-8 object-contain"
                            />
                          )}
                          {(branch.rank === 4 || branch.rank === 5) && (
                            <img
                              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/money-kC8Gze9OyIKMDB4CK4hDWJfcBrBH4i.png"
                              alt="Money Prize"
                              className="h-8 w-8 object-contain"
                            />
                          )}
                        </div>
                      </div>
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
