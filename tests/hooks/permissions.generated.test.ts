import { hasAccess } from "@/lib/auth/permissions"

describe("permissions map", () => {
  test("administrator has access to teacher child route", () => {
    expect(hasAccess("Administrator" as any, "/teacher/123")).toBe(true)
  })

  test("administrator has access to administrator root", () => {
    expect(hasAccess("Administrator" as any, "/administrator")).toBe(true)
  })

  test("regular user can't access system", () => {
    expect(hasAccess("Regular User" as any, "/system")).toBe(false)
  })
})


