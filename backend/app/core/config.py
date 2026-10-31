import os
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Brightloop Subscription Management System"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    SECRET_KEY: str = "supersecretjwtkey_brightloop_subscriptions_change_in_production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    DATABASE_URL: str = "sqlite:///./brightloop.db"

    # Razorpay
    RAZORPAY_KEY_ID: str = "rzp_test_TuNd1nSE5rzBYA"
    RAZORPAY_KEY_SECRET: str = "SU24VgtcARGHWb2NQ715xqTR"
    RAZORPAY_WEBHOOK_SECRET: str = "brightloop_rzp_webhook_secret_2026"

    # Super Admin Bootstrap
    SUPER_ADMIN_NAME: str = "Super Administrator"
    SUPER_ADMIN_EMAIL: str = "admin@brightloop.io"
    SUPER_ADMIN_PASSWORD: str = "Admin@Brightloop2026!"

    # System Defaults
    DEFAULT_CURRENCY: str = "INR"
    DEFAULT_TIMEZONE: str = "UTC"
    FRONTEND_URL: str = "http://localhost:5173"

    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

