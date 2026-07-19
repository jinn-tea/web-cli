"use client";

import { OrdersScreen } from "@/features/admin/orders/components/orders-screen";
import { ROLES } from "@/constants";
import { RequireRole } from "@/lib/auth";

/**
 * Orders is admin-only today, so the page guards rather than dispatching.
 *
 * When a second role gets its own orders surface, this becomes
 * `<RoleScreens screens={{ admin: …, member: … }} />` and the domain's shared
 * pieces move to `features/common/orders`.
 */
export default function OrdersPage() {
  return (
    <RequireRole roles={[ROLES[0]]}>
      <OrdersScreen />
    </RequireRole>
  );
}
