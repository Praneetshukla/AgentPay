export type AgentRunStatus = 'RUNNING' | 'COMPLETED' | 'REQUIRE_CONFIRMATION' | 'BLOCKED' | 'FAILED';

export interface BuyerIntent {
  user_goal: string;
  target_categories: string[];
  budget_limit_paise: number | null;
  requested_quantities: Record<string, number>;
  preferences: string[];
  priority: string;
}

export interface AgentTraceStep {
  step: number;
  node: string;
  action: string;
  input_summary?: Record<string, any>;
  output_summary?: Record<string, any>;
  timestamp: string;
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
  recovery_history: Array<{
    attempt: number;
    strategy: string;
    reason: string;
    adjustments_made: Record<string, any>;
  }>;
  explanation: string;
  trace_steps: AgentTraceStep[];
}
