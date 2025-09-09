import { SidebarNav } from "@/components/sidebar-nav"
import { TopNav } from "@/components/top-nav"
import { BranchLeaderboard } from "@/components/dashboard/branch-leaderboard"
import { TeacherLeaderboard } from "@/components/dashboard/teacher-leaderboard"

export default function SeptemberRatingPage() {
  return (
    <div className="flex h-screen bg-background">
      <SidebarNav />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNav />
        <main className="flex-1 overflow-y-auto p-6 space-y-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">September Rating</h1>
              <p className="text-muted-foreground">Teacher and branch performance leaderboards for September 2024</p>
            </div>

            <div className="grid gap-8">
              <div>
                <h2 className="text-xl font-semibold mb-4 text-foreground">Top Branch Performers</h2>
                <BranchLeaderboard showOnlyCards={true} />
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-4 text-foreground">Top Teacher Performers</h2>
                <TeacherLeaderboard showOnlyCards={true} />
              </div>
            </div>
            {/* </CHANGE> */}
          </div>
        </main>
      </div>
    </div>
  )
}
