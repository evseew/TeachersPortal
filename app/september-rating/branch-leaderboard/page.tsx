import SidebarNav from "@/components/sidebar-nav"
import TopNav from "@/components/top-nav"
import { BranchLeaderboardPage } from "@/plugins/september-rating/pages/branch-leaderboard-page"

export default function BranchLeaderboardRoute() {
  return (
    <div className="flex h-screen bg-background">
      <SidebarNav />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNav />
        <main className="flex-1 overflow-y-auto p-6">
          <BranchLeaderboardPage />
        </main>
      </div>
    </div>
  )
}
