from fastapi import APIRouter
from app.api.health import router as health_router
from app.api.catalog import router as catalog_router
from app.api.cart import router as cart_router
from app.api.policy import router as policy_router
from app.api.checkout import router as checkout_router
from app.api.ledger import router as ledger_router
from app.api.agent import router as agent_router
from app.api.events import router as events_router
from app.api.demo import router as demo_router
from app.api.analytics import router as analytics_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(catalog_router)
api_router.include_router(cart_router)
api_router.include_router(policy_router)
api_router.include_router(checkout_router)
api_router.include_router(ledger_router)
api_router.include_router(agent_router)
api_router.include_router(events_router)
api_router.include_router(demo_router)
api_router.include_router(analytics_router)
