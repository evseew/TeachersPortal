import { SidebarNav } from "@/components/sidebar-nav"
import { TopNav } from "@/components/top-nav"
import { BranchLeaderboard } from "@/components/dashboard/branch-leaderboard"

export default function BranchLeaderboardPage() {
  return (
    <div className="flex h-screen bg-background">
      <SidebarNav />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNav />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">Branch Leaderboard</h1>
              <p className="text-muted-foreground">Complete ranking of all 13 branches for September 2024</p>
            </div>

            <BranchLeaderboard />
          </div>
        </main>
      </div>
    </div>
  )
}
