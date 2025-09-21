"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, Filter, TrendingUp, TrendingDown } from "lucide-react"

const allTeachers = [
  {
    rank: 1,
    name: "Иванова Мария Петровна",
    branch: "Центральный",
    category: "Senior",
    returnRate: 95,
    trialRate: 87,
    score: 98.5,
    delta: 12,
  },
  {
    rank: 2,
    name: "Петров Алексей Владимирович",
    branch: "Северный",
    category: "Senior",
    returnRate: 92,
    trialRate: 84,
    score: 96.2,
    delta: 8,
  },
  {
    rank: 3,
    name: "Сидорова Елена Ивановна",
    branch: "Восточный",
    category: "Middle",
    returnRate: 89,
    trialRate: 81,
    score: 94.8,
    delta: 5,
  },
  {
    rank: 4,
    name: "Козлов Дмитрий Александрович",
    branch: "Западный",
    category: "Middle",
    returnRate: 88,
    trialRate: 79,
    score: 93.1,
    delta: -2,
  },
  {
    rank: 5,
    name: "Морозова Анна Сергеевна",
    branch: "Южный",
    category: "Junior",
    returnRate: 86,
    trialRate: 78,
    score: 91.7,
    delta: 3,
  },
  {
    rank: 6,
    name: "Волков Игорь Николаевич",
    branch: "Приморский",
    category: "Senior",
    returnRate: 85,
    trialRate: 76,
    score: 90.4,
    delta: 7,
  },
  {
    rank: 7,
    name: "Лебедева Ольга Михайловна",
    branch: "Горный",
    category: "Middle",
    returnRate: 84,
    trialRate: 75,
    score: 89.2,
    delta: -1,
  },
  {
    rank: 8,
    name: "Соколов Павел Романович",
    branch: "Речной",
    category: "Junior",
    returnRate: 83,
    trialRate: 74,
    score: 88.6,
    delta: 4,
  },
]

function DeltaArrow({ delta }: { delta: number }) {
  const isPositive = delta > 0
  return (
    <div className={`flex items-center space-x-1 ${isPositive ? "text-[#A4C736]" : "text-red-500"}`}>
      {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
      <span className="font-semibold">{Math.abs(delta)}</span>
    </div>
  )
}

function getCategoryColor(category: string) {
  switch (category) {
    case "Senior":
      return "bg-[#A4C736] text-white"
    case "Middle":
      return "bg-blue-500 text-white"
    case "Junior":
      return "bg-orange-500 text-white"
    default:
      return "bg-muted text-muted-foreground"
  }
}

export function TeacherTable() {
  const [searchTerm, setSearchTerm] = useState("")
  const [branchFilter, setBranchFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")

  const filteredTeachers = allTeachers.filter((teacher) => {
    const matchesSearch = teacher.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesBranch = branchFilter === "all" || teacher.branch === branchFilter
    const matchesCategory = categoryFilter === "all" || teacher.category === categoryFilter
    return matchesSearch && matchesBranch && matchesCategory
  })

  const branches = [...new Set(allTeachers.map((t) => t.branch))]
  const categories = [...new Set(allTeachers.map((t) => t.category))]

  return (
    <section className="space-y-6">
      <div className="flex items-center space-x-2">
        <Filter className="h-6 w-6 text-[#A4C736]" />
        <h2 className="text-2xl font-bold text-foreground">Full Teacher Rankings</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Teacher Performance Table</CardTitle>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search teachers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by branch" />
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
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-muted/50">
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Rank</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground sticky left-0 bg-muted/50">
                    Teacher
                  </th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Branch</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Category</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Return%</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Trial%</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Score</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Delta Rank</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeachers.map((teacher, index) => (
                  <tr
                    key={teacher.rank}
                    className={`border-b border-border/50 hover:bg-muted/50 ${index % 2 === 0 ? "bg-muted/20" : ""}`}
                  >
                    <td className="py-3 px-2 font-bold text-[#A4C736]">#{teacher.rank}</td>
                    <td className="py-3 px-2 sticky left-0 bg-inherit">
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={`/teacher-avatar-.jpg?height=32&width=32&query=teacher avatar ${teacher.rank}`}
                          />
                          <AvatarFallback>
                            {teacher.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{teacher.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <Badge variant="outline">{teacher.branch}</Badge>
                    </td>
                    <td className="py-3 px-2">
                      <Badge className={getCategoryColor(teacher.category)}>{teacher.category}</Badge>
                    </td>
                    <td className="py-3 px-2 font-semibold">{teacher.returnRate}%</td>
                    <td className="py-3 px-2 font-semibold">{teacher.trialRate}%</td>
                    <td className="py-3 px-2 font-bold text-[#A4C736]">{teacher.score}</td>
                    <td className="py-3 px-2">
                      <DeltaArrow delta={teacher.delta} />
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
