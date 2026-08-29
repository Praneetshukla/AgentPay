from typing import Dict, Any, Optional
from datetime import datetime, timezone
import json
import logging

logger = logging.getLogger("agentpay.observability")


class SystemMetrics:
    """
    In-memory production metrics collector tracking commerce & security events.
    """
    def __init__(self):
        self.metrics = {
            "agent_runs_total": 0,
            "successful_checkouts": 0,
            "blocked_checkouts": 0,
            "confirmation_required": 0,
            "recovery_attempts": 0,
            "recovery_successes": 0,
            "recovery_failures": 0,
            "policy_blocks": 0,
            "quote_invalidations": 0,
            "webhook_rejections": 0,
            "duplicate_checkout_attempts": 0,
            "ledger_verification_failures": 0,
            "unauthorized_money_actions": 0
        }

    def inc(self, key: str, value: int = 1):
        if key in self.metrics:
            self.metrics[key] += value

    def get_snapshot(self) -> Dict[str, Any]:
        return dict(self.metrics)


metrics_collector = SystemMetrics()


def emit_structured_audit_log(
    event_type: str,
    actor: str,
    correlation_id: str,
    payload: Dict[str, Any],
    level: str = "INFO"
):
    """
    Emits structured sanitized JSON log. Never outputs API keys or HMAC secrets.
    """
    sanitized_payload = {k: v for k, v in payload.items() if "secret" not in k.lower() and "key" not in k.lower()}
    log_entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event_type": event_type,
        "actor": actor,
        "correlation_id": correlation_id,
        "payload": sanitized_payload
    }
    logger.info(json.dumps(log_entry))
