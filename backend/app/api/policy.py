from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.session import get_db
from app.db.models import Policy
from app.guards.policy import DeterministicPolicyEngine
from app.guards.models import PolicyDecision, PolicyEvaluateRequest, PolicyRead

router = APIRouter(prefix="/agent/policy", tags=["Deterministic Policy Gate"])


@router.post(
    "/evaluate",
    response_model=PolicyDecision,
    status_code=status.HTTP_200_OK,
    summary="Evaluate Authoritative Quote Against Deterministic Financial Policy"
)
async def evaluate_transaction_policy(
    request: PolicyEvaluateRequest,
    db: Session = Depends(get_db)
):
    """
    Evaluates an authoritative server quote ID against the deterministic financial policy.
    Returns structured decision: ALLOW, BLOCK, or REQUIRE_CONFIRMATION with all check audits.
    """
    engine = DeterministicPolicyEngine(db)
    return engine.evaluate_quote_policy(
        quote_id=request.quote_id,
        policy_id=request.policy_id
    )


@router.get(
    "/{policy_id}",
    response_model=PolicyRead,
    status_code=status.HTTP_200_OK,
    summary="Inspect Active Policy Rules"
)
async def get_policy_details(
    policy_id: str,
    db: Session = Depends(get_db)
):
    """
    Read policy limits, allowed categories, and threshold configurations.
    """
    policy = db.scalars(select(Policy).where(Policy.id == policy_id.strip())).first()
    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Policy '{policy_id}' not found."
        )
    return policy
