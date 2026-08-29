from typing import Dict, Any, List
from pydantic import BaseModel, Field


class AttackScenario(BaseModel):
    id: str
    category: str
    description: str
    expected_outcome: str = "BLOCKED"
    payload: Dict[str, Any] = Field(default_factory=dict)


class RedTeamExecutionResult(BaseModel):
    scenario_id: str
    category: str
    description: str
    passed: bool
    unauthorized_money_actions: int = 0
    decision: str
    details: Dict[str, Any] = Field(default_factory=dict)


class SecurityScorecard(BaseModel):
    benchmark_version: str = "2.0.0"
    total_scenarios: int
    passed: int
    failed: int
    unauthorized_money_actions: int = 0
    policy_bypasses: int = 0
    double_spend_incidents: int = 0
    invalid_state_transitions: int = 0
    webhook_bypasses: int = 0
    ledger_integrity_failures: int = 0
    categories: Dict[str, Dict[str, int]] = Field(default_factory=dict)
    critical_failures: List[str] = Field(default_factory=list)
    security_score_percent: float = 100.0
