"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Trophy, Settings, Shield, Edit3, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useUserRole, RoleGuard } from "@/hooks/use-user-role"

const modules = [
  {
    name: "September Rating",
    icon: Trophy,
    href: "/september-rating",
    active: true,
    requiresPath: "/september-rating",
    subpages: [
      { name: "Branch Leaderboard", icon: Trophy, href: "/september-rating/branch-leaderboard" },
      { name: "Teacher Leaderboard", icon: Trophy, href: "/september-rating/teacher-leaderboard" },
    ],
  },
  {
    name: "Mass KPI Input",
    icon: Edit3,
    href: "/mass-kpi-input",
    active: false,
    requiresPath: "/mass-kpi-input",
    subpages: [{ name: "September Rating", icon: Edit3, href: "/mass-kpi-input/september-rating" }],
  },
  {
    name: "Newcomers Rating",
    icon: Shield,
    href: "/newcomers-rating",
    active: false,
    placeholder: true,
    requiresPath: "/newcomers-rating",
    subpages: [],
  },
  {
    name: "System",
    icon: Settings,
    href: "/system",
    active: false,
    requiresPath: "/system",
    subpages: [
      { name: "User Management", icon: Users, href: "/system/users", requiresPath: "/system/users" },
      { name: "System Settings", icon: Settings, href: "/system/settings", requiresPath: "/system/settings" },
      { name: "Configuration", icon: Settings, href: "/system/configuration", requiresPath: "/system/configuration" },
    ],
  },
]

function SidebarNav() {
  const [collapsed, setCollapsed] = useState(false)
  const [expandedModules, setExpandedModules] = useState<string[]>(["September Rating"])
  const pathname = usePathname()
  const router = useRouter()
  const { hasAccess } = useUserRole()

  useEffect(() => {
    // Check if current path matches any subpage and auto-expand parent module
    modules.forEach((module) => {
      if (module.subpages) {
        const isOnSubpage = module.subpages.some((subpage) => pathname?.startsWith(subpage.href))
        if (isOnSubpage && !expandedModules.includes(module.name)) {
          setExpandedModules((prev) => [...prev, module.name])
        }
      }
    })
  }, [pathname, expandedModules])

  const toggleModule = (moduleName: string) => {
    setExpandedModules((prev) =>
      prev.includes(moduleName) ? prev.filter((name) => name !== moduleName) : [...prev, moduleName],
    )
  }

  const handleModuleClick = (module: any, event: React.MouseEvent) => {
    event.preventDefault()
    
    // Всегда переходим на главную страницу модуля
    router.push(module.href)
    
    // Если есть подстраницы, всегда раскрываем подменю
    if (module.subpages && module.subpages.length > 0) {
      // Убеждаемся, что модуль точно добавлен в expandedModules
      setExpandedModules((prev) => {
        if (!prev.includes(module.name)) {
          return [...prev, module.name]
        }
        return prev
      })
    }
  }

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/"
    return pathname?.startsWith(href) || false
  }

  return (
    <div
      className={cn(
        "bg-card border-r border-border transition-all duration-300 flex flex-col",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* Logo and collapse button */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-[#7A9B28] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">PE</span>
            </div>
            <span className="font-semibold text-foreground">PlanetEnglish Portal</span>
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={() => setCollapsed(!collapsed)} className="h-8 w-8 p-0">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation items */}
      <nav className="flex-1 p-4 space-y-2">
        {modules.map((module) => {
          const Icon = module.icon
          const hasSubpages = module.subpages && module.subpages.length > 0
          const isExpanded = expandedModules.includes(module.name)
          const moduleActive = isActive(module.href)
          
          // Проверяем доступ к модулю
          if (module.requiresPath && !hasAccess(module.requiresPath)) {
            return null
          }

          return (
            <div key={module.name}>
              {/* Main module item */}
              <div
                className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-lg transition-colors",
                  moduleActive
                    ? // Fixed contrast by using darker green text and slightly more opaque background
                      "bg-[#A4C736]/15 text-[#5A7020] border-l-4 border-[#A4C736] dark:bg-[#A4C736]/20 dark:text-[#A4C736]"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                  module.placeholder && "opacity-50",
                )}
              >
                <Link 
                  href={module.href} 
                  className="flex items-center space-x-3 flex-1 cursor-pointer"
                  onClick={(e) => handleModuleClick(module, e)}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && (
                    <span className="font-medium">
                      {module.name}
                      {module.placeholder && " (Coming Soon)"}
                    </span>
                  )}
                </Link>
                {hasSubpages && !collapsed && (
                  <button
                    className="ml-2 p-1 hover:bg-black/5 rounded transition-colors"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      toggleModule(module.name)
                    }}
                  >
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                )}
              </div>

              {/* Subpages */}
              {hasSubpages && isExpanded && !collapsed && (
                <div className="ml-6 mt-1 space-y-1">
                  {module.subpages.map((subpage) => {
                    const SubIcon = subpage.icon
                    const subpageActive = isActive(subpage.href)
                    
                    // Проверяем доступ к подстранице
                    if ((subpage as any).requiresPath && !hasAccess((subpage as any).requiresPath)) {
                      return null
                    }

                    return (
                      <Link
                        key={subpage.name}
                        href={subpage.href}
                        className={cn(
                          "flex items-center space-x-3 px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm",
                          subpageActive
                            ? // Fixed contrast for subpages with darker green text
                              "bg-[#A4C736]/15 text-[#5A7020] border-l-4 border-[#A4C736] dark:bg-[#A4C736]/20 dark:text-[#A4C736]"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted",
                        )}
                      >
                        <SubIcon className="h-4 w-4 flex-shrink-0" />
                        <span className="font-medium">
                          {subpage.name}
                        </span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </div>
  )
}

export { SidebarNav }
export default SidebarNav
