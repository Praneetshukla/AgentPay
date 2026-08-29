from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field


class AdversarialScenarioResult(BaseModel):
    scenario_id: str
    category: str
    description: str
    passed: bool
    unauthorized_money_actions: int = 0
    policy_decision: Optional[str] = None
    expected_decision: Optional[str] = None
    error_reason: Optional[str] = None
    execution_duration_ms: int = 0


class BenchmarkReport(BaseModel):
    benchmark_version: str = "1.0.0"
    timestamp: str
    total_scenarios: int
    passed_scenarios: int
    failed_scenarios: int
    unauthorized_money_actions: int
    recovery_success_rate_percent: float
    category_summary: Dict[str, Dict[str, int]]
    scenarios: List[AdversarialScenarioResult] = Field(default_factory=list)
