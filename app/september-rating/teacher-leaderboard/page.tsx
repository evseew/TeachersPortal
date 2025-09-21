import { SidebarNav } from "@/components/sidebar-nav"
import { TopNav } from "@/components/top-nav"
import { TeacherLeaderboard } from "@/components/dashboard/teacher-leaderboard"

export default function TeacherLeaderboardPage() {
  return (
    <div className="flex h-screen bg-background">
      <SidebarNav />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNav />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">Teacher Leaderboard</h1>
              <p className="text-muted-foreground">Complete teacher performance rankings for September 2024</p>
            </div>

            <TeacherLeaderboard />
          </div>
        </main>
      </div>
    </div>
  )
}
