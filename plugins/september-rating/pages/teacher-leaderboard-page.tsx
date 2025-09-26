"use client"

import { TeacherLeaderboard } from "../components/teacher-leaderboard"

/**
 * Страница полного рейтинга преподавателей
 * 
 * Отображает детальную таблицу всех преподавателей
 * с поиском, фильтрацией и пагинацией
 */
export function TeacherLeaderboardPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Teacher Leaderboard</h1>
        <p className="text-muted-foreground">
          Complete teacher performance rankings for September 2024 with grouping by student count
        </p>
      </div>

      <TeacherLeaderboard />
    </div>
  )
}
