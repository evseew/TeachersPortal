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
// import { useBranchOperations } from "@/hooks/use-branch-operations" // Временно отключено
import { BranchDeleteConfirmation } from "@/components/branch-delete-confirmation"
import { RolesManagement } from "@/components/system/roles-management"
import type { Branch } from "@/lib/types/shared"
import { systemApi } from "@/lib/clients/system.client"

// Используем тип Branch из API вместо BranchRow

// Старые роли перенесены в базу данных и управляются через RolesManagement компонент

// Старые разрешения перенесены в новую систему ролей

// Старый PermissionCheckbox убран - теперь в RolesManagement компоненте

export default function SystemConfigurationPage() {
  // Branch management - временная заглушка
  const [branches, setBranches] = useState<Branch[]>([])
  const [branchesLoading, setBranchesLoading] = useState(false)
  const [branchError, setBranchError] = useState<string | null>(null)
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Создаем объект branchOperations для совместимости
  const branchOperations = {
    branches,
    loading: branchesLoading,
    error: branchError,
    isSubmitting,
    editingBranchId,
    createBranch: async (data: { name: string }) => {
      try {
        setIsSubmitting(true)
        const created = await systemApi.createBranch(data.name)
        setBranches((prev) => [...prev, created])
        toast({ title: "Филиал добавлен", description: `«${created.name}» успешно создан` })
        return true
      } catch (error: any) {
        console.error("Create branch failed:", error)
        toast({ title: "Ошибка", description: error?.message || "Не удалось создать филиал", variant: "destructive" })
        return false
      } finally {
        setIsSubmitting(false)
      }
    },
    updateBranch: async (id: string, data: { name: string }) => {
      try {
        setIsSubmitting(true)
        const updated = await systemApi.updateBranch(id, data.name)
        setBranches((prev) => prev.map((b) => (b.id === id ? updated : b)))
        setEditingBranchId(null)
        toast({ title: "Филиал обновлен", description: `«${updated.name}» успешно изменен` })
        return true
      } catch (error: any) {
        console.error("Update branch failed:", error)
        toast({ title: "Ошибка", description: error?.message || "Не удалось обновить филиал", variant: "destructive" })
        return false
      } finally {
        setIsSubmitting(false)
      }
    },
    deleteBranch: async (id: string) => {
      try {
        setIsSubmitting(true)
        await systemApi.deleteBranch(id)
        setBranches((prev) => prev.filter((b) => b.id !== id))
        toast({ title: "Филиал удален", description: "Филиал успешно удален" })
        return true
      } catch (error: any) {
        console.error("Delete branch failed:", error)
        toast({ title: "Ошибка", description: error?.message || "Не удалось удалить филиал", variant: "destructive" })
        return false
      } finally {
        setIsSubmitting(false)
      }
    },
    startEditing: (id: string) => setEditingBranchId(id),
    cancelEditing: () => setEditingBranchId(null),
  }
  const [newBranch, setNewBranch] = useState({ name: "" })
  const [editBranch, setEditBranch] = useState({ name: "" })
  const [isAddBranchOpen, setIsAddBranchOpen] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean
    branch: Branch | null
  }>({ isOpen: false, branch: null })

  // Role management теперь в RolesManagement компоненте
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

  // Функции управления ролями перенесены в RolesManagement компонент

  // togglePermission убран - теперь в RolesManagement компоненте

  const isBranchFormValid = newBranch.name.trim().length > 0 && newBranch.name.trim().length <= 100

  console.log("[v0] Branch form state:", {
    name: newBranch.name,
    isValid: isBranchFormValid,
    isAdding: branchOperations.isSubmitting,
  })

  // Старые console.log убраны вместе с переменными ролей

  // Load branches on mount
  useEffect(() => {
    const loadBranches = async () => {
      try {
        setBranchesLoading(true)
        setBranchError(null)
        const response = await fetch('/api/system/branches')
        if (response.ok) {
          const data = await response.json()
          setBranches(data)
        } else {
          setBranchError('Failed to load branches')
        }
      } catch (error) {
        setBranchError('Network error')
        console.warn("Branches API unavailable; staying with empty list")
      } finally {
        setBranchesLoading(false)
      }
    }
    
    loadBranches()
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

            <RolesManagement />

            {/* Управление разрешениями будет добавлено позже в RolesManagement компонент */}
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
