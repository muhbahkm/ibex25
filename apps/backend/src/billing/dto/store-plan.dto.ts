/**
 * Store Plan DTO
 *
 * B1: Response DTO for GET /billing/plan endpoint.
 * Contains plan information, limits, features, and current usage.
 */
export interface PlanLimits {
  invoicesPerMonth?: number;
  users?: number;
  [key: string]: number | undefined;
}

export interface PlanFeatures {
  ledger?: boolean;
  reports?: boolean;
  [key: string]: boolean | undefined;
}

export interface PlanUsage {
  invoicesThisMonth: number;
  usersCount: number;
  [key: string]: number;
}

export interface StorePlanDto {
  plan: {
    code: string;
    name: string;
    description?: string;
  };
  limits: PlanLimits;
  features: PlanFeatures;
  usage: PlanUsage;
}

