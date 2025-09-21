import type { Metadata } from "next"
import SidebarNav from "@/components/sidebar-nav"
import TopNav from "@/components/top-nav"

export const metadata: Metadata = {
  title: "Dashboard - PlanetEnglish Portal",
  description: "Главная панель управления портала преподавателей",
}

export default function DashboardPage() {
  return (
    <div className="flex h-screen bg-background">
      <SidebarNav />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNav />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="space-y-6">
              <div className="text-center py-20">
                <h1 className="text-3xl font-bold text-foreground mb-4">PlanetEnglish Portal</h1>
                <p className="text-muted-foreground text-lg mb-6">
                  Добро пожаловать в портал управления преподавателями
                </p>
                <p className="text-muted-foreground">
                  Используйте навигацию слева для доступа к рейтингам и управлению KPI
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
