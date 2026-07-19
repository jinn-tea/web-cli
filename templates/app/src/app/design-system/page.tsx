import { notFound } from "next/navigation";
import { serverEnv } from "@/config/env";
import { DesignSystemView } from "./design-system-view";

/**
 * Living reference for the design system.
 *
 * Kept OUT of production (`notFound()`), so it costs nothing in the shipped
 * app while remaining the one place to see every token, type step and shared
 * component side by side. Update it whenever you add a token or a component —
 * a reference nobody trusts is worse than none.
 */
export const metadata = {
  title: "Design system",
};

export default function DesignSystemPage() {
  if (serverEnv.NODE_ENV === "production") notFound();
  return <DesignSystemView />;
}
