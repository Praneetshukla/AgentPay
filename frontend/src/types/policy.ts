export type PolicyDecisionType = 'ALLOW' | 'BLOCK' | 'REQUIRE_CONFIRMATION';

export interface PolicyReason {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PolicyCheckResult {
  check_name: string;
  passed: boolean;
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PolicyDecision {
  decision: PolicyDecisionType;
  policy_id?: string;
  policy_version?: number;
  quote_id?: string;
  merchant_id?: string;
  transaction_amount_paise?: number;
  currency?: string;
  reasons: PolicyReason[];
  checks: PolicyCheckResult[];
  evaluated_at: string;
  evaluation_version: string;
}

export interface PolicyDefinition {
  id: string;
  merchant_id: string;
  currency: string;
  max_transaction_amount: number;
  max_cart_items: number;
  max_quantity_per_sku: number;
  allowed_categories: string[];
  allowed_skus: string[];
  blocked_skus: string[];
  confirmation_threshold: number;
  policy_version: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}
