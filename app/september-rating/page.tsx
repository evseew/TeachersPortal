import SidebarNav from "@/components/sidebar-nav"
import TopNav from "@/components/top-nav"
import { BranchLeaderboard } from "@/components/dashboard/branch-leaderboard"
import { TeacherLeaderboard } from "@/components/dashboard/teacher-leaderboard"
import { Trophy } from "lucide-react"

export default function SeptemberRatingPage() {
  return (
    <div className="flex h-screen bg-background">
      <SidebarNav />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNav />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Hero Section */}
            <div className="relative p-8 rounded-lg !bg-[#7A9B28] overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-[#7A9B28] to-[#A4C736] opacity-90"></div>
              <div className="relative z-10">
                <div className="flex items-center space-x-3 mb-4">
                  <Trophy className="h-8 w-8 text-white" />
                  <h1 className="text-3xl font-bold !text-white">September Rating</h1>
                </div>
                <p className="!text-white/90">Рейтинги и лидерборды за сентябрь 2024</p>
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
          </div>
        </main>
      </div>
    </div>
  )
}