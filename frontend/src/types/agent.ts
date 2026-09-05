export type AgentRunStatus = 'RUNNING' | 'COMPLETED' | 'REQUIRE_CONFIRMATION' | 'BLOCKED' | 'FAILED';

export interface BuyerIntent {
  user_goal: string;
  target_categories: string[];
  budget_limit_paise: number | null;
  currency?: string;
  required_features?: string[];
  excluded_categories?: string[];
  excluded_skus?: string[];
  requested_quantities?: Record<string, number>;
  urgency?: string;
  priority?: string;
  preferences?: string[];
}

export interface ProductScoringBreakdown {
  relevance_score: number;
  category_match_score: number;
  availability_score: number;
  budget_fit_score: number;
  composite_score: number;
  rationale: string;
}

export interface ProductCandidate {
  sku: string;
  name: string;
  category: string;
  price_paise: number;
  stock_quantity: number;
  active: boolean;
  scoring?: ProductScoringBreakdown;
}

export interface AgentTraceStep {
  step: number;
  node: string;
  action: string;
  started_at?: string;
  finished_at?: string;
  duration_ms?: number;
  input_summary?: Record<string, any>;
  output_summary?: Record<string, any>;
  timestamp: string;
}

export interface RecoveryAction {
  attempt: number;
  strategy: string;
  reason: string;
  before_total_paise?: number;
  after_total_paise?: number;
  affected_skus?: string[];
  adjustments_made?: Record<string, any>;
}

export interface ProviderOffer {
  provider_id: string;
  provider_name: string;
  sku: string;
  product_name: string;
  category: string;
  price_paise: number;
  currency: string;
  stock_quantity: number;
  in_stock: boolean;
  delivery_estimate_days?: number;
  specification_fit_score: number;
  composite_rank_score: number;
  attributes?: Record<string, any>;
  quote_valid: boolean;
}

export interface NegotiationRound {
  round_number: number;
  speaker: 'BUYER_AGENT' | 'MERCHANT_AGENT';
  speaker_name: string;
  message: string;
  proposed_price_paise: number;
  concession_paise: number;
  strategy_applied: string;
  timestamp?: string;
}

export interface OfferComparisonResult {
  comparison_state: 'DISCOVERING' | 'COMPARING' | 'SELECTED' | 'NO_ALTERNATIVE';
  total_offers_evaluated: number;
  selected_offer: ProviderOffer | null;
  all_offers: ProviderOffer[];
  selection_reason: string;
  is_negotiated: boolean;
  actual_savings_paise: number;
  selection_policy: string;
  negotiation_rounds?: NegotiationRound[];
}

export interface AgentRunResult {
  run_id: string;
  request_id: string;
  user_goal: string;
  status: AgentRunStatus;
  selected_items: Array<{
    sku: string;
    quantity: number;
    name?: string;
    price_paise?: number;
  }>;
  ranked_candidates?: ProductCandidate[];
  offer_comparison?: OfferComparisonResult;
  quote?: {
    quote_id: string;
    subtotal: number;
    discounts: number;
    total: number;
    currency: string;
    signature: string;
    expires_at: string;
  };
  policy_decision?: {
    decision: 'ALLOW' | 'BLOCK' | 'REQUIRE_CONFIRMATION';
    reasons: Array<{
      code: string;
      message: string;
      details?: Record<string, any>;
    }>;
    checks: Array<{
      check: string;
      passed: boolean;
      details?: Record<string, any>;
    }>;
  };
  execution_result?: {
    success: boolean;
    status: string;
    transaction_id?: string;
    razorpay_order_id?: string;
    amount?: number;
    currency?: string;
  };
  recovery_history: RecoveryAction[];
  explanation: string;
  trace_steps: AgentTraceStep[];
}
