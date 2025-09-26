"use client"

import { BranchLeaderboard } from "../components/branch-leaderboard"

/**
 * Страница полного рейтинга филиалов
 * 
 * Отображает детальную таблицу всех филиалов
 * с поиском и полной статистикой
 */
export function BranchLeaderboardPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Branch Leaderboard</h1>
        <p className="text-muted-foreground">
          Complete ranking of all branches for September 2024 with prizes for top performers
        </p>
      </div>

      <BranchLeaderboard />
    </div>
  )
}
