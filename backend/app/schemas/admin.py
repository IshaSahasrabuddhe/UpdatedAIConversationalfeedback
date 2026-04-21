from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.schemas.chat import TaskType


class AdminConversationRow(BaseModel):
    conversation_id: int
    user_id: int
    task_type: TaskType | None = None
    sentiment: str
    rating: int | None = None
    issue_type: str
    created_at: datetime


class AdminMessageRow(BaseModel):
    id: int
    conversation_id: int
    user_id: int
    role: str
    content: str
    timestamp: datetime


class AdminFeedbackSummary(BaseModel):
    feedback_id: int | None = None
    rating: int | None = None
    sentiment: str | None = None
    positives: list[str] = Field(default_factory=list)
    negatives: list[str] = Field(default_factory=list)
    suggestions: list[str] = Field(default_factory=list)
    issue_type: str | None = None
    issue_tags: list[str] = Field(default_factory=list)
    raw_text: str = ""
    summary: str = ""
    created_at: datetime | None = None


class AdminConversationDetail(BaseModel):
    conversation: dict[str, Any]
    messages: list[AdminMessageRow]
    feedback: AdminFeedbackSummary


class AdminFeedbackRow(BaseModel):
    feedback_id: int
    conversation_id: int
    user_id: int
    rating: int | None = None
    sentiment: str
    issue_type: str
    issue_tags: list[str] = Field(default_factory=list)
    summary: str = ""
    created_at: datetime


class AdminUserRow(BaseModel):
    user_id: int
    email: str
    total_conversations: int
    created_at: datetime


class OverviewAnalytics(BaseModel):
    total_conversations: int
    avg_rating: float
    sentiment_distribution: dict[str, int]
    task_type_distribution: dict[str, int]
    top_issue_tags: list[str]
    rating_distribution: list[dict[str, int]]
    sentiment_trend: list[dict[str, int | str]]
    task_usage_trend: list[dict[str, int | str]]


class SentimentByTaskRow(BaseModel):
    task_type: str
    positive: int
    negative: int
    mixed: int


class TaskTypeInsight(BaseModel):
    count: int = 0
    avg_rating: float = 0.0
    sentiment: dict[str, int] = Field(default_factory=dict)
    top_issues: list[str] = Field(default_factory=list)


class InsightsResponse(BaseModel):
    summary: str
    top_problems: list[str] = Field(default_factory=list)
    improvement_suggestions: list[str] = Field(default_factory=list)
    task_type_breakdown: dict[str, TaskTypeInsight] = Field(default_factory=dict)
    issue_type_distribution: dict[str, int] = Field(default_factory=dict)
    top_issue_tags: list[str] = Field(default_factory=list)
    top_issue_tag_counts: list[dict[str, int | str]] = Field(default_factory=list)
