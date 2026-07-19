import { redirect } from "next/navigation";
import { DEFAULT_AUTHED_ROUTE } from "@/constants";

/**
 * "/" has no content of its own.
 *
 * Middleware has already decided whether this request carries a session, so an
 * unauthenticated visitor never reaches here — it redirected them to login.
 */
export default function RootPage() {
  redirect(DEFAULT_AUTHED_ROUTE);
}
