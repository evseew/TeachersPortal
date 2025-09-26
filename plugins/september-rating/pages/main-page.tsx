"use client"

import { BranchLeaderboard } from "../components/branch-leaderboard"
import { TeacherLeaderboard } from "../components/teacher-leaderboard"
import { SyncButton } from "../components/sync-button"
import { SyncInfo } from "../components/sync-info"
import { Trophy } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FileText } from "lucide-react"

/**
 * Главная страница плагина September Rating
 * 
 * Отображает hero-секцию с градиентом и интегрирует
 * компоненты BranchLeaderboard и TeacherLeaderboard в режиме карточек
 */
export function SeptemberRatingMainPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Hero Section */}
      <div className="relative p-8 rounded-lg !bg-[#7A9B28] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#7A9B28] to-[#A4C736] opacity-90"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Trophy className="h-8 w-8 text-white" />
              <h1 className="text-3xl font-bold !text-white">September Rating</h1>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Кнопка синхронизации (только для администраторов) */}
              <SyncButton />
              
              {/* Кнопка правил */}
              <Link href="/september-rating/rules">
                <Button variant="secondary" size="sm" className="bg-white/20 hover:bg-white/30 text-white border-white/30">
                  <FileText className="h-4 w-4 mr-2" />
                  Правила рейтинга
                </Button>
              </Link>
            </div>
          </div>
          <p className="!text-white/90">
            Рейтинги и лидерборды за сентябрь 2024 года с автоматической синхронизацией из Pyrus
          </p>
        </div>
      </div>

      {/* Branch Leaderboard Section */}
      <div className="space-y-4">
        <BranchLeaderboard showOnlyCards={true} />
      </div>

      {/* Teacher Leaderboard Section */}
      <div className="space-y-4">
        <TeacherLeaderboard showOnlyCards={true} />
      </div>

      {/* Sync Information */}
      <div className="mt-8">
        <SyncInfo />
      </div>
    </div>
  )
}
