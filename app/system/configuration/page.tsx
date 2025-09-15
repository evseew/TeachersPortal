"use client"

import { useEffect, useState } from "react"
import { Settings, Building2, Users, Shield, Plus, Edit, Trash2, Save, Check, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { SidebarNav } from "@/components/sidebar-nav"
import { TopNav } from "@/components/top-nav"
import { useBranchOperations } from "@/hooks/use-branch-operations"
import { BranchDeleteConfirmation } from "@/components/branch-delete-confirmation"
import type { Branch } from "@/lib/types/shared"

// Используем тип Branch из API вместо BranchRow

const initialUserRoles = [
  { id: 1, name: "Administrator", description: "Full system access", color: "bg-red-100 text-red-800" },
  { id: 2, name: "Senior Teacher", description: "Advanced teaching features", color: "bg-blue-100 text-blue-800" },
  { id: 3, name: "Teacher", description: "Basic teaching access", color: "bg-green-100 text-green-800" },
  { id: 4, name: "Salesman", description: "Sales and customer management", color: "bg-purple-100 text-purple-800" },
  {
    id: 5,
    name: "Head of Sales",
    description: "Sales team leadership and analytics",
    color: "bg-orange-100 text-orange-800",
  },
  {
    id: 6,
    name: "Regular User",
    description: "Basic user from Pyrus sync, awaiting role assignment",
    color: "bg-gray-100 text-gray-800",
  },
]

const systemSections = [
  { id: 1, name: "September Rating", description: "Access to rating dashboard and leaderboards" },
  { id: 2, name: "Mass KPI Input", description: "Access to KPI input and management tools" },
  { id: 3, name: "System", description: "Access to system administration and configuration" },
]

const initialPermissions = {
  Administrator: [1, 2, 3],
  "Senior Teacher": [1, 2],
  Teacher: [1],
  Salesman: [1],
  "Head of Sales": [1, 3],
  "Regular User": [], // Нет доступа к модулям, только профиль
}

const PermissionCheckbox = ({ checked, onToggle }: { checked: boolean; onToggle: () => void }) => {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={onToggle}
      className="h-4 w-4 text-[#7A9B28] bg-gray-100 border-gray-300 rounded focus:ring-[#7A9B28] focus:ring-2"
    />
  )
}

export default function SystemConfigurationPage() {
  // Branch management
  const branchOperations = useBranchOperations()
  const [newBranch, setNewBranch] = useState({ name: "" })
  const [editBranch, setEditBranch] = useState({ name: "" })
  const [isAddBranchOpen, setIsAddBranchOpen] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean
    branch: Branch | null
  }>({ isOpen: false, branch: null })

  // Role management (existing)
  const [userRoles, setUserRoles] = useState(initialUserRoles)
  const [permissions, setPermissions] = useState(initialPermissions)
  const [newRole, setNewRole] = useState({ name: "", description: "" })
  const [editingRole, setEditingRole] = useState<number | null>(null)
  const [editRole, setEditRole] = useState({ name: "", description: "" })
  const [isAddingRole, setIsAddingRole] = useState(false)
  const { toast } = useToast()

  // Branch handlers
  const handleAddBranch = async () => {
    const success = await branchOperations.createBranch(newBranch)
    if (success) {
      setNewBranch({ name: "" })
      setIsAddBranchOpen(false)
    }
  }

  const handleStartEditBranch = (branch: Branch) => {
    branchOperations.startEditing(branch.id)
    setEditBranch({ name: branch.name })
  }

  const handleSaveBranchEdit = async (branchId: string) => {
    const success = await branchOperations.updateBranch(branchId, editBranch)
    if (success) {
      setEditBranch({ name: "" })
    }
  }

  const handleCancelBranchEdit = () => {
    branchOperations.cancelEditing()
    setEditBranch({ name: "" })
  }

  const handleDeleteBranch = (branch: Branch) => {
    setDeleteConfirmation({ isOpen: true, branch })
  }

  const handleConfirmDelete = async (branchId: string) => {
    const success = await branchOperations.deleteBranch(branchId)
    if (success) {
      setDeleteConfirmation({ isOpen: false, branch: null })
    }
    return success
  }

  const addRole = () => {
    console.log("[v0] addRole called with:", newRole)

    if (!newRole.name.trim() || !newRole.description.trim()) {
      console.log("[v0] Validation failed - empty fields")
      return
    }

    // Check for duplicate role names
    const existingRole = userRoles.find((role) => role.name.toLowerCase() === newRole.name.trim().toLowerCase())

    if (existingRole) {
      console.log("[v0] Role already exists")
      alert("A role with this name already exists!")
      return
    }

    console.log("[v0] Adding role...")
    setIsAddingRole(true)

    try {
      const colors = [
        "bg-purple-100 text-purple-800",
        "bg-orange-100 text-orange-800",
        "bg-teal-100 text-teal-800",
        "bg-pink-100 text-pink-800",
      ]

      const newRoleObj = {
        id: Date.now(), // Use timestamp for unique ID
        name: newRole.name.trim(),
        description: newRole.description.trim(),
        color: colors[userRoles.length % colors.length],
      }

      setUserRoles((prev) => [...prev, newRoleObj])
      setPermissions((prev) => ({ ...prev, [newRole.name.trim()]: [] }))
      setNewRole({ name: "", description: "" })
      console.log("[v0] Role added successfully:", newRoleObj)
    } catch (error) {
      console.error("[v0] Error adding role:", error)
    } finally {
      setIsAddingRole(false)
    }
  }

  const startEditingRole = (role: (typeof initialUserRoles)[0]) => {
    setEditingRole(role.id)
    setEditRole({ name: role.name, description: role.description })
  }

  const saveRoleEdit = (id: number) => {
    const oldRole = userRoles.find((r) => r.id === id)
    if (oldRole) {
      setUserRoles(
        userRoles.map((role) =>
          role.id === id ? { ...role, name: editRole.name, description: editRole.description } : role,
        ),
      )

      if (oldRole.name !== editRole.name) {
        const updatedPermissions = { ...permissions } as Record<string, number[]>
        // Безопасное копирование прав для переименованной роли
        if (oldRole.name in updatedPermissions) {
          updatedPermissions[editRole.name] = updatedPermissions[oldRole.name]
          delete updatedPermissions[oldRole.name]
          setPermissions(updatedPermissions as typeof permissions)
        }
      }
    }
    setEditingRole(null)
  }

  const cancelRoleEdit = () => {
    setEditingRole(null)
    setEditRole({ name: "", description: "" })
  }

  const deleteRole = (id: number) => {
    const roleToDelete = userRoles.find((r) => r.id === id)
    if (roleToDelete) {
      setUserRoles(userRoles.filter((role) => role.id !== id))
      const updatedPermissions = { ...permissions } as Record<string, number[]>
      delete updatedPermissions[roleToDelete.name]
      setPermissions(updatedPermissions as typeof permissions)
    }
  }

  const togglePermission = (role: string, sectionId: number) => {
    setPermissions((prev) => {
      const prevAsRecord = prev as Record<string, number[]>
      return {
        ...prev,
        [role]: prevAsRecord[role]?.includes(sectionId) 
          ? prevAsRecord[role].filter((id) => id !== sectionId) 
          : [...(prevAsRecord[role] || []), sectionId],
      } as typeof prev
    })
  }

  const isBranchFormValid = newBranch.name.trim().length > 0 && newBranch.name.trim().length <= 100
  const isRoleFormValid = newRole.name.trim().length > 0 && newRole.description.trim().length > 0

  console.log("[v0] Branch form state:", {
    name: newBranch.name,
    isValid: isBranchFormValid,
    isAdding: branchOperations.isSubmitting,
  })

  console.log("[v0] Role form state:", {
    name: newRole.name,
    description: newRole.description,
    isValid: isRoleFormValid,
    isAdding: isAddingRole,
  })

  // Load branches on mount - уже автоматически загружается в useBranchOperations
  useEffect(() => {
    // branchOperations.refetch() - не нужно, так как автоматически загружается при монтировании
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
                  <h1 className="text-4xl font-bold text-white">System Configuration</h1>
                  <p className="text-white/90 text-lg">Manage branches, user roles, and access permissions</p>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto p-6 space-y-8">
            <Card className="border-2">
              <CardHeader className="border-b bg-muted/30">
                <CardTitle className="flex items-center space-x-3 text-xl">
                  <div className="p-2 bg-[#7A9B28] rounded-lg">
                    <Building2 className="h-5 w-5 text-white" />
                  </div>
                  <span>Branch Management</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="flex justify-end">
                    <Dialog open={isAddBranchOpen} onOpenChange={setIsAddBranchOpen}>
                      <DialogTrigger asChild>
                        <Button className="bg-[#7A9B28] hover:bg-[#5A7020]">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Branch
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add new branch</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Input
                            autoFocus
                            placeholder="Branch name"
                            value={newBranch.name}
                            onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && isBranchFormValid && !branchOperations.isSubmitting) {
                                e.preventDefault()
                                void handleAddBranch()
                              }
                            }}
                            maxLength={100}
                          />
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setIsAddBranchOpen(false)}
                            className="border-gray-300"
                          >
                            Cancel
                          </Button>
                          <Button onClick={handleAddBranch} disabled={branchOperations.isSubmitting || !isBranchFormValid} className="bg-[#7A9B28] hover:bg-[#5A7020]">
                            {branchOperations.isSubmitting ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Добавление...
                              </>
                            ) : (
                              <>Сохранить</>
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <div className="space-y-2">
                    <div className="grid grid-cols-10 gap-4 py-2 px-4 bg-gray-100 rounded-lg font-semibold text-sm">
                      <div className="col-span-1">#</div>
                      <div className="col-span-7">Branch Name</div>
                      <div className="col-span-2">Actions</div>
                    </div>

                    {branchOperations.loading ? (
                      <div className="py-8 text-center text-muted-foreground">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#7A9B28] mx-auto mb-2"></div>
                        Загрузка филиалов...
                      </div>
                    ) : branchOperations.error ? (
                      <div className="py-8 text-center text-destructive">
                        Ошибка загрузки: {branchOperations.error}
                      </div>
                    ) : branchOperations.branches.length === 0 ? (
                      <div className="py-8 text-center text-muted-foreground">
                        Нет филиалов. Добавьте первый филиал.
                      </div>
                    ) : (
                      branchOperations.branches.map((branch, index) => (
                        <div
                          key={branch.id}
                          className="grid grid-cols-10 gap-4 py-3 px-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-all duration-200"
                        >
                        <div className="col-span-1 flex items-center">
                          <span className="text-muted-foreground font-medium">{index + 1}</span>
                        </div>

                        <div className="col-span-7 flex items-center">
                          {branchOperations.editingBranchId === branch.id ? (
                            <Input
                              value={editBranch.name}
                              onChange={(e) => setEditBranch({ ...editBranch, name: e.target.value })}
                              className="h-8"
                              maxLength={100}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && editBranch.name.trim()) {
                                  e.preventDefault()
                                  void handleSaveBranchEdit(branch.id)
                                } else if (e.key === "Escape") {
                                  e.preventDefault()
                                  handleCancelBranchEdit()
                                }
                              }}
                            />
                          ) : (
                            <span className="font-semibold">{branch.name}</span>
                          )}
                        </div>

                        <div className="col-span-2 flex items-center space-x-2">
                          {branchOperations.editingBranchId === branch.id ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSaveBranchEdit(branch.id)}
                                disabled={branchOperations.isSubmitting || !editBranch.name.trim()}
                                className="h-8 px-2 text-green-600 hover:text-green-700 border-green-200"
                              >
                                {branchOperations.isSubmitting ? (
                                  <div className="animate-spin rounded-full h-3 w-3 border-b border-green-600"></div>
                                ) : (
                                  <Check className="h-3 w-3" />
                                )}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCancelBranchEdit}
                                disabled={branchOperations.isSubmitting}
                                className="h-8 px-2 text-gray-600 hover:text-gray-700 bg-transparent"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStartEditBranch(branch)}
                                disabled={branchOperations.isSubmitting || branchOperations.editingBranchId !== null}
                                className="h-8 px-2"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteBranch(branch)}
                                disabled={branchOperations.isSubmitting}
                                className="h-8 px-2 text-red-600 hover:text-red-700 border-red-200"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader className="border-b bg-muted/30">
                <CardTitle className="flex items-center space-x-3 text-xl">
                  <div className="p-2 bg-[#7A9B28] rounded-lg">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <span>User Roles</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg border">
                    <Input
                      placeholder="Role name"
                      value={newRole.name}
                      onChange={(e) => {
                        console.log("[v0] Role name changed:", e.target.value)
                        setNewRole({ ...newRole, name: e.target.value })
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          addRole()
                        }
                      }}
                    />
                    <Input
                      placeholder="Role description"
                      value={newRole.description}
                      onChange={(e) => {
                        console.log("[v0] Role description changed:", e.target.value)
                        setNewRole({ ...newRole, description: e.target.value })
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          addRole()
                        }
                      }}
                    />
                    <Button
                      onClick={addRole}
                      className="bg-[#7A9B28] hover:bg-[#5A7020]"
                      disabled={isAddingRole || !isRoleFormValid}
                    >
                      {isAddingRole ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Role
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <div className="grid grid-cols-12 gap-4 py-2 px-4 bg-gray-100 rounded-lg font-semibold text-sm">
                      <div className="col-span-1">#</div>
                      <div className="col-span-3">Role Name</div>
                      <div className="col-span-5">Description</div>
                      <div className="col-span-1">Sections</div>
                      <div className="col-span-2">Actions</div>
                    </div>

                    {userRoles.map((role, index) => (
                      <div
                        key={role.id}
                        className="grid grid-cols-12 gap-4 py-3 px-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-all duration-200"
                      >
                        <div className="col-span-1 flex items-center">
                          <span className="text-muted-foreground font-medium">{index + 1}</span>
                        </div>

                        <div className="col-span-3 flex items-center">
                          {editingRole === role.id ? (
                            <Input
                              value={editRole.name}
                              onChange={(e) => setEditRole({ ...editRole, name: e.target.value })}
                              className="h-8"
                            />
                          ) : (
                            <Badge className={role.color}>{role.name}</Badge>
                          )}
                        </div>

                        <div className="col-span-5 flex items-center">
                          {editingRole === role.id ? (
                            <Input
                              value={editRole.description}
                              onChange={(e) => setEditRole({ ...editRole, description: e.target.value })}
                              className="h-8"
                            />
                          ) : (
                            <span className="text-muted-foreground">{role.description}</span>
                          )}
                        </div>

                        <div className="col-span-1 flex items-center">
                          <span className="text-sm font-medium text-[#7A9B28]">
                            {(permissions as Record<string, number[]>)[role.name]?.length || 0}
                          </span>
                        </div>

                        <div className="col-span-2 flex items-center space-x-2">
                          {editingRole === role.id ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => saveRoleEdit(role.id)}
                                className="h-8 px-2 text-green-600 hover:text-green-700 border-green-200"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={cancelRoleEdit}
                                className="h-8 px-2 text-gray-600 hover:text-gray-700 bg-transparent"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => startEditingRole(role)}
                                className="h-8 px-2"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteRole(role.id)}
                                className="h-8 px-2 text-red-600 hover:text-red-700 border-red-200"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader className="border-b bg-muted/30">
                <CardTitle className="flex items-center space-x-3 text-xl">
                  <div className="p-2 bg-[#7A9B28] rounded-lg">
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                  <span>Access Permissions</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-4 px-4 font-semibold">System Section</th>
                        {userRoles.map((role) => (
                          <th key={role.id} className="text-center py-4 px-4 font-semibold">
                            {role.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {systemSections.map((section) => (
                        <tr key={section.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-4 px-4">
                            <div>
                              <div className="font-medium">{section.name}</div>
                              <div className="text-sm text-muted-foreground">{section.description}</div>
                            </div>
                          </td>
                          {userRoles.map((role) => (
                            <td key={role.id} className="py-4 px-4 text-center">
                              <PermissionCheckbox
                                checked={(permissions as Record<string, number[]>)[role.name]?.includes(section.id) || false}
                                onToggle={() => togglePermission(role.name, section.id)}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-6 flex justify-end">
                  <Button className="bg-[#7A9B28] hover:bg-[#5A7020]">
                    <Save className="h-4 w-4 mr-2" />
                    Save Permissions
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Branch Delete Confirmation Dialog */}
      <BranchDeleteConfirmation
        branch={deleteConfirmation.branch}
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ isOpen: false, branch: null })}
        onConfirm={handleConfirmDelete}
        isDeleting={branchOperations.isSubmitting}
      />
    </div>
  )
}
