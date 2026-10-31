from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.core.database import SessionLocal, engine
from app.models import Base
from app.core.init_db import init_db

# Import routers
from app.api.v1.auth import router as auth_router
from app.api.v1.users import router as users_router
from app.api.v1.customers import router as customers_router
from app.api.v1.products import router as products_router
from app.api.v1.plans import router as plans_router
from app.api.v1.quotations import router as quotations_router
from app.api.v1.subscriptions import router as subscriptions_router
from app.api.v1.invoices import router as invoices_router
from app.api.v1.payments import router as payments_router
from app.api.v1.discounts import router as discounts_router
from app.api.v1.reports import router as reports_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.audit import router as audit_router
from app.api.v1.settings import router as settings_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure all tables exist before initializing/seeding
    Base.metadata.create_all(bind=engine)
    # Startup: seed DB
    db = SessionLocal()
    try:
        init_db(db)
    finally:
        db.close()
    yield
    # Shutdown

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Standardized Error Handling
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": f"HTTP_{exc.status_code}",
                "message": exc.detail,
                "details": {}
            }
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Request validation failed.",
                "details": exc.errors()
            }
        }
    )

@app.get("/health")
@app.get("/api/v1/health")
def health_check():
    return {"status": "ok", "app": settings.PROJECT_NAME, "version": "1.0.0"}

# Mount API v1 Routers
api_v1 = settings.API_V1_STR
app.include_router(auth_router, prefix=f"{api_v1}/auth", tags=["Authentication"])
app.include_router(users_router, prefix=f"{api_v1}/users", tags=["Users & Staff"])
app.include_router(customers_router, prefix=f"{api_v1}/customers", tags=["Customers"])
app.include_router(products_router, prefix=f"{api_v1}/products", tags=["Products & Variants"])
app.include_router(plans_router, prefix=f"{api_v1}/plans", tags=["Plans & Taxes"])
app.include_router(quotations_router, prefix=f"{api_v1}/quotations", tags=["Quotations"])
app.include_router(subscriptions_router, prefix=f"{api_v1}/subscriptions", tags=["Subscriptions"])
app.include_router(invoices_router, prefix=f"{api_v1}/invoices", tags=["Invoices"])
app.include_router(payments_router, prefix=f"{api_v1}/payments", tags=["Payments & Refunds"])
app.include_router(discounts_router, prefix=f"{api_v1}/discounts", tags=["Discounts"])
app.include_router(reports_router, prefix=f"{api_v1}/reports", tags=["Reports & Analytics"])
app.include_router(notifications_router, prefix=f"{api_v1}/notifications", tags=["Notifications"])
app.include_router(audit_router, prefix=f"{api_v1}/audit-logs", tags=["Audit Logs"])
app.include_router(settings_router, prefix=f"{api_v1}/settings", tags=["System Settings"])

