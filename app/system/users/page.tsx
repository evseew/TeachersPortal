"use client"

import { useEffect, useState } from "react"
import { Users, Plus, Search, Filter, Edit, Trash2, MoreVertical, Shield, User, Crown, X, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { SidebarNav } from "@/components/sidebar-nav"
import { TopNav } from "@/components/top-nav"
import { useBranches } from "@/hooks/use-branches"
import { USER_ROLES, TEACHER_CATEGORIES, isTeacherRole } from "@/lib/constants/user-management"

type UiUser = {
  user_id: string
  name: string
  email: string
  role: string
  branch_name: string | null
  branch_id: string | null
  category: string | null
}

const getRoleIcon = (role: string) => {
  switch (role) {
    case "Administrator":
      return Shield
    case "Senior Teacher":
      return Crown
    default:
      return User
  }
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<UiUser[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [editingUser, setEditingUser] = useState<UiUser | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "",
    branch_id: "",
    category: "",
  })
  
  const { branches, loading: branchesLoading } = useBranches()

  useEffect(() => {
    const load = async () => {
      const { listUsers } = await import("@/lib/api/users")
      try {
        const rows = await listUsers()
        setUsers(
          rows.map((r) => ({
            user_id: r.user_id,
            name: r.full_name,
            email: r.email,
            role: r.role,
            branch_name: r.branch_name,
            branch_id: r.branch_id,
            category: r.category,
          })),
        )
      } catch (e) {
        console.warn("Users API unavailable; staying with empty list")
      }
    }
    void load()
  }, [])

  const addUser = async () => {
    // Базовая валидация
    if (!newUser.name || !newUser.email || !newUser.role || !newUser.branch_id) {
      setError("Пожалуйста, заполните все обязательные поля")
      return
    }
    
    // Category обязательна для Teacher и Senior Teacher
    if (isTeacherRole(newUser.role) && !newUser.category) {
      setError("Категория обязательна для учителей")
      return
    }

    setIsAdding(true)
    setError(null)

    try {
      // В реальном приложении здесь должен быть API вызов для создания пользователя
      await new Promise((resolve) => setTimeout(resolve, 500))

      const selectedBranch = branches.find(b => b.id === newUser.branch_id)
      const user = {
        user_id: String(Date.now()),
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        branch_name: selectedBranch?.name || null,
        branch_id: newUser.branch_id,
        category: newUser.category || null,
      }

      setUsers([...users, user])
      setNewUser({ name: "", email: "", role: "", branch_id: "", category: "" })
      setShowAddForm(false)
    } catch (err: any) {
      setError(err.message || "Ошибка при добавлении пользователя")
    } finally {
      setIsAdding(false)
    }
  }

  const updateUser = async (user: UiUser) => {
    if (!user.role) {
      setError("Роль пользователя обязательна")
      return
    }
    
    // Валидация категории для учителей
    if (isTeacherRole(user.role) && !user.category) {
      setError("Категория обязательна для учителей")
      return
    }
    
    setIsUpdating(true)
    setError(null)
    
    try {
      const { updateUser: apiUpdateUser } = await import("@/lib/api/users")
      
      // Подготавливаем данные для обновления
      const updates: any = {
        role: user.role,
        category: user.category,
        branch_id: user.branch_id,
      }
      
      await apiUpdateUser(user.user_id, updates)
      
      // Обновляем локальное состояние
      setUsers(prevUsers => 
        prevUsers.map(u => u.user_id === user.user_id ? user : u)
      )
      
      setEditingUser(null)
    } catch (error: any) {
      console.error("Failed to update user:", error)
      setError(error.message || "Ошибка при обновлении пользователя")
    } finally {
      setIsUpdating(false)
    }
  }

  const isNewUserTeacher = isTeacherRole(newUser.role)
  const isFormValid = newUser.name && newUser.email && newUser.role && newUser.branch_id && (!isNewUserTeacher || newUser.category)

  return (
    <div className="flex h-screen bg-background">
      <SidebarNav />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNav />
        <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-7xl mx-auto space-y-8">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 p-8 text-white">
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                    <Users className="h-10 w-10 text-white" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold mb-2">User Management</h1>
                    <p className="text-white/90 text-lg">Manage user accounts, roles, and permissions</p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowAddForm(true)}
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
            </div>

            {showAddForm && (
              <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white shadow-xl">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-2xl font-bold flex items-center text-blue-700">
                      <Plus className="h-6 w-6 mr-2" />
                      Add New User
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowAddForm(false)
                        setError(null)
                      }}
                      className="h-8 w-8 p-0 hover:bg-blue-100"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Full Name</label>
                      <Input
                        placeholder="Enter full name"
                        value={newUser.name}
                        onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                        className="bg-white border-gray-300 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Email</label>
                      <Input
                        type="email"
                        placeholder="user@planetenglish.ru"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        className="bg-white border-gray-300 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Role</label>
                      <Select value={newUser.role} onValueChange={(value) => {
                        setNewUser({ ...newUser, role: value, category: isTeacherRole(value) ? newUser.category : "" })
                        setError(null)
                      }}>
                        <SelectTrigger className="bg-white border-gray-300 focus:border-blue-500">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          {USER_ROLES.map((role) => (
                            <SelectItem key={role} value={role}>
                              <div className="flex items-center">
                                {(() => {
                                  const IconComponent = getRoleIcon(role)
                                  return <IconComponent className="h-4 w-4 mr-2" />
                                })()}
                                {role}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Branch</label>
                      <Select
                        value={newUser.branch_id}
                        onValueChange={(value) => {
                          setNewUser({ ...newUser, branch_id: value })
                          setError(null)
                        }}
                        disabled={branchesLoading}
                      >
                        <SelectTrigger className="bg-white border-gray-300 focus:border-blue-500">
                          <SelectValue placeholder={branchesLoading ? "Loading branches..." : "Select branch"} />
                        </SelectTrigger>
                        <SelectContent>
                          {branches.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id}>
                              {branch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* Category field - показывается только для Teacher/Senior Teacher */}
                  {isNewUserTeacher && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <Select 
                        value={newUser.category} 
                        onValueChange={(value) => {
                          setNewUser({ ...newUser, category: value })
                          setError(null)
                        }}
                      >
                        <SelectTrigger className="bg-white border-gray-300 focus:border-blue-500">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {TEACHER_CATEGORIES.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <div className="flex justify-end space-x-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowAddForm(false)
                        setError(null)
                      }}
                      className="border-gray-300 hover:bg-gray-50"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={addUser}
                      disabled={!isFormValid || isAdding}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {isAdding ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Add User
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border-0 bg-gradient-to-br from-white to-gray-50 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        placeholder="Search users by name, email, or branch..."
                        className="pl-12 h-12 text-lg border-0 bg-white shadow-sm focus:shadow-md transition-shadow"
                      />
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="h-12 px-6 border-0 bg-white shadow-sm hover:shadow-md transition-shadow"
                  >
                    <Filter className="h-5 w-5 mr-2" />
                    Filter
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-gradient-to-br from-white to-gray-50 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl font-bold flex items-center">
                  <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full mr-3"></div>
                  All Users ({users.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="grid grid-cols-12 gap-2 p-3 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-700">
                    <div className="col-span-1">#</div>
                    <div className="col-span-4">Name</div>
                    <div className="col-span-2">Role</div>
                    <div className="col-span-2">Branch</div>
                    <div className="col-span-2">Category</div>
                    <div className="col-span-1">Actions</div>
                  </div>

                  {users.map((user, index) => {
                    const RoleIcon = getRoleIcon(user.role)
                    return (
                      <div
                        key={user.user_id}
                        className="grid grid-cols-12 gap-2 p-2 border-b border-gray-100 hover:bg-gray-50 transition-colors items-center"
                      >
                        <div className="col-span-1 text-sm text-gray-500">{index + 1}</div>

                        <div className="col-span-4 flex items-center space-x-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={`/placeholder-32px.png?height=24&width=24`} />
                            <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                              {user.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{user.name}</p>
                          </div>
                        </div>

                        <div className="col-span-2">
                          <Badge
                            variant="outline"
                            className={`text-xs px-2 py-1 ${
                              user.role === "Administrator"
                                ? "bg-red-50 text-red-700 border-red-200"
                                : user.role === "Senior Teacher"
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : "bg-green-50 text-green-700 border-green-200"
                            }`}
                          >
                            <RoleIcon className="h-3 w-3 mr-1" />
                            {user.role}
                          </Badge>
                        </div>

                        <div className="col-span-2">
                          <Badge
                            variant="outline"
                            className="bg-gray-50 text-gray-700 border-gray-200 text-xs px-2 py-1"
                          >
                            {user.branch_name ?? "—"}
                          </Badge>
                        </div>

                        <div className="col-span-2">
                          {user.category ? (
                            <Badge
                              variant="outline"
                              className={`text-xs px-2 py-1 ${
                                user.category === "Partner"
                                  ? "bg-purple-50 text-purple-700 border-purple-200"
                                  : user.category === "Senior"
                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                    : user.category === "Middle"
                                      ? "bg-green-50 text-green-700 border-green-200"
                                      : user.category === "Junior"
                                        ? "bg-orange-50 text-orange-700 border-orange-200"
                                        : "bg-yellow-50 text-yellow-700 border-yellow-200"
                              }`}
                            >
                              {user.category}
                            </Badge>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </div>

                        <div className="col-span-1">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem 
                                className="cursor-pointer"
                                onClick={() => setEditingUser(user)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit User
                              </DropdownMenuItem>
                              <DropdownMenuItem className="cursor-pointer text-red-600">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
            
            {/* Edit User Modal */}
            {editingUser && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <Card className="w-full max-w-md mx-4 border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white shadow-xl">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-2xl font-bold flex items-center text-blue-700">
                        <Edit className="h-6 w-6 mr-2" />
                        Edit User
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingUser(null)
                          setError(null)
                        }}
                        className="h-8 w-8 p-0 hover:bg-blue-100"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Full Name</label>
                      <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded border">{editingUser.name}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Role</label>
                      <Select 
                        value={editingUser.role} 
                        onValueChange={(value) => {
                          setEditingUser({
                            ...editingUser, 
                            role: value, 
                            category: isTeacherRole(value) ? editingUser.category : null
                          })
                          setError(null)
                        }}
                      >
                        <SelectTrigger className="bg-white border-gray-300 focus:border-blue-500">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          {USER_ROLES.map((role) => (
                            <SelectItem key={role} value={role}>
                              <div className="flex items-center">
                                {(() => {
                                  const IconComponent = getRoleIcon(role)
                                  return <IconComponent className="h-4 w-4 mr-2" />
                                })()}
                                {role}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Branch</label>
                      <Select
                        value={editingUser.branch_id || ""}
                        onValueChange={(value) => {
                          const selectedBranch = branches.find(b => b.id === value)
                          setEditingUser({
                            ...editingUser,
                            branch_id: value,
                            branch_name: selectedBranch?.name || null
                          })
                          setError(null)
                        }}
                        disabled={branchesLoading}
                      >
                        <SelectTrigger className="bg-white border-gray-300 focus:border-blue-500">
                          <SelectValue placeholder={branchesLoading ? "Loading branches..." : "Select branch"} />
                        </SelectTrigger>
                        <SelectContent>
                          {branches.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id}>
                              {branch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {isTeacherRole(editingUser.role) && (
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                          Category <span className="text-red-500">*</span>
                        </label>
                        <Select 
                          value={editingUser.category || ""} 
                          onValueChange={(value) => {
                            setEditingUser({...editingUser, category: value})
                            setError(null)
                          }}
                        >
                          <SelectTrigger className="bg-white border-gray-300 focus:border-blue-500">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {TEACHER_CATEGORIES.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    <div className="flex justify-end space-x-3 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingUser(null)
                          setError(null)
                        }}
                        className="border-gray-300 hover:bg-gray-50"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => updateUser(editingUser)}
                        disabled={isUpdating || (isTeacherRole(editingUser.role) && !editingUser.category)}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {isUpdating ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Updating...
                          </>
                        ) : (
                          <>
                            <Edit className="h-4 w-4 mr-2" />
                            Update User
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
