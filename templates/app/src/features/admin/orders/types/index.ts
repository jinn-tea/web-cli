import type { GenericStatus } from "@/lib/badges";

/**
 * Domain types stay private to the domain. A type only moves up to
 * `src/types/` once a SECOND domain genuinely receives the same shape from the
 * wire — promoting speculatively is how a shared folder turns into a dumping
 * ground.
 */
export interface Order {
  id: string;
  reference: string;
  customerName: string;
  status: GenericStatus;
  total: number;
  currency: string;
  createdAt: string;
}
