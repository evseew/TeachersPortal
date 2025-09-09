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
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-20">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <Shield className="h-8 w-8 text-gray-400" />
              </div>
              <h1 className="text-3xl font-bold text-gray-400 mb-4">Newcomers Rating</h1>
              <p className="text-gray-500 text-lg">Coming Soon</p>
              <p className="text-gray-400 mt-2">This section is currently under development.</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
