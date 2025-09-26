import SidebarNav from "@/components/sidebar-nav"
import TopNav from "@/components/top-nav"
import { RulesPage } from "@/plugins/september-rating/pages/rules-page"

export default function SeptemberRatingRulesPage() {
  return (
    <div className="flex h-screen bg-background">
      <SidebarNav />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNav />
        <main className="flex-1 overflow-y-auto p-6">
          <RulesPage />
        </main>
      </div>
    </div>
  )
}
