import SidebarNav from "@/components/sidebar-nav"
import TopNav from "@/components/top-nav"
import { Shield } from "lucide-react"

export default function NewcomersRatingPage() {
  return (
    <div className="flex h-screen bg-background">
      <SidebarNav />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNav />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {/* Hero Section */}
            <div className="relative mb-8 p-8 rounded-lg bg-gray-100 overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center space-x-3 mb-4">
                  <Shield className="h-8 w-8 text-gray-400" />
                  <h1 className="text-3xl font-bold text-gray-400">Newcomers Rating</h1>
                </div>
                <p className="text-gray-500">KPI input for new employee performance evaluation</p>
              </div>
            </div>

            {/* Coming Soon Message */}
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="h-12 w-12 text-gray-400" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-400 mb-4">Coming Soon</h2>
              <p className="text-gray-500 max-w-md mx-auto">
                The Newcomers Rating module is currently under development. This feature will allow you to input and
                manage KPI data for new employee performance evaluations.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
