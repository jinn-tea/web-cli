import { notFound } from "next/navigation";
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
  if (process.env.NODE_ENV === "production") notFound();
  return <DesignSystemView />;
}
