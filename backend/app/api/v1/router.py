from fastapi import APIRouter
from app.api.v1.endpoints import (
    health,
    auth,
    categories,
    expenses,
    budgets,
    dashboard,
)

api_v1_router = APIRouter(prefix="/api/v1")

api_v1_router.include_router(health.router, tags=["Health"])
api_v1_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_v1_router.include_router(categories.router, prefix="/categories", tags=["Categories"])
api_v1_router.include_router(expenses.router, prefix="/expenses", tags=["Expenses"])
api_v1_router.include_router(budgets.router, prefix="/budgets", tags=["Budgets"])
api_v1_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
