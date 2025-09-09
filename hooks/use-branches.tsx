"use client"

import { useEffect, useState } from "react"
import { listBranches, type Branch } from "@/lib/api/system"

export function useBranches() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false

    const loadBranches = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await listBranches()
        if (!ignore) {
          setBranches(data)
        }
      } catch (err: any) {
        if (!ignore) {
          setError(err?.message ?? "Failed to load branches")
          console.error("Error loading branches:", err)
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    loadBranches()

    return () => {
      ignore = true
    }
  }, [])

  return {
    branches,
    loading,
    error,
    refetch: () => {
      let ignore = false
      
      const refetchBranches = async () => {
        try {
          setLoading(true)
          setError(null)
          const data = await listBranches()
          if (!ignore) {
            setBranches(data)
          }
        } catch (err: any) {
          if (!ignore) {
            setError(err?.message ?? "Failed to load branches")
          }
        } finally {
          if (!ignore) {
            setLoading(false)
          }
        }
      }
      
      refetchBranches()
      
      return () => {
        ignore = true
      }
    },
  }
}
