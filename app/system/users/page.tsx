"use client"

import { useEffect, useState } from "react"
import { Users, Plus, Search, Filter, Edit, Trash2, Shield, User, Crown, X, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { SmartAvatar } from "@/components/ui/smart-avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { SidebarNav } from "@/components/sidebar-nav"
import { TopNav } from "@/components/top-nav"
// import { useBranchOperations } from "@/hooks/use-branch-operations" // Временно отключено из-за проблем с Supabase на клиенте
import { USER_ROLES, TEACHER_CATEGORIES, isTeacherRole } from "@/lib/constants/user-management"
import { listUsers, updateUser as updateUserApi, deleteUser as deleteUserApi } from "@/lib/clients/users.client"

type UiUser = {
  user_id: string
  name: string
  email: string
  role: string
  branch_name: string | null
  branch_id: string | null
  category: string | null
  avatar_url: string | null
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
  const [filteredUsers, setFilteredUsers] = useState<UiUser[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  
  // Быстрые фильтры
  const [selectedRole, setSelectedRole] = useState<string>("")
  const [selectedBranch, setSelectedBranch] = useState<string>("")
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  
  const [editingUser, setEditingUser] = useState<UiUser | null>(null)
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "",
    branch_id: "",
    category: "",
  })
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Временная заглушка для филиалов
  const [branches, setBranches] = useState<Array<{id: string, name: string}>>([])
  const [branchesLoading, setBranchesLoading] = useState(false)

  // Подсчет активных фильтров
  const activeFiltersCount = [
    selectedRole && selectedRole !== "all" ? selectedRole : null,
    selectedBranch && selectedBranch !== "all" ? selectedBranch : null, 
    selectedCategory && selectedCategory !== "all" ? selectedCategory : null,
    searchTerm
  ].filter(Boolean).length

  useEffect(() => {
    const load = async () => {
      try {
        const rows = await listUsers()
        const mappedUsers = rows.map((r) => ({
          user_id: r.user_id,
          name: r.full_name,
          email: r.email,
          role: r.role,
          branch_name: r.branch_name,
          branch_id: r.branch_id,
          category: r.category,
          avatar_url: r.avatar_url,
        }))
        setUsers(mappedUsers)
        setFilteredUsers(mappedUsers)
      } catch (e) {
        console.warn("Users API unavailable; staying with empty list")
      }
    }
    
    const loadBranches = async () => {
      try {
        setBranchesLoading(true)
        const response = await fetch('/api/system/branches')
        if (response.ok) {
          const data = await response.json()
          setBranches(data)
        }
      } catch (e) {
        console.warn("Branches API unavailable; staying with empty list")
      } finally {
        setBranchesLoading(false)
      }
    }
    
    void load()
    void loadBranches()
  }, [])

  // Фильтрация пользователей по всем критериям
  useEffect(() => {
    let filtered = users

    // Фильтр по поисковому запросу
    if (searchTerm.trim()) {
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.branch_name || "").toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Фильтр по роли
    if (selectedRole && selectedRole !== "all") {
      filtered = filtered.filter(user => user.role === selectedRole)
    }

    // Фильтр по филиалу
    if (selectedBranch && selectedBranch !== "all") {
      filtered = filtered.filter(user => user.branch_id === selectedBranch)
    }

    // Фильтр по категории
    if (selectedCategory && selectedCategory !== "all") {
      filtered = filtered.filter(user => user.category === selectedCategory)
    }

    setFilteredUsers(filtered)
  }, [users, searchTerm, selectedRole, selectedBranch, selectedCategory])


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
      // Подготавливаем данные для обновления
      const updates: any = {
        role: user.role,
        category: user.category,
        branch_id: user.branch_id,
      }
      
      await updateUserApi(user.user_id, updates)
      
      // Обновляем локальное состояние
      const updatedUsers = users.map(u => u.user_id === user.user_id ? user : u)
      setUsers(updatedUsers)
      setFilteredUsers(updatedUsers)
      
      setEditingUser(null)
    } catch (error: any) {
      console.error("Failed to update user:", error)
      setError(error.message || "Ошибка при обновлении пользователя")
    } finally {
      setIsUpdating(false)
    }
  }

  const deleteUser = async (user: UiUser) => {
    if (!confirm(`Вы уверены, что хотите удалить пользователя ${user.name} (${user.email})?`)) {
      return
    }
    
    setIsDeleting(user.user_id)
    setError(null)
    
    try {
      await deleteUserApi(user.user_id)
      
      // Обновляем локальное состояние
      const updatedUsers = users.filter(u => u.user_id !== user.user_id)
      setUsers(updatedUsers)
      setFilteredUsers(updatedUsers)
      
    } catch (error: any) {
      console.error("Failed to delete user:", error)
      setError(error.message || "Ошибка при удалении пользователя")
    } finally {
      setIsDeleting(null)
    }
  }

  const isNewUserTeacher = isTeacherRole(newUser.role)
  const isFormValid = newUser.name && newUser.email && newUser.role && newUser.branch_id && (!isNewUserTeacher || newUser.category)

  // Синхронизация пользователей
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<any>(null)

  const syncUsers = async () => {
    setIsSyncing(true)
    setSyncResult(null)
    setError(null)
    
    try {
      const response = await fetch('/api/system/sync-users/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Ошибка синхронизации')
      }
      
      setSyncResult(result)
      
      // Обновляем список пользователей
      const rows = await listUsers()
      const mappedUsers = rows.map((r) => ({
        user_id: r.user_id,
        name: r.full_name,
        email: r.email,
        role: r.role,
        branch_name: r.branch_name,
        branch_id: r.branch_id,
        category: r.category,
        avatar_url: r.avatar_url,
      }))
      setUsers(mappedUsers)
      setFilteredUsers(mappedUsers)
      
    } catch (error: any) {
      console.error('Ошибка синхронизации:', error)
      setError(error.message || 'Произошла ошибка при синхронизации')
    } finally {
      setIsSyncing(false)
    }
  }

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

              {syncResult && (
                <Alert variant="default" className="border-green-200 bg-green-50">
                  <AlertCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <strong>Синхронизация завершена!</strong><br/>
                    Добавлено: {syncResult.results?.added || 0}, 
                    Обновлено: {syncResult.results?.updated || 0}, 
                    Без изменений: {syncResult.results?.unchanged || 0}
                    {syncResult.results?.errors?.length > 0 && (
                      <span className="text-orange-600">
                        <br/>Ошибок: {syncResult.results.errors.length}
                      </span>
                    )}
                  </AlertDescription>
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
                  onClick={syncUsers}
                  disabled={isSyncing}
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm disabled:opacity-50"
                  title="Синхронизировать пользователей из Pyrus"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {isSyncing ? 'Syncing...' : 'Sync from Pyrus'}
                </Button>
              </div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
            </div>


            <Card className="border-0 bg-gradient-to-br from-white to-gray-50 shadow-lg">
              <CardContent className="p-6">
                {/* Поиск */}
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        placeholder="Search users by name, email, or branch..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-12 h-12 text-lg border-0 bg-white shadow-sm focus:shadow-md transition-shadow"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-gradient-to-br from-white to-gray-50 shadow-lg">
              <CardHeader className="pb-4">
                {/* Заголовок и фильтры в одной строке */}
                <div className="grid grid-cols-12 gap-2 items-center">
                  {/* Заголовок и badge */}
                  <div className="col-span-5 flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full mr-3"></div>
                      <h2 className="text-2xl font-bold">
                        All Users ({filteredUsers.length}{filteredUsers.length !== users.length ? ` of ${users.length}` : ""})
                      </h2>
                    </div>
                    {activeFiltersCount > 0 && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200 ml-3">
                        {activeFiltersCount} фильтр{activeFiltersCount === 1 ? '' : activeFiltersCount < 5 ? 'а' : 'ов'}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Фильтр по роли - выровнен с колонкой Role */}
                  <div className="col-span-2">
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                      <SelectTrigger className="w-full h-10 bg-white shadow-sm">
                        <SelectValue placeholder="Все роли" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все роли</SelectItem>
                        {USER_ROLES.map((role) => (
                          <SelectItem key={role} value={role}>{role}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Фильтр по филиалу - выровнен с колонкой Branch */}
                  <div className="col-span-2">
                    <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                      <SelectTrigger className="w-full h-10 bg-white shadow-sm">
                        <SelectValue placeholder="Все филиалы" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все филиалы</SelectItem>
                        {branches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Фильтр по категории - выровнен с колонкой Category */}
                  <div className="col-span-2">
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="w-full h-10 bg-white shadow-sm">
                        <SelectValue placeholder="Все категории" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все категории</SelectItem>
                        {TEACHER_CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Кнопка очистки фильтров - в колонке Actions */}
                  <div className="col-span-1 flex justify-center">
                    {activeFiltersCount > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedRole("")
                          setSelectedBranch("")
                          setSelectedCategory("")
                          setSearchTerm("")
                        }}
                        className="h-10 px-3 bg-white shadow-sm hover:shadow-md transition-shadow"
                        title="Очистить все фильтры"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
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

                  {filteredUsers.map((user, index) => {
                    const RoleIcon = getRoleIcon(user.role)
                    const isBeingDeleted = isDeleting === user.user_id
                    return (
                      <div
                        key={user.user_id}
                        className={`grid grid-cols-12 gap-2 p-2 border-b border-gray-100 hover:bg-gray-50 transition-colors items-center ${isBeingDeleted ? 'opacity-50' : ''}`}
                      >
                        <div className="col-span-1 text-sm text-gray-500">{index + 1}</div>

                        <div className="col-span-4 flex items-center space-x-2">
                          <SmartAvatar 
                            email={user.email} 
                            name={user.name} 
                            size="sm"
                            showTooltip={true}
                            avatarUrl={user.avatar_url}
                          />
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
                            title={user.branch_name ?? ""}
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

                        <div className="col-span-1 flex items-center space-x-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0 hover:bg-blue-100"
                            onClick={() => setEditingUser(user)}
                            disabled={isBeingDeleted}
                            title="Edit user"
                          >
                            <Edit className="h-3 w-3 text-blue-600" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0 hover:bg-red-100"
                            onClick={() => deleteUser(user)}
                            disabled={isBeingDeleted}
                            title="Delete user"
                          >
                            {isBeingDeleted ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-400"></div>
                            ) : (
                              <Trash2 className="h-3 w-3 text-red-600" />
                            )}
                          </Button>
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
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Email</label>
                      <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded border">{editingUser.email}</p>
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
