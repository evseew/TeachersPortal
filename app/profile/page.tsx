"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { User, Mail, Building, Calendar, Edit3, Save, X, Smile } from "lucide-react"
import SidebarNav from "@/components/sidebar-nav"
import TopNav from "@/components/top-nav"

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [profileData, setProfileData] = useState({
    name: "—",
    email: "—",
    role: "Teacher",
    branch: "—",
    joinDate: "",
    phone: "",
    profileEmoji: "",
    avatar_url: "/placeholder-user.jpg",
  })

  const [editData, setEditData] = useState(profileData)

  useEffect(() => {
    const load = async () => {
      // Пытаемся вытянуть текущую сессию (если включат Auth на сервере)
      try {
        const { getSession } = await import("next-auth/react")
        const session = await getSession()
        const email = session?.user?.email ?? profileData.email
        // Берём профиль из API Users по email
        const res = await fetch(`/api/system/users`)
        if (res.ok) {
          const users = (await res.json()) as Record<string, unknown>[]
          const u = users.find((x) => x.email === email)
          if (u) {
            setProfileData((prev) => ({
              ...prev,
              name: String(u.full_name ?? email),
              email,
              role: String(u.role),
              branch: String(u.branch_name ?? "—"),
            }))
            setEditData((prev) => ({ ...prev, name: String(u.full_name ?? email) }))
          }
        }
      } catch {
        // локально без авторизации профиль останется моковым
      }
    }
    void load()
  }, [profileData.email])

  const emojiOptions = [
    "😊",
    "😎",
    "🤓",
    "😇",
    "🙂",
    "😄",
    "😃",
    "😁",
    "😆",
    "😅",
    "🤗",
    "🤔",
    "😌",
    "😏",
    "🙃",
    "😋",
    "😛",
    "🤪",
    "🤩",
    "🥳",
    "👨‍💼",
    "👩‍💼",
    "👨‍🏫",
    "👩‍🏫",
    "👨‍💻",
    "👩‍💻",
    "🧑‍🎓",
    "👨‍🎓",
    "👩‍🎓",
    "🤵",
  ]

  const handleSave = () => {
    setProfileData(editData)
    setIsEditing(false)
    setShowEmojiPicker(false)
  }

  const handleCancel = () => {
    setEditData(profileData)
    setIsEditing(false)
    setShowEmojiPicker(false)
  }

  const handleEmojiSelect = (emoji: string) => {
    setEditData({ ...editData, profileEmoji: emoji })
    setShowEmojiPicker(false)
  }

  const clearEmoji = () => {
    setEditData({ ...editData, profileEmoji: "" })
  }

  return (
    <div className="flex h-screen bg-background">
      <SidebarNav />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNav />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Профиль пользователя</h1>
                <p className="text-muted-foreground">Управление личной информацией и настройками</p>
              </div>
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)} className="bg-[#7A9B28] hover:bg-[#6A8B18]">
                  <Edit3 className="mr-2 h-4 w-4" />
                  Редактировать
                </Button>
              ) : (
                <div className="flex space-x-2">
                  <Button onClick={handleSave} className="bg-[#7A9B28] hover:bg-[#6A8B18]">
                    <Save className="mr-2 h-4 w-4" />
                    Сохранить
                  </Button>
                  <Button variant="outline" onClick={handleCancel}>
                    <X className="mr-2 h-4 w-4" />
                    Отмена
                  </Button>
                </div>
              )}
            </div>

            {/* Profile Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Avatar className="h-20 w-20">
                      {profileData.profileEmoji ? (
                        <div className="flex items-center justify-center w-full h-full text-4xl bg-gray-100">
                          {profileData.profileEmoji}
                        </div>
                      ) : (
                        <>
                          <AvatarImage src={profileData.avatar_url} />
                          <AvatarFallback className="text-lg">АП</AvatarFallback>
                        </>
                      )}
                    </Avatar>
                    {isEditing && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0 bg-transparent"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      >
                        <Smile className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-2xl">{profileData.name}</CardTitle>
                    <CardDescription className="text-lg">{profileData.email}</CardDescription>
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge variant="secondary" className="bg-[#7A9B28] text-white">
                        {profileData.role}
                      </Badge>
                      <Badge variant="outline">{profileData.branch}</Badge>
                    </div>
                  </div>
                </div>

                {showEmojiPicker && (
                  <div className="mt-4 p-4 border rounded-lg bg-white shadow-lg">
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-sm font-medium">Выберите эмодзи для профиля</Label>
                      {editData.profileEmoji && (
                        <Button size="sm" variant="outline" onClick={clearEmoji}>
                          Очистить
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-10 gap-2 max-h-32 overflow-y-auto">
                      {emojiOptions.map((emoji, index) => (
                        <button
                          key={index}
                          className="text-2xl p-2 hover:bg-gray-100 rounded transition-colors"
                          onClick={() => handleEmojiSelect(emoji)}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </CardHeader>
            </Card>

            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="mr-2 h-5 w-5" />
                  Личная информация
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Полное имя</Label>
                    {isEditing ? (
                      <Input
                        id="name"
                        value={editData.name}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      />
                    ) : (
                      <p className="mt-1 text-sm text-muted-foreground">{profileData.name}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="phone">Телефон</Label>
                    {isEditing ? (
                      <Input
                        id="phone"
                        value={editData.phone}
                        onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                      />
                    ) : (
                      <p className="mt-1 text-sm text-muted-foreground">{profileData.phone}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Work Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building className="mr-2 h-5 w-5" />
                  Рабочая информация
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Email</Label>
                    <div className="flex items-center mt-1">
                      <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">{profileData.email}</p>
                    </div>
                  </div>
                  <div>
                    <Label>Дата присоединения</Label>
                    <div className="flex items-center mt-1">
                      <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">{profileData.joinDate}</p>
                    </div>
                  </div>
                  <div>
                    <Label>Роль</Label>
                    <p className="mt-1 text-sm text-muted-foreground">{profileData.role}</p>
                  </div>
                  <div>
                    <Label>Филиал</Label>
                    <p className="mt-1 text-sm text-muted-foreground">{profileData.branch}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
