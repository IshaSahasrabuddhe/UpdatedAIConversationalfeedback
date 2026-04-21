from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes import admin, auth, chat
from app.core.config import get_settings
from app.db.base import Base
from app.db.migrations import run_startup_migrations
from app.db.session import engine
from app.models import Conversation, Feedback, Message, User
from app.services.file_storage import LocalFileStorage

settings = get_settings()

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

LocalFileStorage()
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.on_event("startup")
def on_startup() -> None:
    _ = (User, Conversation, Message, Feedback)
    Base.metadata.create_all(bind=engine)
    run_startup_migrations(engine)


@app.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(auth.router, prefix=settings.api_v1_prefix)
app.include_router(auth.admin_router, prefix=settings.api_v1_prefix)
app.include_router(chat.router, prefix=settings.api_v1_prefix)
app.include_router(admin.router, prefix=settings.api_v1_prefix)
