from fastapi import APIRouter
from app.api.health import router as health_router
from app.api.catalog import router as catalog_router
from app.api.cart import router as cart_router
from app.api.policy import router as policy_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(catalog_router)
api_router.include_router(cart_router)
api_router.include_router(policy_router)
