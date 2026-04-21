from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.models.conversation import Conversation
from app.models.feedback import Feedback
from app.models.message import Message
from app.models.user import User
from app.schemas.admin import (
    AdminConversationDetail,
    AdminConversationRow,
    AdminFeedbackRow,
    AdminFeedbackSummary,
    AdminMessageRow,
    AdminUserRow,
    InsightsResponse,
    OverviewAnalytics,
    SentimentByTaskRow,
)
from app.services.chains.llm_service import FeedbackLLMService


class AdminService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.llm_service = FeedbackLLMService()

    def list_conversations(self) -> list[AdminConversationRow]:
        rows = self.db.execute(
            select(
                Conversation.id,
                Conversation.user_id,
                Conversation.task_type,
                Feedback.sentiment,
                Feedback.rating,
                Feedback.issue_type,
                Conversation.created_at,
            )
            .outerjoin(Feedback, Feedback.conversation_id == Conversation.id)
            .order_by(Conversation.created_at.desc())
        ).all()

        return [
            AdminConversationRow(
                conversation_id=row[0],
                user_id=row[1],
                task_type=row[2],
                sentiment=row[3] or "mixed",
                rating=row[4],
                issue_type=row[5] or "none",
                created_at=row[6],
            )
            for row in rows
        ]

    def get_conversation_detail(self, conversation_id: int) -> AdminConversationDetail:
        conversation = self.db.get(Conversation, conversation_id)
        if not conversation:
            raise ValueError("Conversation not found")

        messages = self.db.scalars(
            select(Message).where(Message.conversation_id == conversation_id).order_by(Message.timestamp)
        ).all()
        feedback = self.db.scalar(
            select(Feedback).where(Feedback.conversation_id == conversation_id).order_by(Feedback.id)
        )

        return AdminConversationDetail(
            conversation={
                "id": conversation.id,
                "user_id": conversation.user_id,
                "state": conversation.state,
                "title": conversation.title,
                "created_at": conversation.created_at,
                "task_type": conversation.task_type,
                "prompt": conversation.prompt or "",
                "ai_output": conversation.ai_output or "",
                "ai_output_file_url": conversation.ai_output_file_url or "",
            },
            messages=[
                AdminMessageRow(
                    id=message.id,
                    conversation_id=message.conversation_id,
                    user_id=conversation.user_id,
                    role=message.role.value if hasattr(message.role, "value") else str(message.role),
                    content=message.content,
                    timestamp=message.timestamp,
                )
                for message in messages
            ],
            feedback=AdminFeedbackSummary(
                feedback_id=feedback.id if feedback else None,
                rating=feedback.rating if feedback else None,
                sentiment=feedback.sentiment if feedback else None,
                positives=feedback.positives if feedback else [],
                negatives=feedback.negatives if feedback else [],
                suggestions=feedback.suggestions if feedback else [],
                issue_type=feedback.issue_type if feedback else None,
                issue_tags=feedback.issue_tags if feedback else [],
                raw_text=feedback.raw_text if feedback else "",
                summary=feedback.summary if feedback else "",
                created_at=feedback.created_at if feedback else None,
            ),
        )

    def list_feedbacks(self) -> list[AdminFeedbackRow]:
        rows = self.db.execute(
            select(
                Feedback.id,
                Feedback.conversation_id,
                Conversation.user_id,
                Feedback.rating,
                Feedback.sentiment,
                Feedback.issue_type,
                Feedback.issue_tags,
                Feedback.summary,
                Feedback.created_at,
            )
            .join(Conversation, Conversation.id == Feedback.conversation_id)
            .order_by(Feedback.created_at.desc())
        ).all()

        return [
            AdminFeedbackRow(
                feedback_id=row[0],
                conversation_id=row[1],
                user_id=row[2],
                rating=row[3],
                sentiment=row[4],
                issue_type=row[5],
                issue_tags=row[6] or [],
                summary=row[7] or "",
                created_at=row[8],
            )
            for row in rows
        ]

    def list_users(self) -> list[AdminUserRow]:
        rows = self.db.execute(
            select(
                User.id,
                User.email,
                func.count(Conversation.id).label("total_conversations"),
                User.created_at,
            )
            .outerjoin(Conversation, Conversation.user_id == User.id)
            .group_by(User.id, User.email, User.created_at)
            .order_by(func.count(Conversation.id).desc(), User.created_at.desc())
        ).all()

        return [
            AdminUserRow(
                user_id=row[0],
                email=row[1],
                total_conversations=row[2],
                created_at=row[3],
            )
            for row in rows
        ]

    def get_overview(self) -> OverviewAnalytics:
        total_conversations = self.db.scalar(select(func.count(Conversation.id))) or 0
        avg_rating = self.db.scalar(select(func.avg(Feedback.rating)).where(Feedback.rating.is_not(None))) or 0.0

        sentiment_rows = self.db.execute(
            select(Feedback.sentiment, func.count(Feedback.id)).group_by(Feedback.sentiment)
        ).all()
        task_rows = self.db.execute(
            select(func.coalesce(Conversation.task_type, "unknown"), func.count(Conversation.id)).group_by(Conversation.task_type)
        ).all()

        joined_rows = self.db.execute(
            select(
                Conversation.created_at,
                func.coalesce(Conversation.task_type, "text"),
                Feedback.sentiment,
                Feedback.rating,
                Feedback.issue_tags,
            ).outerjoin(Feedback, Feedback.conversation_id == Conversation.id)
        ).all()

        all_tags = [tag for row in joined_rows for tag in (row[4] or [])]
        top_issue_tags = [tag for tag, _ in Counter(all_tags).most_common(8)]

        rating_counter = Counter()
        sentiment_trend: dict[str, dict[str, int | str]] = {}
        task_usage_trend: dict[str, dict[str, int | str]] = {}

        for created_at, task_type, sentiment, rating, _ in joined_rows:
            date_key = _date_key(created_at)
            if rating is not None and 1 <= int(rating) <= 5:
                rating_counter[int(rating)] += 1

            sentiment_entry = sentiment_trend.setdefault(
                date_key,
                {"date": date_key, "positive": 0, "negative": 0, "mixed": 0},
            )
            normalized_sentiment = sentiment if sentiment in {"positive", "negative", "mixed"} else "mixed"
            sentiment_entry[normalized_sentiment] = int(sentiment_entry.get(normalized_sentiment, 0)) + 1

            usage_entry = task_usage_trend.setdefault(
                date_key,
                {"date": date_key, "text": 0, "image": 0, "audio": 0, "video": 0, "document": 0},
            )
            normalized_task = task_type if task_type in {"text", "image", "audio", "video", "document"} else "text"
            usage_entry[normalized_task] = int(usage_entry.get(normalized_task, 0)) + 1

        return OverviewAnalytics(
            total_conversations=int(total_conversations),
            avg_rating=round(float(avg_rating), 2),
            sentiment_distribution={row[0]: row[1] for row in sentiment_rows},
            task_type_distribution={row[0]: row[1] for row in task_rows},
            top_issue_tags=top_issue_tags,
            rating_distribution=[{"rating": rating, "count": rating_counter.get(rating, 0)} for rating in range(1, 6)],
            sentiment_trend=[sentiment_trend[key] for key in sorted(sentiment_trend.keys())],
            task_usage_trend=[task_usage_trend[key] for key in sorted(task_usage_trend.keys())],
        )

    def get_sentiment_by_task(self) -> list[SentimentByTaskRow]:
        rows = self.db.execute(
            select(
                func.coalesce(Conversation.task_type, "unknown").label("task_type"),
                func.sum(case((Feedback.sentiment == "positive", 1), else_=0)).label("positive"),
                func.sum(case((Feedback.sentiment == "negative", 1), else_=0)).label("negative"),
                func.sum(case((Feedback.sentiment == "mixed", 1), else_=0)).label("mixed"),
            )
            .outerjoin(Feedback, Feedback.conversation_id == Conversation.id)
            .group_by(Conversation.task_type)
            .order_by(func.count(Conversation.id).desc())
        ).all()

        return [
            SentimentByTaskRow(
                task_type=row[0],
                positive=int(row[1] or 0),
                negative=int(row[2] or 0),
                mixed=int(row[3] or 0),
            )
            for row in rows
        ]

    def get_insights(self) -> InsightsResponse:
        conversation_feedback_rows = self.db.execute(
            select(
                func.coalesce(Conversation.task_type, "text"),
                func.coalesce(Feedback.sentiment, "mixed"),
                func.coalesce(Feedback.issue_type, "unclear"),
                Feedback.issue_tags,
                Feedback.negatives,
                Feedback.suggestions,
                Feedback.rating,
            ).outerjoin(Feedback, Feedback.conversation_id == Conversation.id)
        ).all()

        negatives = [item for row in conversation_feedback_rows for item in (row[4] or [])]
        suggestions = [item for row in conversation_feedback_rows for item in (row[5] or [])]
        issue_tags = [item for row in conversation_feedback_rows for item in (row[3] or [])]

        result = self.llm_service.generate_feedback_insights(
            negatives=negatives,
            suggestions=suggestions,
            issue_tags=issue_tags,
        )

        task_types = ["text", "image", "audio", "video", "document"]
        task_type_breakdown: dict[str, dict[str, object]] = {
            task_type: {"count": 0, "avg_rating": 0.0, "sentiment": {"positive": 0, "negative": 0, "mixed": 0}, "top_issues": []}
            for task_type in task_types
        }
        issue_type_counter: Counter[str] = Counter()
        task_issue_counters: dict[str, Counter[str]] = {task_type: Counter() for task_type in task_types}
        task_rating_sums: defaultdict[str, int] = defaultdict(int)
        task_rating_counts: defaultdict[str, int] = defaultdict(int)

        for task_type, sentiment, issue_type, tags, _, _, rating in conversation_feedback_rows:
            normalized_task = task_type if task_type in task_type_breakdown else "text"
            normalized_sentiment = sentiment if sentiment in {"positive", "negative", "mixed"} else "mixed"
            normalized_issue_type = issue_type if issue_type in {"technical", "quality", "usability"} else "unclear"

            task_type_breakdown[normalized_task]["count"] = int(task_type_breakdown[normalized_task]["count"]) + 1
            sentiment_map = task_type_breakdown[normalized_task]["sentiment"]
            if isinstance(sentiment_map, dict):
                sentiment_map[normalized_sentiment] = int(sentiment_map.get(normalized_sentiment, 0)) + 1

            if rating is not None:
                task_rating_sums[normalized_task] += int(rating)
                task_rating_counts[normalized_task] += 1

            issue_type_counter[normalized_issue_type] += 1
            for tag in tags or []:
                task_issue_counters[normalized_task][tag] += 1

        for task_type in task_types:
            task_type_breakdown[task_type]["top_issues"] = [
                tag for tag, _ in task_issue_counters[task_type].most_common(3)
            ]
            if task_rating_counts[task_type]:
                task_type_breakdown[task_type]["avg_rating"] = round(
                    task_rating_sums[task_type] / task_rating_counts[task_type], 2
                )

        return InsightsResponse(
            summary=result.summary,
            top_problems=result.top_problems,
            improvement_suggestions=result.improvement_suggestions,
            task_type_breakdown=task_type_breakdown,
            issue_type_distribution={
                "technical": issue_type_counter.get("technical", 0),
                "quality": issue_type_counter.get("quality", 0),
                "usability": issue_type_counter.get("usability", 0),
                "unclear": issue_type_counter.get("unclear", 0),
            },
            top_issue_tags=[tag for tag, _ in Counter(issue_tags).most_common(8)],
            top_issue_tag_counts=[
                {"tag": tag, "count": count}
                for tag, count in Counter(issue_tags).most_common(8)
            ],
        )


def _date_key(value: datetime | None) -> str:
    if not value:
        return "unknown"
    return value.date().isoformat()
