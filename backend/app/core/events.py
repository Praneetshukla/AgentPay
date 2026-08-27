import asyncio
import json
from datetime import datetime, timezone
from typing import Dict, Any, Optional, AsyncGenerator
from pydantic import BaseModel, Field


class AgentExecutionEvent(BaseModel):
    event_id: str = Field(..., description="Unique event ID")
    run_id: Optional[str] = None
    transaction_id: Optional[str] = None
    quote_id: Optional[str] = None
    event_type: str  # NODE_START, NODE_END, QUOTE_CREATED, POLICY_EVALUATED, ORDER_CREATED, WEBHOOK_PROCESSED, AUDIT_APPENDED
    node: Optional[str] = None
    status: str  # SUCCESS, BLOCKED, REQUIRE_CONFIRMATION, FAILED, RUNNING
    timestamp: str
    duration_ms: Optional[int] = None
    explanation: Optional[str] = None
    payload: Dict[str, Any] = Field(default_factory=dict)


class EventBroker:
    """
    In-memory async broadcast event broker for live SSE stream delivery.
    Easily replaceable with Redis / Postgres LISTEN/NOTIFY in distributed setups.
    """

    def __init__(self):
        self._subscribers: set[asyncio.Queue] = set()

    def subscribe(self) -> asyncio.Queue:
        queue = asyncio.Queue(maxsize=100)
        self._subscribers.add(queue)
        return queue

    def unsubscribe(self, queue: asyncio.Queue) -> None:
        self._subscribers.discard(queue)

    async def publish(self, event: AgentExecutionEvent) -> None:
        """Sanitize event payload and broadcast to all connected SSE clients."""
        sanitized_event = self._sanitize_event(event)
        event_json = sanitized_event.model_dump_json()

        for queue in list(self._subscribers):
            try:
                if queue.full():
                    try:
                        queue.get_nowait()
                    except asyncio.QueueEmpty:
                        pass
                queue.put_nowait(event_json)
            except Exception:
                self._subscribers.discard(queue)

    def _sanitize_event(self, event: AgentExecutionEvent) -> AgentExecutionEvent:
        """Strip sensitive secrets from event payload before publishing."""
        sensitive_substrings = [
            "secret", "key_secret", "webhook_secret", "api_key",
            "cart_hmac_secret", "razorpay_key_secret", "razorpay_webhook_secret",
            "openai_api_key", "secret_key"
        ]

        def _is_sensitive(k: str) -> bool:
            k_lower = k.lower()
            return any(s in k_lower for s in sensitive_substrings)

        def _clean(obj: Any) -> Any:
            if isinstance(obj, dict):
                return {k: ("***REDACTED***" if _is_sensitive(k) else _clean(v)) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [_clean(item) for item in obj]
            return obj

        clean_payload = _clean(event.payload)
        return AgentExecutionEvent(
            event_id=event.event_id,
            run_id=event.run_id,
            transaction_id=event.transaction_id,
            quote_id=event.quote_id,
            event_type=event.event_type,
            node=event.node,
            status=event.status,
            timestamp=event.timestamp,
            duration_ms=event.duration_ms,
            explanation=event.explanation,
            payload=clean_payload
        )


# Global Singleton Broker Instance
event_broker = EventBroker()
