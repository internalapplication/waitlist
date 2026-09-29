import type { PaymentStatus } from "@/types/payment";

/** Payment state stored in Clerk private (server-only) metadata. */
export interface PaidState {
  hasPaid: boolean;
  paymentStatus: PaymentStatus | null;
  paymentRef: string | null;
  paymentId: string | null;
  /** Every payment id that has already granted access (newest last). Makes webhook redelivery harmless. */
  paymentIds: string[];
  lastRefundedPaymentId: string | null;
  paymentUpdatedAt: string | null;
}
