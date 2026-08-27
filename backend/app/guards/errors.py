from typing import Optional, Dict, Any


class PolicyEvaluationError(Exception):
    """Base exception for deterministic policy evaluation failures."""
    def __init__(self, code: str, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details or {}
