from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from typing import Generator
from sqlalchemy import create_engine, event, DateTime, Numeric, BigInteger, Integer
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.core.config import settings

# BigInteger for MySQL, Integer for SQLite autoincrement support
IDType = BigInteger().with_variant(Integer, "sqlite")

db_url = settings.DATABASE_URL
connect_args = {}

if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
    # Resolve relative sqlite URL to absolute project root so running from
    # either project root or backend/ always hits the same database file.
    if db_url.startswith("sqlite:///./") or db_url == "sqlite:///brightloop.db":
        db_filename = db_url.replace("sqlite:///./", "").replace("sqlite:///", "")
        # backend/app/core/database.py -> .parent (core) -> .parent (app) -> .parent (backend) -> .parent (root)
        root_dir = Path(__file__).resolve().parent.parent.parent.parent
        resolved_db = root_dir / db_filename
        db_url = f"sqlite:///{resolved_db.as_posix()}"

engine = create_engine(
    db_url,
    connect_args=connect_args,
    pool_pre_ping=True
)

# Enable foreign keys for SQLite
if db_url.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def utcnow() -> datetime:
    return datetime.now(timezone.utc)
