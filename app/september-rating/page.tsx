import SidebarNav from "@/components/sidebar-nav"
import TopNav from "@/components/top-nav"
import { SeptemberRatingMainPage } from "@/plugins/september-rating/pages/main-page"

export default function SeptemberRatingPage() {
  return (
    <div className="flex h-screen bg-background">
      <SidebarNav />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNav />
        <main className="flex-1 overflow-y-auto p-6">
          <SeptemberRatingMainPage />
        </main>
      </div>
    </div>
  )
}