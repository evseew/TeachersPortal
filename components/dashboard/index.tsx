"use client"

export default function DashboardContent() {
  return (
    <div className="space-y-4 sm:space-y-6 w-full min-w-0">
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Dashboard</h2>
        <p className="text-gray-500">
          Основные функции портала доступны в разделе <strong>September Rating</strong>.
        </p>
        <p className="text-gray-400 mt-2">
          Используйте навигацию слева для доступа к рейтингам и управлению KPI.
        </p>
      </div>
    </div>
  )
}
