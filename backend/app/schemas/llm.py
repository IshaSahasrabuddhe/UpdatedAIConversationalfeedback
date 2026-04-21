from typing import Literal

from pydantic import BaseModel, Field, field_validator


class ConversationTurnAnalysis(BaseModel):
    intent: Literal["feedback", "rating", "off_topic"]
    issue_type: Literal["technical", "usability", "quality", "none"]
    sentiment: Literal["positive", "negative", "mixed"]
    is_feedback_present: bool


class IntentClassification(BaseModel):
    intent: Literal["YES", "NO", "OFF_TOPIC"]
    confidence: float = Field(ge=0, le=1)
    reasoning: str


class RatingExtraction(BaseModel):
    rating: int | None = Field(default=None, ge=1, le=5)
    is_vague: bool
    clarification_needed: str


class SentimentAnalysis(BaseModel):
    sentiment: Literal["positive", "negative", "mixed"]
    confidence: float = Field(ge=0, le=1)


class FeedbackExtraction(BaseModel):
    sentiment: Literal["positive", "negative", "mixed"]
    positives: list[str] = Field(default_factory=list)
    negatives: list[str] = Field(default_factory=list)
    suggestions: list[str] = Field(default_factory=list)
    issue_tags: list[str] = Field(default_factory=list)

    @field_validator("issue_tags")
    @classmethod
    def normalize_issue_tags(cls, tags: list[str]) -> list[str]:
        normalized: list[str] = []
        for tag in tags:
            cleaned = "_".join(part for part in tag.strip().lower().replace("-", "_").split() if part)
            if cleaned and cleaned not in normalized:
                normalized.append(cleaned)
        return normalized[:8]


class IssueClassification(BaseModel):
    issue_type: Literal["technical", "quality", "usability", "none"]
    rationale: str


class HumanFollowupQuestionResult(BaseModel):
    questions: list[str] = Field(default_factory=list, max_length=1)


class FeedbackInsightsResult(BaseModel):
    summary: str
    top_problems: list[str] = Field(default_factory=list)
    improvement_suggestions: list[str] = Field(default_factory=list)
