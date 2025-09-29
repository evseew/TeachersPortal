"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowUp, ArrowDown, Minus, GraduationCap, Search, ChevronLeft, ChevronRight, Trophy, Users, TrendingUp } from "lucide-react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { fetchTeacherLeaderboard } from "@/lib/clients/leaderboard.client"
import type { TeacherLeaderboardRow } from "@/lib/types/shared"
import { filterTeachersForLeaderboard } from "@/lib/constants/teacher-exclusions"

// Расширенный тип для плагина с дополнительными полями из KPI
interface ExtendedTeacherRow extends TeacherLeaderboardRow {
  last_year_base?: number
  last_year_returned?: number
  trial_total?: number
  trial_converted?: number
}
import { TEACHER_GROUPS_CONFIG, getGroupRanges, determineTeacherGroup } from "@/lib/config/september-forms-config"
import type { SeptemberTeacherStats, TeacherGroupType, TeacherGroupRangeConfig as GroupRangeType } from "@/lib/types/september-rating"

/**
 * Компонент рейтинга преподавателей для плагина September Rating
 * 
 * Особенности:
 * - Система групп по количеству студентов: 35+, 16-34, 6-15 (для старичков)
 * - Система групп по количеству БПЗ: 16+, 11-15, 5-10 (для trial)
 * - Эмодзи группы: 🥇🥈🥉
 * - Призы по группам: iPad, HonorPad, Подписка в Tg Premium
 * - Сортировка внутри групп по % (возврата/конверсии)
 * - Поиск и фильтрация по имени, филиалу, категории
 * - Дельты изменений с цветными стрелками
 */

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

// Определяем группу по количеству студентов
function getTeacherGroup(teacher: ExtendedTeacherRow, groupType: TeacherGroupType): string {
  const studentCount = groupType === 'oldies' 
    ? Number(teacher.last_year_base || 0)
    : Number(teacher.trial_total || 0)
    
  return determineTeacherGroup(studentCount, groupType)
}

// Получаем данные группы из конфига
function getGroupData(groupType: TeacherGroupType, groupRange: string): GroupRangeType | null {
  const ranges = getGroupRanges(groupType)
  return ranges.find(range => range.key === groupRange) || null
}

interface TeacherLeaderboardProps {
  showOnlyCards?: boolean
}

export function TeacherLeaderboard({ showOnlyCards = false }: TeacherLeaderboardProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCategory, setFilterCategory] = useState("all")
  const [filterBranch, setFilterBranch] = useState("all")
  const [filterGroup, setFilterGroup] = useState("all")
  const [sortBy, setSortBy] = useState("rank")
  const [currentPage, setCurrentPage] = useState(1)
  const [activeTab, setActiveTab] = useState("oldies")
  const itemsPerPage = 20
  const [rows, setRows] = useState<ExtendedTeacherRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(false)

  useEffect(() => {
    let ignore = false
    const load = async () => {
      try {
        setLoading(true)
        const data = await fetchTeacherLeaderboard()
        // Применяем фильтрацию исключенных преподавателей для рейтинга
        const filteredData = filterTeachersForLeaderboard(data)
        if (!ignore) setRows(filteredData)
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

  const handleTeacherClick = (teacher: ExtendedTeacherRow) => {
    router.push(`/teacher/${teacher.teacher_id}`)
  }

  const source = rows ?? []

  // Группируем преподавателей по типу (oldies/trial) и группе
  const groupedTeachers = (groupType: TeacherGroupType) => {
    const filtered = source
      .filter((teacher) => {
        const matchesSearch = teacher.name.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesCategory = filterCategory === "all" || teacher.category === filterCategory
        const matchesBranch = filterBranch === "all" || (teacher.branch_name ?? "") === filterBranch
        const teacherGroup = getTeacherGroup(teacher, groupType)
        const matchesGroup = filterGroup === "all" || teacherGroup === filterGroup
        
        // Для oldies показываем только тех, у кого есть данные по старичкам
        // Для trial показываем только тех, у кого есть данные по trial
        const hasRelevantData = groupType === 'oldies' 
          ? Number(teacher.last_year_base || 0) > 0 || Number(teacher.last_year_returned || 0) > 0
          : Number(teacher.trial_total || 0) > 0 || Number(teacher.trial_converted || 0) > 0
          
        return matchesSearch && matchesCategory && matchesBranch && matchesGroup && hasRelevantData
      })

    // Группируем по диапазонам
    const groups: Record<string, ExtendedTeacherRow[]> = {}
    
    filtered.forEach(teacher => {
      const group = getTeacherGroup(teacher, groupType)
      if (!groups[group]) groups[group] = []
      groups[group].push(teacher)
    })

    // Сортируем внутри каждой группы
    Object.keys(groups).forEach(groupKey => {
      groups[groupKey].sort((a, b) => {
        if (groupType === 'oldies') {
          // Сортировка по % возврата, при равенстве - по количеству студентов
          const percentA = Number(a.last_year_returned || 0) / Math.max(Number(a.last_year_base || 1), 1) * 100
          const percentB = Number(b.last_year_returned || 0) / Math.max(Number(b.last_year_base || 1), 1) * 100
          
          if (Math.abs(percentA - percentB) < 0.1) {
            return Number(b.last_year_base || 0) - Number(a.last_year_base || 0)
          }
          return percentB - percentA
        } else {
          // Сортировка по % конверсии, при равенстве - по количеству БПЗ студентов
          const percentA = Number(a.trial_converted || 0) / Math.max(Number(a.trial_total || 1), 1) * 100
          const percentB = Number(b.trial_converted || 0) / Math.max(Number(b.trial_total || 1), 1) * 100
          
          if (Math.abs(percentA - percentB) < 0.1) {
            return Number(b.trial_total || 0) - Number(a.trial_total || 0)
          }
          return percentB - percentA
        }
      })
    })

    return groups
  }

  if (showOnlyCards) {
    const displayData = activeTab === 'oldies' ? groupedTeachers('oldies') : groupedTeachers('trial')
    const allTeachers = Object.values(displayData).flat().slice(0, 12)
    
    // Если нет данных, показываем сообщение
    if (!loading && allTeachers.length === 0) {
      return (
        <div className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="oldies" className="flex items-center space-x-2">
                <Trophy className="h-4 w-4" />
                <span>Старички</span>
              </TabsTrigger>
              <TabsTrigger value="trial" className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4" />
                <span>Trial</span>
              </TabsTrigger>
            </TabsList>
            
            <Card className="p-8 text-center">
              <CardContent>
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Нет данных для отображения</h3>
                    <p className="text-muted-foreground">
                      {activeTab === 'oldies' 
                        ? 'Данные по старичкам еще не синхронизированы из Pyrus'
                        : 'Данные по trial студентам еще не синхронизированы из Pyrus'
                      }
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Синхронизация происходит автоматически каждый час
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Tabs>
        </div>
      )
    }
    
    return (
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="oldies" className="flex items-center space-x-2">
              <Trophy className="h-4 w-4" />
              <span>Старички</span>
            </TabsTrigger>
            <TabsTrigger value="trial" className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span>Trial</span>
            </TabsTrigger>
          </TabsList>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4 mt-6">
            {loading ? Array.from({ length: 12 }).map((_, i) => (
              <Card key={`skeleton-${i}`} className="border-2 border-muted">
                <CardContent className="p-4">
                  <div className="h-24 animate-pulse bg-muted rounded" />
                </CardContent>
              </Card>
            )) : allTeachers.map((teacher) => {
              const group = getTeacherGroup(teacher, activeTab as 'oldies' | 'trial')
              const groupData = getGroupData(activeTab as 'oldies' | 'trial', group)
              
              return (
                <Card
                  key={teacher.rank}
                  className="hover:shadow-xl transition-shadow cursor-pointer border-2 border-muted"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-10 h-10 rounded-full bg-[#7A9B28]/10 flex items-center justify-center">
                          <GraduationCap className="h-6 w-6 text-[#7A9B28]" />
                        </div>
                        {groupData && (
                          <span className="text-2xl">{groupData.emoji}</span>
                        )}
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
                          {group} студ.
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {teacher.branch_name ?? ""}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </Tabs>
      </div>
    )
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center space-x-2">
        <GraduationCap className="h-6 w-6 text-[#7A9B28]" />
        <h2 className="text-2xl font-bold text-foreground">All Teachers by Groups</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="oldies" className="flex items-center space-x-2">
            <Trophy className="h-4 w-4" />
            <span>Старички (возврат)</span>
          </TabsTrigger>
          <TabsTrigger value="trial" className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span>Trial (конверсия)</span>
          </TabsTrigger>
        </TabsList>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 my-6">
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
          <Select value={filterCategory} onValueChange={(value) => { setFilterCategory(value); setCurrentPage(1) }}>
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
          <Select value={filterGroup} onValueChange={(value) => { setFilterGroup(value); setCurrentPage(1) }}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by group..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Groups</SelectItem>
              {activeTab === 'oldies' ? (
                <>
                  <SelectItem value="35+">35+ студентов 🥇</SelectItem>
                  <SelectItem value="16-34">16-34 студентов 🥈</SelectItem>
                  <SelectItem value="6-15">6-15 студентов 🥉</SelectItem>
                </>
              ) : (
                <>
                  <SelectItem value="16+">16+ БПЗ 🥇</SelectItem>
                  <SelectItem value="11-15">11-15 БПЗ 🥈</SelectItem>
                  <SelectItem value="5-10">5-10 БПЗ 🥉</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
          <Select value={filterBranch} onValueChange={(value) => { setFilterBranch(value); setCurrentPage(1) }}>
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
          <Select value={sortBy} onValueChange={(value) => { setSortBy(value); setCurrentPage(1) }}>
            <SelectTrigger>
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

        <TabsContent value="oldies" className="space-y-6">
          {Object.entries(groupedTeachers('oldies')).map(([groupRange, teachers]) => {
            const groupData = getGroupData('oldies', groupRange)
            if (!groupData || teachers.length === 0) return null
            
            const totalPages = Math.ceil(teachers.length / itemsPerPage)
            const startIndex = (currentPage - 1) * itemsPerPage
            const paginatedTeachers = teachers.slice(startIndex, startIndex + itemsPerPage)
            
            return (
              <Card key={groupRange} className="border-2 border-muted shadow-lg">
                <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/30">
                  <CardTitle className="flex items-center space-x-3">
                    <span className="text-3xl">{groupData.emoji}</span>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span>{groupRange} студентов</span>
                        <Badge variant="outline" className="text-xs">
                          {teachers.length} преподавателей
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground font-normal mt-1">
                        Сортировка: по % возврата, при равенстве - по количеству студентов
                      </p>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Место</th>
                          <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Преподаватель</th>
                          <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Студенты</th>
                          <th className="text-left py-3 px-4 font-semibold text-muted-foreground">% возврата</th>
                          <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Балл</th>
                          <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Изменение</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading && (
                          <tr>
                            <td colSpan={6} className="py-8 px-4 text-center text-muted-foreground">Loading...</td>
                          </tr>
                        )}
                        {paginatedTeachers.map((teacher, index) => {
                          const returnPercent = Number(teacher.last_year_returned || 0) / Math.max(Number(teacher.last_year_base || 1), 1) * 100
                          
                          return (
                            <tr
                              key={teacher.rank}
                              className="border-b border-border/50 hover:bg-gradient-to-r hover:from-[#A4C736]/5 hover:to-transparent transition-colors cursor-pointer"
                              onClick={() => handleTeacherClick(teacher)}
                            >
                              <td className="py-4 px-4">
                                <div className="flex items-center space-x-2">
                                  <span className="font-bold text-lg">#{startIndex + index + 1}</span>
                                  {startIndex + index < (groupData?.winnersCount || 0) && (
                                    <Trophy className="h-4 w-4 text-yellow-500" />
                                  )}
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <div className="space-y-1">
                                  <div className="font-semibold text-foreground">{teacher.name}</div>
                                  <div className="flex space-x-1">
                                    <Badge className={getCategoryColor(teacher.category)} >
                                      {teacher.category}
                                    </Badge>
                                    <Badge variant="outline" >
                                      {teacher.branch_name}
                                    </Badge>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <div className="text-sm text-muted-foreground">
                                  {teacher.last_year_returned}/{teacher.last_year_base}
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <div className="font-bold text-lg text-foreground">
                                  {returnPercent.toFixed(1)}%
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <div className="font-bold text-lg text-foreground">{Number(teacher.score)}</div>
                              </td>
                              <td className="py-4 px-4">
                                <DeltaArrow delta={Number(teacher.delta_score ?? 0)} />
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-4 border-t">
                      <div className="text-sm text-muted-foreground">
                        Показано {startIndex + 1}-{Math.min(startIndex + itemsPerPage, teachers.length)} из {teachers.length}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <span className="text-sm">
                          {currentPage} / {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
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
            )
          })}
        </TabsContent>

        <TabsContent value="trial" className="space-y-6">
          {Object.entries(groupedTeachers('trial')).map(([groupRange, teachers]) => {
            const groupData = getGroupData('trial', groupRange)
            if (!groupData || teachers.length === 0) return null
            
            const totalPages = Math.ceil(teachers.length / itemsPerPage)
            const startIndex = (currentPage - 1) * itemsPerPage
            const paginatedTeachers = teachers.slice(startIndex, startIndex + itemsPerPage)
            
            return (
              <Card key={groupRange} className="border-2 border-muted shadow-lg">
                <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/30">
                  <CardTitle className="flex items-center space-x-3">
                    <span className="text-3xl">{groupData.emoji}</span>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span>{groupRange} БПЗ студентов</span>
                        <Badge variant="outline" className="text-xs">
                          {teachers.length} преподавателей
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground font-normal mt-1">
                        Сортировка: по % конверсии, при равенстве - по количеству БПЗ студентов
                      </p>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Место</th>
                          <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Преподаватель</th>
                          <th className="text-left py-3 px-4 font-semibold text-muted-foreground">БПЗ студенты</th>
                          <th className="text-left py-3 px-4 font-semibold text-muted-foreground">% конверсии</th>
                          <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Балл</th>
                          <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Изменение</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading && (
                          <tr>
                            <td colSpan={6} className="py-8 px-4 text-center text-muted-foreground">Loading...</td>
                          </tr>
                        )}
                        {paginatedTeachers.map((teacher, index) => {
                          const conversionPercent = Number(teacher.trial_converted || 0) / Math.max(Number(teacher.trial_total || 1), 1) * 100
                          
                          return (
                            <tr
                              key={teacher.rank}
                              className="border-b border-border/50 hover:bg-gradient-to-r hover:from-[#A4C736]/5 hover:to-transparent transition-colors cursor-pointer"
                              onClick={() => handleTeacherClick(teacher)}
                            >
                              <td className="py-4 px-4">
                                <div className="flex items-center space-x-2">
                                  <span className="font-bold text-lg">#{startIndex + index + 1}</span>
                                  {startIndex + index < (groupData?.winnersCount || 0) && (
                                    <Trophy className="h-4 w-4 text-yellow-500" />
                                  )}
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <div className="space-y-1">
                                  <div className="font-semibold text-foreground">{teacher.name}</div>
                                  <div className="flex space-x-1">
                                    <Badge className={getCategoryColor(teacher.category)} >
                                      {teacher.category}
                                    </Badge>
                                    <Badge variant="outline" >
                                      {teacher.branch_name}
                                    </Badge>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <div className="text-sm text-muted-foreground">
                                  {teacher.trial_converted}/{teacher.trial_total}
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <div className="font-bold text-lg text-foreground">
                                  {conversionPercent.toFixed(1)}%
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <div className="font-bold text-lg text-foreground">{Number(teacher.score)}</div>
                              </td>
                              <td className="py-4 px-4">
                                <DeltaArrow delta={Number(teacher.delta_score ?? 0)} />
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-4 border-t">
                      <div className="text-sm text-muted-foreground">
                        Показано {startIndex + 1}-{Math.min(startIndex + itemsPerPage, teachers.length)} из {teachers.length}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <span className="text-sm">
                          {currentPage} / {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
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
            )
          })}
        </TabsContent>
      </Tabs>
    </section>
  )
}
