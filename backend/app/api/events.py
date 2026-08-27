import asyncio
from typing import AsyncGenerator
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from app.core.events import event_broker

router = APIRouter(prefix="/events", tags=["Live Inspector SSE Stream"])


@router.get(
    "/stream",
    summary="Server-Sent Events (SSE) Stream for Live Inspector Dashboard"
)
async def event_stream(request: Request) -> StreamingResponse:
    """
    Subscribes the frontend to the live AgentPay event stream.
    Streams structured node actions, policy gates, and ledger updates in real-time.
    """
    async def sse_generator() -> AsyncGenerator[str, None]:
        queue = event_broker.subscribe()
        try:
            # Yield initial connection ping
            yield f"event: connected\ndata: {{\"status\": \"connected\", \"message\": \"AgentPay Inspector SSE Stream Active\"}}\n\n"

            while True:
                # Check client disconnect
                if await request.is_disconnected():
                    break

                try:
                    event_data = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield f"event: execution_event\ndata: {event_data}\n\n"
                except asyncio.TimeoutError:
                    # Keepalive heartbeat ping
                    yield ": ping\n\n"
        finally:
            event_broker.unsubscribe(queue)

    return StreamingResponse(
        sse_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
