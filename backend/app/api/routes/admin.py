from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import require_admin_token
from app.db.session import get_db
from app.schemas.admin import (
    AdminConversationDetail,
    AdminConversationRow,
    AdminFeedbackRow,
    AdminUserRow,
    InsightsResponse,
    OverviewAnalytics,
    SentimentByTaskRow,
)
from app.services.admin_service import AdminService

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin_token)])


@router.get("/conversations", response_model=list[AdminConversationRow])
def list_admin_conversations(db: Session = Depends(get_db)) -> list[AdminConversationRow]:
    return AdminService(db).list_conversations()


@router.get("/conversation/{conversation_id}", response_model=AdminConversationDetail)
def get_admin_conversation(conversation_id: int, db: Session = Depends(get_db)) -> AdminConversationDetail:
    try:
        return AdminService(db).get_conversation_detail(conversation_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/feedbacks", response_model=list[AdminFeedbackRow])
def list_admin_feedbacks(db: Session = Depends(get_db)) -> list[AdminFeedbackRow]:
    return AdminService(db).list_feedbacks()


@router.get("/users", response_model=list[AdminUserRow])
def list_admin_users(db: Session = Depends(get_db)) -> list[AdminUserRow]:
    return AdminService(db).list_users()


@router.get("/analytics/overview", response_model=OverviewAnalytics)
def get_admin_overview(db: Session = Depends(get_db)) -> OverviewAnalytics:
    return AdminService(db).get_overview()


@router.get("/analytics/sentiment-by-task", response_model=list[SentimentByTaskRow])
def get_admin_sentiment_by_task(db: Session = Depends(get_db)) -> list[SentimentByTaskRow]:
    return AdminService(db).get_sentiment_by_task()


@router.get("/insights", response_model=InsightsResponse)
def get_admin_insights(db: Session = Depends(get_db)) -> InsightsResponse:
    return AdminService(db).get_insights()
