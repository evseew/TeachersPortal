"use client"

import { useState, useEffect } from "react"
import { AlertTriangle, Loader2, Users, BarChart } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import type { Branch, BranchUsageInfo } from "@/lib/types/shared"

interface BranchDeleteConfirmationProps {
  branch: Branch | null
  isOpen: boolean
  onClose: () => void
  onConfirm: (branchId: string) => Promise<boolean>
  isDeleting?: boolean
}

export function BranchDeleteConfirmation({
  branch,
  isOpen,
  onClose,
  onConfirm,
  isDeleting = false,
}: BranchDeleteConfirmationProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [usageInfo, setUsageInfo] = useState<BranchUsageInfo | null>(null)
  const [isLoadingUsage, setIsLoadingUsage] = useState(false)

  // Загружаем информацию о связанных записях при открытии диалога
  useEffect(() => {
    if (isOpen && branch) {
      setIsLoadingUsage(true)
      // Вариант A: используем API-роут, чтобы не тянуть server-only код в клиент
      fetch(`/api/system/branches/${branch.id}/check-usage`)
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`Failed to load usage (${res.status})`))))
        .then((data: BranchUsageInfo) => {
          setUsageInfo(data)
        })
        .catch((err) => {
          console.error("Failed to load branch usage:", err)
          setUsageInfo(null)
        })
        .finally(() => setIsLoadingUsage(false))
    } else {
      setUsageInfo(null)
    }
  }, [isOpen, branch])

  const handleConfirm = async () => {
    if (!branch) return
    
    setIsSubmitting(true)
    try {
      const success = await onConfirm(branch.id)
      if (success) {
        onClose()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <AlertDialogTitle>Подтверждение удаления</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3">
            <p>
              Вы действительно хотите удалить филиал{" "}
              <span className="font-semibold text-foreground">«{branch?.name}»</span>?
            </p>
            
            {isLoadingUsage ? (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Проверка связанных записей...</span>
              </div>
            ) : usageInfo ? (
              <div className="space-y-2">
                {usageInfo.linkedRecords.profiles > 0 || usageInfo.linkedRecords.metrics > 0 ? (
                  <>
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <span className="text-sm font-medium text-amber-800">
                          Обнаружены связанные записи
                        </span>
                      </div>
                      <div className="space-y-1 text-sm text-amber-700">
                        {usageInfo.linkedRecords.profiles > 0 && (
                          <div className="flex items-center space-x-2">
                            <Users className="h-3 w-3" />
                            <span>{usageInfo.linkedRecords.profiles} преподавателей</span>
                          </div>
                        )}
                        {usageInfo.linkedRecords.metrics > 0 && (
                          <div className="flex items-center space-x-2">
                            <BarChart className="h-3 w-3" />
                            <span>{usageInfo.linkedRecords.metrics} записей метрик</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {usageInfo.linkedRecords.profileDetails.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          Затронутые преподаватели:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {usageInfo.linkedRecords.profileDetails.slice(0, 3).map((profile) => (
                            <Badge key={profile.user_id} variant="secondary" className="text-xs">
                              {profile.full_name || profile.email}
                            </Badge>
                          ))}
                          {usageInfo.linkedRecords.profileDetails.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{usageInfo.linkedRecords.profileDetails.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-700">
                      ✓ Связанных записей не найдено. Филиал можно безопасно удалить.
                    </p>
                  </div>
                )}
              </div>
            ) : null}
            
            <p className="text-sm text-muted-foreground">
              <strong>Внимание:</strong> При удалении все связанные преподаватели 
              потеряют привязку к этому филиалу. Данные о метриках сохранятся, 
              но связь с филиалом будет обнулена.
            </p>
            <p className="text-sm font-medium text-destructive">
              Это действие нельзя отменить.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel 
            disabled={isSubmitting || isDeleting}
            onClick={onClose}
          >
            Отмена
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isSubmitting || isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {(isSubmitting || isDeleting) ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Удаление...
              </>
            ) : (
              "Удалить филиал"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
