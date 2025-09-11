export type Branch = { id: string; name: string }

export async function listBranches(): Promise<Branch[]> {
  const res = await fetch("/api/system/branches", { cache: "no-store" })
  if (!res.ok) throw new Error(`Failed to load branches (${res.status})`)
  return (await res.json()) as Branch[]
}

export async function createBranch(name: string): Promise<Branch> {
  const res = await fetch("/api/system/branches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) throw new Error(`Failed to create branch (${res.status})`)
  return (await res.json()) as Branch
}

export async function updateBranch(id: string, name: string): Promise<Branch> {
  const res = await fetch(`/api/system/branches/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) throw new Error(`Failed to update branch (${res.status})`)
  return (await res.json()) as Branch
}

export async function deleteBranch(id: string): Promise<void> {
  const res = await fetch(`/api/system/branches/${id}`, { method: "DELETE" })
  if (!res.ok) throw new Error(`Failed to delete branch (${res.status})`)
}

export interface BranchUsageInfo {
  canDelete: boolean
  linkedRecords: {
    profiles: number
    metrics: number
    profileDetails: Array<{ user_id: string; full_name: string; email: string }>
  }
}

export async function checkBranchUsage(id: string): Promise<BranchUsageInfo> {
  const res = await fetch(`/api/system/branches/${id}/check-usage`, { cache: "no-store" })
  if (!res.ok) throw new Error(`Failed to check branch usage (${res.status})`)
  return (await res.json()) as BranchUsageInfo
}


