import type { ObjectId } from "mongodb";
import type { PaymentStatus } from "@/types/payment";

export type ProjectStatus =
  | "draft"
  | "pending_payment"
  | "paid"
  | "generating"
  | "completed"
  | "failed";

export interface Project {
  _id?: ObjectId;
  userId: string;
  businessDescription: string;
  generatedName?: string;
  generatedHtml?: string;
  status: ProjectStatus;
  /** Successful generations used under the payment in `quotaPaymentId`. */
  generationCount?: number;
  quotaPaymentId?: string;
  designIndex?: number;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Shape sent to the browser (no Mongo types, ISO date strings). */
export interface PublicProject {
  id: string;
  businessDescription: string;
  generatedName?: string;
  generatedHtml?: string;
  status: ProjectStatus;
  updatedAt: string;
}

export interface GenerationUsage {
  used: number;
  limit: number;
  remaining: number;
}

export interface CurrentProjectResponse {
  user: { hasPaid: boolean };
  project: PublicProject | null;
  payment: { status: PaymentStatus; updatedAt: string } | null;
  generation: { inProgress: boolean };
  usage: GenerationUsage;
}

export interface GenerateResponse {
  project: PublicProject;
  html: string;
  reused?: boolean;
  usage: GenerationUsage;
}
