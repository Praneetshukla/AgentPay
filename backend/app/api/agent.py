from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, desc

from app.db.session import get_db
from app.db.models import AgentRun
from app.agent.graph import AutonomousBuyerOrchestrator
from app.agent.models import AgentBuyRequest, ConfirmCheckoutRequest, AgentRunResult, AgentTraceStep
from app.razorpay.service import ExecutionService

router = APIRouter(prefix="/agent", tags=["Autonomous AI Buyer"])


@router.post(
    "/buy",
    response_model=AgentRunResult,
    status_code=status.HTTP_200_OK,
    summary="Execute Autonomous AI Buyer Purchase Loop"
)
async def run_ai_buyer(
    request: AgentBuyRequest,
    db: Session = Depends(get_db)
):
    """
    Autonomous AI Buyer Endpoint:
    Processes natural language purchase objectives, performs catalog discovery, constructs carts,
    obtains server-authoritative signed quotes, evaluates deterministic policy gates, and if ALLOW,
    executes Razorpay Test Mode checkout with bounded recovery for planning errors.
    """
    orchestrator = AutonomousBuyerOrchestrator(db)
    state = orchestrator.run_buyer_workflow(
        user_goal=request.request,
        policy_id=request.policy_id
    )

    trace_steps = [
        AgentTraceStep(
            step=s["step"],
            node=s["node"],
            action=s["action"],
            started_at=s.get("started_at"),
            finished_at=s.get("finished_at"),
            duration_ms=s.get("duration_ms"),
            input_summary=s.get("input_summary"),
            output_summary=s.get("output_summary"),
            timestamp=s["timestamp"]
        )
        for s in state.get("trace_steps", [])
    ]

    return AgentRunResult(
        run_id=state["run_id"],
        request_id=state["request_id"],
        user_goal=state["user_goal"],
        status=state["final_status"],
        selected_items=state.get("cart_proposal", []),
        ranked_candidates=state.get("ranked_candidates", []),
        quote=state.get("quote_payload"),
        policy_decision={
            "decision": state.get("policy_decision"),
            "reasons": state.get("policy_reasons", []),
            "checks": state.get("policy_checks", [])
        } if state.get("policy_decision") else None,
        execution_result=state.get("execution_result"),
        recovery_history=state.get("recovery_history", []),
        offer_comparison=state.get("offer_comparison"),
        explanation=state.get("explanation") or state.get("failure_reason") or "Completed execution",
        trace_steps=trace_steps
    )


@router.post(
    "/confirm",
    status_code=status.HTTP_200_OK,
    summary="Explicitly Approve and Execute a Confirmation-Held Transaction"
)
async def confirm_checkout(
    request: ConfirmCheckoutRequest,
    db: Session = Depends(get_db)
):
    """
    Human-in-the-Loop Confirmation Gate:
    Re-validates quote integrity, live stock, and policy rules before executing Razorpay order.
    """
    service = ExecutionService(db)
    result = service.execute_checkout(quote_id=request.quote_id, policy_id=request.policy_id, allow_confirmation_override=True)
    return result


@router.get(
    "/runs",
    response_model=List[Dict[str, Any]],
    status_code=status.HTTP_200_OK,
    summary="List Past Autonomous AI Buyer Runs for Inspector Dashboard"
)
async def list_agent_runs(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Retrieve historical AI Buyer agent runs and state traces for Live Inspector visualization.
    """
    runs = db.scalars(select(AgentRun).order_by(desc(AgentRun.created_at)).limit(limit)).all()
    return [
        {
            "run_id": r.run_id,
            "request_id": r.request_id,
            "user_goal": r.user_goal,
            "status": r.status,
            "quote_id": r.quote_id,
            "transaction_id": r.transaction_id,
            "iteration_count": r.iteration_count,
            "recovery_count": r.recovery_count,
            "final_decision": r.final_decision,
            "explanation": r.explanation,
            "created_at": r.created_at.isoformat(),
            "completed_at": r.completed_at.isoformat() if r.completed_at else None,
            "trace_step_count": len(r.trace_log)
        }
        for r in runs
    ]


@router.get(
    "/runs/{run_id}",
    status_code=status.HTTP_200_OK,
    summary="Get Detailed Trace for a Specific AI Buyer Run"
)
async def get_agent_run_detail(
    run_id: str,
    db: Session = Depends(get_db)
):
    """
    Returns full node-by-node execution traces and decisions for an agent run.
    """
    run = db.scalars(select(AgentRun).where(AgentRun.run_id == run_id)).first()
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent run not found")
    return {
        "run_id": run.run_id,
        "request_id": run.request_id,
        "user_goal": run.user_goal,
        "status": run.status,
        "quote_id": run.quote_id,
        "transaction_id": run.transaction_id,
        "iteration_count": run.iteration_count,
        "recovery_count": run.recovery_count,
        "final_decision": run.final_decision,
        "explanation": run.explanation,
        "trace_log": run.trace_log,
        "created_at": run.created_at.isoformat(),
        "completed_at": run.completed_at.isoformat() if run.completed_at else None
    }
