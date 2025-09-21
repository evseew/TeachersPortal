import SidebarNav from "@/components/sidebar-nav"
import TopNav from "@/components/top-nav"
import { MassKPIInput } from "@/components/dashboard/mass-kpi-input"

export default function SeptemberRatingPage() {
  return (
    <div className="flex h-screen bg-background">
      <SidebarNav />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNav />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-2">September Rating</h1>
            </div>

            <MassKPIInput />
          </div>
        </main>
      </div>
    </div>
  )
}
