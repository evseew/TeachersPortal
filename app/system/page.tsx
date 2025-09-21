import SidebarNav from "@/components/sidebar-nav"
import TopNav from "@/components/top-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, Settings, Shield, Edit3, Activity, TrendingUp, CheckCircle } from "lucide-react"
import Link from "next/link"

export default function SystemPage() {
  return (
    <div className="flex h-screen bg-background">
      <SidebarNav />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNav />
        <main className="flex-1 overflow-y-auto">
          {/* Hero Section */}
          <div className="relative !bg-[#7A9B28] text-white">
            <div
              className="absolute inset-0 opacity-20"
              style={{
                background: "linear-gradient(135deg, rgba(164, 199, 54, 0.3) 0%, rgba(122, 155, 40, 0.8) 100%)",
              }}
            />
            <div className="relative px-8 py-12">
              <div className="flex items-center space-x-3 mb-4">
                <Settings className="h-8 w-8 text-white" />
                <h1 className="text-3xl font-bold text-white">System Management</h1>
              </div>
              <p className="text-lg text-white/90 max-w-2xl">
                Comprehensive system administration tools for managing users, data, and platform configuration.
              </p>
            </div>
          </div>

          <div className="p-8">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card className="border-l-4 border-l-[#A4C736]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                      <p className="text-2xl font-bold">127</p>
                    </div>
                    <Users className="h-8 w-8 text-[#A4C736]" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Active Sessions</p>
                      <p className="text-2xl font-bold">89</p>
                    </div>
                    <Activity className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-orange-500">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">System Health</p>
                      <p className="text-2xl font-bold">98%</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Uptime</p>
                      <p className="text-2xl font-bold">99.9%</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* System Modules */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="hover:shadow-lg transition-shadow border border-border">
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-[#A4C736]/10 rounded-lg">
                      <Edit3 className="h-6 w-6 text-[#A4C736]" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Mass KPI Input</CardTitle>
                      <CardDescription>Edit teacher performance metrics and KPI data</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="bg-white border border-[#7A9B28] text-[#7A9B28]">
                      Admin/Senior Only
                    </Badge>
                    <Link href="/system/mass-kpi-input">
                      <Button size="sm" className="bg-[#7A9B28] hover:bg-[#5A7020] text-white">
                        Access
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow border border-border">
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <Users className="h-6 w-6 text-blue-500" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">User Management</CardTitle>
                      <CardDescription>Manage user accounts, roles, and permissions</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="bg-white border border-blue-600 text-blue-600">
                      127 Active Users
                    </Badge>
                    <Link href="/system/users">
                      <Button size="sm" variant="outline">
                        Manage
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow border border-border">
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-orange-500/10 rounded-lg">
                      <Settings className="h-6 w-6 text-orange-500" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">System Settings</CardTitle>
                      <CardDescription>Monitor system health and performance metrics</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="bg-white border border-green-600 text-green-600">
                      All Systems Online
                    </Badge>
                    <Link href="/system/settings">
                      <Button size="sm" variant="outline">
                        Monitor
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow border border-border">
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                      <Shield className="h-6 w-6 text-purple-500" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Configuration</CardTitle>
                      <CardDescription>Manage branches, user roles, and access permissions</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="bg-white border border-purple-600 text-purple-600">
                      5 Branches
                    </Badge>
                    <Link href="/system/configuration">
                      <Button size="sm" variant="outline">
                        Configure
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
