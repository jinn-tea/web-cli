"use client";

import { RoleScreens } from "@/components/shared/role-screens";
import { AdminDashboard } from "@/features/admin/dashboard/components/admin-dashboard";
import { MemberDashboard } from "@/features/member/dashboard/components/member-dashboard";

/**
 * One URL, one surface per role.
 *
 * The page stays THIS thin — it dispatches and nothing else. Because `screens`
 * is a `Record<Role, ReactNode>`, adding a role to `ROLES` breaks this file at
 * compile time until the new surface is decided, which is exactly the reminder
 * you want.
 */
export default function DashboardPage() {
  return (
    <RoleScreens
      screens={{
        admin: <AdminDashboard />,
        member: <MemberDashboard />,
      }}
    />
  );
}
