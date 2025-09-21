"use client"

import { useEffect, useState } from "react"
import { Plus, Edit, Trash2, Save, X, Shield, Eye, Settings } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { rolesApi } from "@/lib/clients/roles.client"
import { type Role, type CreateRoleRequest, SYSTEM_PERMISSIONS, PERMISSION_CATEGORIES, ROLE_COLORS } from "@/lib/types/roles"

export function RolesManagement() {
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingRole, setEditingRole] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingRole, setDeletingRole] = useState<string | null>(null)
  
  // Форма создания/редактирования роли
  const [roleForm, setRoleForm] = useState<CreateRoleRequest>({
    name: "",
    description: "",
    color: ROLE_COLORS[0],
    permissions: []
  })

  const { toast } = useToast()

  // Загрузка ролей
  const loadRoles = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await rolesApi.listRoles()
      setRoles(data)
    } catch (error: any) {
      console.error("Failed to load roles:", error)
      setError(error.message || "Ошибка загрузки ролей")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRoles()
  }, [])

  // Создание роли
  const handleCreateRole = async () => {
    // Валидация
    if (!roleForm.name.trim()) {
      toast({ title: "Ошибка", description: "Введите название роли", variant: "destructive" })
      return
    }
    if (roleForm.name.trim().length < 2 || roleForm.name.trim().length > 50) {
      toast({ title: "Ошибка", description: "Название роли должно быть от 2 до 50 символов", variant: "destructive" })
      return
    }
    if (!roleForm.description.trim()) {
      toast({ title: "Ошибка", description: "Введите описание роли", variant: "destructive" })
      return
    }
    if (roleForm.description.trim().length < 5 || roleForm.description.trim().length > 200) {
      toast({ title: "Ошибка", description: "Описание роли должно быть от 5 до 200 символов", variant: "destructive" })
      return
    }

    try {
      setIsSubmitting(true)
      const newRole = await rolesApi.createRole(roleForm)
      setRoles(prev => [...prev, newRole])
      setIsCreating(false)
      setRoleForm({ name: "", description: "", color: ROLE_COLORS[0], permissions: [] })
      toast({ title: "Роль создана", description: `Роль «${newRole.name}» успешно создана` })
    } catch (error: any) {
      console.error("Failed to create role:", error)
      toast({ title: "Ошибка", description: error.message || "Не удалось создать роль", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Начать редактирование роли
  const startEditingRole = (role: Role) => {
    setEditingRole(role.id)
    setRoleForm({
      name: role.name,
      description: role.description,
      color: role.color,
      permissions: role.permissions
    })
  }

  // Сохранить изменения роли
  const handleUpdateRole = async () => {
    if (!editingRole) return
    
    // Валидация
    if (!roleForm.name.trim()) {
      toast({ title: "Ошибка", description: "Введите название роли", variant: "destructive" })
      return
    }
    if (roleForm.name.trim().length < 2 || roleForm.name.trim().length > 50) {
      toast({ title: "Ошибка", description: "Название роли должно быть от 2 до 50 символов", variant: "destructive" })
      return
    }
    if (!roleForm.description.trim()) {
      toast({ title: "Ошибка", description: "Введите описание роли", variant: "destructive" })
      return
    }
    if (roleForm.description.trim().length < 5 || roleForm.description.trim().length > 200) {
      toast({ title: "Ошибка", description: "Описание роли должно быть от 5 до 200 символов", variant: "destructive" })
      return
    }

    try {
      setIsSubmitting(true)
      const updatedRole = await rolesApi.updateRole(editingRole, roleForm)
      setRoles(prev => prev.map(r => r.id === editingRole ? updatedRole : r))
      setEditingRole(null)
      toast({ title: "Роль обновлена", description: `Роль «${updatedRole.name}» успешно обновлена` })
    } catch (error: any) {
      console.error("Failed to update role:", error)
      toast({ title: "Ошибка", description: error.message || "Не удалось обновить роль", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Отменить редактирование
  const cancelEditing = () => {
    setEditingRole(null)
    setRoleForm({ name: "", description: "", color: ROLE_COLORS[0], permissions: [] })
  }

  // Удаление роли
  const handleDeleteRole = async (role: Role) => {
    if (!confirm(`Вы уверены, что хотите удалить роль «${role.name}»?`)) {
      return
    }

    try {
      setDeletingRole(role.id)
      await rolesApi.deleteRole(role.id)
      setRoles(prev => prev.filter(r => r.id !== role.id))
      toast({ title: "Роль удалена", description: `Роль «${role.name}» успешно удалена` })
    } catch (error: any) {
      console.error("Failed to delete role:", error)
      toast({ title: "Ошибка", description: error.message || "Не удалось удалить роль", variant: "destructive" })
    } finally {
      setDeletingRole(null)
    }
  }

  // Переключение разрешения
  const togglePermission = (permissionId: string) => {
    setRoleForm(prev => ({
      ...prev,
      permissions: prev.permissions?.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...(prev.permissions || []), permissionId]
    }))
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Управление ролями
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Загрузка ролей...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Управление ролями
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">{error}</p>
          <Button onClick={loadRoles} className="mt-2">
            Повторить
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Управление ролями
          </CardTitle>
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Добавить роль
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Создать новую роль</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Название роли *</Label>
                  <Input
                    id="name"
                    value={roleForm.name}
                    onChange={(e) => setRoleForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Введите название роли (2-50 символов)"
                  />
                  <p className="text-xs text-gray-500 mt-1">{roleForm.name.length}/50 символов</p>
                </div>
                
                <div>
                  <Label htmlFor="description">Описание *</Label>
                  <Textarea
                    id="description"
                    value={roleForm.description}
                    onChange={(e) => setRoleForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Введите описание роли (5-200 символов)"
                    rows={3}
                  />
                  <p className="text-xs text-gray-500 mt-1">{roleForm.description.length}/200 символов</p>
                </div>
                
                <div>
                  <Label>Цвет</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {ROLE_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setRoleForm(prev => ({ ...prev, color }))}
                        className={`w-8 h-8 rounded border-2 ${color} ${
                          roleForm.color === color ? 'border-gray-800' : 'border-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                
                <div>
                  <Label>Разрешения</Label>
                  <div className="space-y-4 mt-2">
                    {Object.entries(PERMISSION_CATEGORIES).map(([category, permissions]) => (
                      <div key={category}>
                        <h4 className="font-medium text-sm text-gray-700 mb-2">{category}</h4>
                        <div className="space-y-2">
                          {permissions.map((permission) => (
                            <div key={permission.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={permission.id}
                                checked={roleForm.permissions?.includes(permission.id)}
                                onCheckedChange={() => togglePermission(permission.id)}
                              />
                              <Label htmlFor={permission.id} className="text-sm">
                                {permission.name}
                                <span className="text-gray-500 ml-1">- {permission.description}</span>
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreating(false)}>
                  Отмена
                </Button>
                <Button onClick={handleCreateRole} disabled={isSubmitting}>
                  {isSubmitting ? "Создание..." : "Создать роль"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {roles.map((role) => (
            <div key={role.id} className="border rounded-lg p-4">
              {editingRole === role.id ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Название роли</Label>
                      <div className="flex-1">
                        <Input
                          value={roleForm.name}
                          onChange={(e) => setRoleForm(prev => ({ ...prev, name: e.target.value }))}
                          disabled={role.is_system} // системные роли нельзя переименовывать
                          placeholder="2-50 символов"
                        />
                        <p className="text-xs text-gray-500 mt-1">{roleForm.name.length}/50</p>
                      </div>
                    </div>
                    <div>
                      <Label>Цвет</Label>
                      <div className="flex gap-1 mt-1">
                        {ROLE_COLORS.slice(0, 4).map((color) => (
                          <button
                            key={color}
                            onClick={() => setRoleForm(prev => ({ ...prev, color }))}
                            className={`w-6 h-6 rounded border ${color} ${
                              roleForm.color === color ? 'border-gray-800' : 'border-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <Label>Описание</Label>
                    <Textarea
                      value={roleForm.description}
                      onChange={(e) => setRoleForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="5-200 символов"
                      rows={2}
                    />
                    <p className="text-xs text-gray-500 mt-1">{roleForm.description.length}/200 символов</p>
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={cancelEditing}>
                      <X className="h-4 w-4 mr-1" />
                      Отмена
                    </Button>
                    <Button onClick={handleUpdateRole} disabled={isSubmitting}>
                      <Save className="h-4 w-4 mr-1" />
                      {isSubmitting ? "Сохранение..." : "Сохранить"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge className={role.color}>
                      {role.name}
                    </Badge>
                    {role.is_system && (
                      <Badge variant="outline" className="text-xs">
                        <Settings className="h-3 w-3 mr-1" />
                        Системная
                      </Badge>
                    )}
                    <span className="text-gray-600">{role.description}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEditingRole(role)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    {!role.is_system && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRole(role)}
                        disabled={deletingRole === role.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
