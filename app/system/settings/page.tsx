import { Database, Server, Shield, Settings, AlertTriangle, CheckCircle, Activity } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import SidebarNav from "@/components/sidebar-nav"
import TopNav from "@/components/top-nav"

export default function SystemSettingsPage() {
  const systemStatus = [
    { name: "Database", status: "Healthy", icon: Database, color: "text-green-600", bgColor: "bg-green-50" },
    { name: "API Server", status: "Running", icon: Server, color: "text-green-600", bgColor: "bg-green-50" },
    { name: "Security", status: "Protected", icon: Shield, color: "text-green-600", bgColor: "bg-green-50" },
    { name: "Backup", status: "Warning", icon: AlertTriangle, color: "text-yellow-600", bgColor: "bg-yellow-50" },
  ]

  const systemSettings = [
    { name: "Automatic Backups", description: "Enable daily system backups", enabled: true },
    { name: "Email Notifications", description: "Send system alerts via email", enabled: true },
    { name: "Maintenance Mode", description: "Enable maintenance mode for updates", enabled: false },
    { name: "Debug Logging", description: "Enable detailed system logging", enabled: false },
  ]

  return (
    <div className="flex h-screen bg-background">
      <SidebarNav />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNav />
        <main className="flex-1 overflow-y-auto">
          <div className="relative !bg-[#7A9B28] py-12 px-6">
            <div
              className="absolute inset-0 opacity-20"
              style={{
                background: "linear-gradient(135deg, #A4C736 0%, #7A9B28 50%, #5A7020 100%)",
              }}
            />
            <div className="relative z-10 max-w-7xl mx-auto">
              <div className="flex items-center space-x-4 mb-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Settings className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-white">System Settings</h1>
                  <p className="text-white/90 text-lg">Monitor system health and configure platform settings</p>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto p-6 space-y-8">
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-foreground">System Status</h2>
                <Badge variant="outline" className="text-sm">
                  <Activity className="h-4 w-4 mr-1" />
                  Live Monitoring
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {systemStatus.map((item) => {
                  const Icon = item.icon
                  return (
                    <Card key={item.name} className="border-2 hover:shadow-lg transition-all duration-200">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className={`p-3 rounded-xl ${item.bgColor}`}>
                            <Icon className={`h-6 w-6 ${item.color}`} />
                          </div>
                          <Badge
                            variant={item.status === "Warning" ? "destructive" : "default"}
                            className={
                              item.status === "Warning"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-green-100 text-green-800"
                            }
                          >
                            {item.status}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-foreground">{item.name}</p>
                          <p className="text-sm text-muted-foreground">System Component</p>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>

            <Card className="border-2">
              <CardHeader className="border-b bg-muted/30">
                <CardTitle className="flex items-center space-x-3 text-xl">
                  <div className="p-2 bg-[#7A9B28] rounded-lg">
                    <Settings className="h-5 w-5 text-white" />
                  </div>
                  <span>System Configuration</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {systemSettings.map((setting, index) => (
                    <div
                      key={setting.name}
                      className={`flex items-center justify-between py-4 ${
                        index !== systemSettings.length - 1 ? "border-b border-border" : ""
                      }`}
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground text-lg">{setting.name}</h3>
                        <p className="text-muted-foreground mt-1">{setting.description}</p>
                      </div>
                      <Switch defaultChecked={setting.enabled} className="ml-4" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader className="border-b bg-muted/30">
                <CardTitle className="text-xl">System Actions</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Button
                    variant="outline"
                    className="h-24 flex flex-col items-center justify-center space-y-3 border-2 hover:border-[#7A9B28] hover:bg-[#7A9B28]/5 transition-all duration-200 bg-transparent"
                  >
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Database className="h-6 w-6 text-blue-600" />
                    </div>
                    <span className="font-medium">Backup Now</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-24 flex flex-col items-center justify-center space-y-3 border-2 hover:border-[#7A9B28] hover:bg-[#7A9B28]/5 transition-all duration-200 bg-transparent"
                  >
                    <div className="p-2 bg-green-100 rounded-lg">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <span className="font-medium">System Check</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-24 flex flex-col items-center justify-center space-y-3 border-2 hover:border-[#7A9B28] hover:bg-[#7A9B28]/5 transition-all duration-200 bg-transparent"
                  >
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Settings className="h-6 w-6 text-purple-600" />
                    </div>
                    <span className="font-medium">Clear Cache</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
