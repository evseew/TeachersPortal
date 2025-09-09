"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function DebugDataPage() {
  const [branchData, setBranchData] = useState<any>(null)
  const [teacherData, setTeacherData] = useState<any>(null)
  const [usersData, setUsersData] = useState<any>(null)
  const [syncResult, setSyncResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [migrationResult, setMigrationResult] = useState<any>(null)
  const [dbAnalysis, setDbAnalysis] = useState<any>(null)
  const [analyzing, setAnalyzing] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      console.log("Fetching leaderboard data...")
      
      // Fetch branch data
      const branchRes = await fetch("/api/leaderboard?type=branch_overall", { cache: "no-store" })
      console.log("Branch response status:", branchRes.status)
      const branchJson = await branchRes.json()
      console.log("Branch response:", branchJson)
      setBranchData(branchJson)

      // Fetch teacher data
      const teacherRes = await fetch("/api/leaderboard?type=teacher_overall", { cache: "no-store" })
      console.log("Teacher response status:", teacherRes.status)
      const teacherJson = await teacherRes.json()
      console.log("Teacher response:", teacherJson)
      setTeacherData(teacherJson)

      // Fetch users data
      const usersRes = await fetch("/api/system/users", { cache: "no-store" })
      console.log("Users response status:", usersRes.status)
      const usersJson = await usersRes.json()
      console.log("Users response:", usersJson)
      setUsersData(usersJson)
      
    } catch (err: any) {
      console.error("Error fetching data:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const syncLeaderboard = async () => {
    setSyncing(true)
    setError(null)
    try {
      console.log("Starting leaderboard sync...")
      const syncRes = await fetch("/api/system/sync-leaderboard", { 
        method: "POST",
        cache: "no-store" 
      })
      const syncJson = await syncRes.json()
      console.log("Sync response:", syncJson)
      setSyncResult(syncJson)
      
      if (syncJson.success) {
        // Refresh data after sync
        await fetchData()
      }
    } catch (err: any) {
      console.error("Error syncing:", err)
      setError(`Sync error: ${err.message}`)
    } finally {
      setSyncing(false)
    }
  }

  const runMigration = async () => {
    setMigrating(true)
    setError(null)
    try {
      console.log("Running migration...")
      const migRes = await fetch("/api/system/run-migration", { 
        method: "POST",
        cache: "no-store" 
      })
      const migJson = await migRes.json()
      console.log("Migration response:", migJson)
      setMigrationResult(migJson)
      
      if (migJson.success) {
        // Refresh data after migration
        await fetchData()
      }
    } catch (err: any) {
      console.error("Error migrating:", err)
      setError(`Migration error: ${err.message}`)
    } finally {
      setMigrating(false)
    }
  }

  const analyzeDatabase = async () => {
    setAnalyzing(true)
    setError(null)
    try {
      console.log("Analyzing database...")
      const dbRes = await fetch("/api/debug/database", { cache: "no-store" })
      const dbJson = await dbRes.json()
      console.log("Database analysis:", dbJson)
      setDbAnalysis(dbJson)
    } catch (err: any) {
      console.error("Error analyzing database:", err)
      setError(`Database analysis error: ${err.message}`)
    } finally {
      setAnalyzing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Debug: Leaderboard Data</h1>
        <div className="space-x-2">
          <Button onClick={fetchData} disabled={loading} variant="outline">
            {loading ? "Loading..." : "Refresh Data"}
          </Button>
          <Button onClick={runMigration} disabled={migrating} className="bg-purple-600 hover:bg-purple-700">
            {migrating ? "Migrating..." : "🛠️ Run Migration"}
          </Button>
          <Button onClick={analyzeDatabase} disabled={analyzing} className="bg-orange-600 hover:bg-orange-700">
            {analyzing ? "Analyzing..." : "🔍 Analyze DB"}
          </Button>
          <Button onClick={syncLeaderboard} disabled={syncing} className="bg-blue-600 hover:bg-blue-700">
            {syncing ? "Syncing..." : "🔄 Sync Data"}
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-red-800 font-semibold">Error: {error}</p>
          </CardContent>
        </Card>
      )}

      {migrationResult && (
        <Card className={`border-2 ${migrationResult.success ? 'border-purple-200 bg-purple-50' : 'border-red-200 bg-red-50'}`}>
          <CardHeader>
            <CardTitle className={migrationResult.success ? 'text-purple-800' : 'text-red-800'}>
              {migrationResult.success ? '⚙️ Migration Successful' : '❌ Migration Failed'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {migrationResult.success ? (
              <p className="text-purple-800">{migrationResult.message}</p>
            ) : (
              <div className="text-red-800">
                <p><strong>Error:</strong> {migrationResult.error}</p>
                {migrationResult.suggestion && (
                  <p className="mt-2"><strong>Suggestion:</strong> {migrationResult.suggestion}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {dbAnalysis && (
        <Card className={`border-2 ${dbAnalysis.success ? 'border-orange-200 bg-orange-50' : 'border-red-200 bg-red-50'}`}>
          <CardHeader>
            <CardTitle className={dbAnalysis.success ? 'text-orange-800' : 'text-red-800'}>
              {dbAnalysis.success ? '🔍 Database Analysis' : '❌ Analysis Failed'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dbAnalysis.success ? (
              <div className="space-y-2 text-sm">
                <p><strong>Teachers in profiles:</strong> {dbAnalysis.analysis.profiles_teachers}</p>
                <p><strong>Records in current_scores:</strong> {dbAnalysis.analysis.current_scores_records}</p>
                <p><strong>Records in teacher_metrics:</strong> {dbAnalysis.analysis.teacher_metrics_records}</p>
                <p><strong>Records from view:</strong> {dbAnalysis.analysis.view_records}</p>
                <p><strong>Missing in scores:</strong> {dbAnalysis.analysis.missing_in_scores}</p>
                <p><strong>Missing in metrics:</strong> {dbAnalysis.analysis.missing_in_metrics}</p>
                <p><strong>Phantom in scores:</strong> {dbAnalysis.analysis.phantom_in_scores}</p>
                {dbAnalysis.details?.view_sample?.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer font-semibold">View Sample (first 5)</summary>
                    <pre className="mt-2 p-2 bg-gray-100 rounded text-xs">
                      {JSON.stringify(dbAnalysis.details.view_sample, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ) : (
              <p className="text-red-800">{dbAnalysis.error}</p>
            )}
          </CardContent>
        </Card>
      )}

      {syncResult && (
        <Card className={`border-2 ${syncResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <CardHeader>
            <CardTitle className={syncResult.success ? 'text-green-800' : 'text-red-800'}>
              {syncResult.success ? '✅ Sync Successful' : '❌ Sync Failed'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {syncResult.success ? (
              <div className="space-y-2 text-sm">
                <p><strong>Teachers in profiles:</strong> {syncResult.teachers_in_profiles}</p>
                <p><strong>Phantom users removed:</strong> {syncResult.phantom_users_removed}</p>
                <p><strong>Missing teachers added:</strong> {syncResult.missing_teachers_added}</p>
                <p><strong>Final teacher count:</strong> {syncResult.final_teacher_count}</p>
                {syncResult.details?.teachers_added?.length > 0 && (
                  <div>
                    <p><strong>Added teachers:</strong></p>
                    <ul className="list-disc list-inside ml-4">
                      {syncResult.details.teachers_added.map((t: any) => (
                        <li key={t.id}>{t.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-red-800">{syncResult.error}</p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Branch Leaderboard Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Status:</strong> {branchData ? "Success" : "No data"}</p>
              <p><strong>Records:</strong> {Array.isArray(branchData) ? branchData.length : "N/A"}</p>
              {branchData?.error && (
                <p className="text-red-600"><strong>API Error:</strong> {branchData.error}</p>
              )}
              <details className="mt-4">
                <summary className="cursor-pointer font-semibold">Raw Data</summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                  {JSON.stringify(branchData, null, 2)}
                </pre>
              </details>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Teacher Leaderboard Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Status:</strong> {teacherData ? "Success" : "No data"}</p>
              <p><strong>Records:</strong> {Array.isArray(teacherData) ? teacherData.length : "N/A"}</p>
              {teacherData?.error && (
                <p className="text-red-600"><strong>API Error:</strong> {teacherData.error}</p>
              )}
              <details className="mt-4">
                <summary className="cursor-pointer font-semibold">Raw Data</summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                  {JSON.stringify(teacherData, null, 2)}
                </pre>
              </details>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Management Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Status:</strong> {usersData ? "Success" : "No data"}</p>
              <p><strong>Records:</strong> {Array.isArray(usersData) ? usersData.length : "N/A"}</p>
              <p><strong>Teachers:</strong> {Array.isArray(usersData) ? usersData.filter((u: any) => u.role === 'Teacher').length : "N/A"}</p>
              {usersData?.error && (
                <p className="text-red-600"><strong>API Error:</strong> {usersData.error}</p>
              )}
              <details className="mt-4">
                <summary className="cursor-pointer font-semibold">Teachers Only</summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                  {JSON.stringify(Array.isArray(usersData) ? usersData.filter((u: any) => u.role === 'Teacher') : [], null, 2)}
                </pre>
              </details>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
