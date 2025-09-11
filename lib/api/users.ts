import { UserRole, TeacherCategory } from "@/lib/constants/user-management"

export type UserRow = {
  user_id: string
  email: string
  full_name: string
  role: UserRole
  category: TeacherCategory | null
  branch_id: string | null
  branch_name: string | null
}

export async function listUsers(q?: string): Promise<UserRow[]> {
  const url = new URL("/api/system/users", window.location.origin)
  if (q) url.searchParams.set("q", q)
  const res = await fetch(url.toString(), { cache: "no-store" })
  if (!res.ok) throw new Error(`Failed to load users (${res.status})`)
  return (await res.json()) as UserRow[]
}

export async function updateUser(id: string, updates: Partial<Pick<UserRow, "role" | "category" | "branch_id">>) {
  const res = await fetch(`/api/system/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  })
  if (!res.ok) {
    const e = await res.json().catch(() => ({}))
    throw new Error(e?.error ?? `Failed to update user (${res.status})`)
  }
}

export async function deleteUser(id: string) {
  const res = await fetch(`/api/system/users/${id}`, {
    method: "DELETE",
  })
  if (!res.ok) {
    const e = await res.json().catch(() => ({}))
    throw new Error(e?.error ?? `Failed to delete user (${res.status})`)
  }
  return await res.json()
}


