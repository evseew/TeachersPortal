"use client"

import { useEffect, useState } from "react"
import type { Branch } from "@/lib/types/shared"
import { BranchService } from "@/lib/services/branch.service"

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
        const branchService = BranchService.getInstance()
        const data = await branchService.listBranches()
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
          const branchService = BranchService.getInstance()
        const data = await branchService.listBranches()
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
