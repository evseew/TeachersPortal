import SidebarNav from "@/components/sidebar-nav"
import TopNav from "@/components/top-nav"
import { Trophy, Edit3, Shield } from "lucide-react"

export default function MassKPIInputPage() {
  return (
    <div className="flex h-screen bg-background">
      <SidebarNav />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNav />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {/* Hero Section */}
            <div className="relative mb-8 p-8 rounded-lg !bg-[#7A9B28] overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-[#7A9B28] to-[#A4C736] opacity-90"></div>
              <div className="relative z-10">
                <h1 className="text-3xl font-bold !text-white mb-2">Mass KPI Input</h1>
                <p className="!text-white/90">Manage and input KPI data for performance tracking</p>
              </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* September Rating Card */}
              <div className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-[#A4C736]/20 rounded-lg flex items-center justify-center">
                    <Trophy className="h-5 w-5 text-[#7A9B28]" />
                  </div>
                  <h3 className="text-lg font-semibold">September Rating</h3>
                </div>
                <p className="text-muted-foreground mb-4">
                  Input and manage KPI data for September performance ratings
                </p>
                <a
                  href="/mass-kpi-input/september-rating"
                  className="inline-flex items-center px-4 py-2 bg-[#7A9B28] text-white rounded-lg hover:bg-[#6A8A20] transition-colors"
                >
                  Access Module
                </a>
              </div>

              {/* Newcomers Rating Card */}
              <div className="bg-card border border-border rounded-lg p-6 opacity-50 cursor-not-allowed">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                    <Shield className="h-5 w-5 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-400">Newcomers Rating</h3>
                </div>
                <p className="text-muted-foreground mb-4">KPI input for new employee performance evaluation</p>
                <div className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-400 rounded-lg">
                  Coming Soon
                </div>
              </div>

              {/* Placeholder for future modules */}
              <div className="bg-card border border-border rounded-lg p-6 opacity-50">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                    <Edit3 className="h-5 w-5 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-400">October Rating</h3>
                </div>
                <p className="text-muted-foreground mb-4">Coming Soon</p>
              </div>

              <div className="bg-card border border-border rounded-lg p-6 opacity-50">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                    <Edit3 className="h-5 w-5 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-400">November Rating</h3>
                </div>
                <p className="text-muted-foreground mb-4">Coming Soon</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
