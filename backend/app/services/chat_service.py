from __future__ import annotations

import logging

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.conversation import Conversation
from app.models.enums import ConversationState, MessageRole
from app.models.feedback import Feedback
from app.models.message import Message
from app.models.user import User
from app.schemas.chat import ConversationMetadata
from app.schemas.llm import ConversationTurnAnalysis, FeedbackExtraction, RatingExtraction
from app.services.chains.llm_service import FeedbackLLMService

logger = logging.getLogger(__name__)


class ChatService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.llm_service = FeedbackLLMService()

    def create_conversation(self, user: User) -> tuple[Conversation, str]:
        conversation = Conversation(
            user_id=user.id,
            state=ConversationState.START,
            context=self._default_context(),
        )
        self.db.add(conversation)
        self.db.flush()
        assistant_message = self._advance_without_user_message(conversation)
        self.db.commit()
        self.db.refresh(conversation)
        return conversation, assistant_message

    def list_conversations(self, user: User) -> list[Conversation]:
        return list(
            self.db.scalars(
                select(Conversation)
                .where(Conversation.user_id == user.id)
                .order_by(Conversation.created_at.desc())
            )
        )

    def get_conversation(self, user: User, conversation_id: int) -> Conversation:
        conversation = self.db.scalar(
            select(Conversation).where(
                Conversation.id == conversation_id,
                Conversation.user_id == user.id,
            )
        )
        if not conversation:
            raise ValueError("Conversation not found")
        return conversation

    def get_metadata(self, conversation: Conversation) -> ConversationMetadata:
        return ConversationMetadata(
            task_type=conversation.task_type,
            prompt=conversation.prompt or "",
            ai_output=conversation.ai_output or "",
            ai_output_file_url=conversation.ai_output_file_url or "",
            is_locked=self._metadata_locked(conversation) or any(message.role == MessageRole.USER for message in conversation.messages),
        )

    def process_message(
        self,
        user: User,
        conversation_id: int,
        content: str,
        *,
        task_type: str | None = None,
        prompt: str | None = None,
        ai_output: str | None = None,
        ai_output_file_url: str | None = None,
    ) -> tuple[Conversation, str]:
        conversation = self.get_conversation(user, conversation_id)
        cleaned_content = content.strip()

        if not cleaned_content:
            assistant_message = self._respond(
                conversation,
                "I am still here. Share anything that stood out, even if it is just one quick detail.",
            )
            self.db.commit()
            self.db.refresh(conversation)
            return conversation, assistant_message

        self._store_metadata_on_first_message(
            conversation,
            task_type=task_type,
            prompt=prompt,
            ai_output=ai_output,
            ai_output_file_url=ai_output_file_url,
        )

        self.db.add(
            Message(
                conversation_id=conversation.id,
                role=MessageRole.USER,
                content=cleaned_content,
            )
        )

        assistant_message = self._advance_state(conversation, cleaned_content)
        self.db.commit()
        self.db.refresh(conversation)
        return conversation, assistant_message

    def _advance_without_user_message(self, conversation: Conversation) -> str:
        if conversation.state == ConversationState.START:
            conversation.state = ConversationState.ASK_FEEDBACK
            assistant_message = "I would love to hear how the AI experience went. What worked well, and what did not?"
            self._add_assistant_message(conversation, assistant_message)
            return assistant_message
        return "How can I help with your feedback?"

    def _advance_state(self, conversation: Conversation, user_input: str) -> str:
        previous_state = conversation.state
        self._log_state("before", conversation, user_input)

        if previous_state == ConversationState.END and not self._is_user_declining(user_input):
            conversation.state = ConversationState.FEEDBACK_CONTINUE

        if self._is_user_declining(user_input):
            conversation.state = ConversationState.END
            self._log_state("end", conversation, user_input)
            return self._respond(conversation, "Understood. I will pause here. If you think of anything else later, just send it.")

        if previous_state == ConversationState.START:
            return self._advance_without_user_message(conversation)

        rating_already_captured = self._get_context_value(conversation, "rating") is not None
        conversation.state = ConversationState.PRE_FEEDBACK_ANALYSIS
        analysis = self.llm_service.analyze_turn(user_input)

        if analysis.is_feedback_present:
            reply = self._handle_feedback_turn(conversation, user_input, analysis, previous_state)
            self._log_state("after_feedback", conversation, user_input)
            return reply

        if not rating_already_captured:
            rating_result = self.llm_service.extract_rating(user_input)
            if rating_result.rating is not None or rating_result.is_vague:
                reply = self._handle_rating_turn(conversation, rating_result)
                self._log_state("after_rating", conversation, user_input)
                return reply

        if previous_state == ConversationState.ISSUE_HANDLING:
            conversation.state = ConversationState.ISSUE_HANDLING
            reply = self._build_issue_follow_up(
                self._get_context_value(conversation, "active_issue_type", "none"),
                self._get_context_value(conversation, "last_issue_tags", []),
                detailed=True,
            )
            self._log_state("issue_follow_up", conversation, user_input)
            return self._respond(conversation, reply)

        conversation.state = ConversationState.FEEDBACK_CONTINUE
        self._log_state("redirect", conversation, user_input)
        return self._respond(
            conversation,
            "I want to keep this focused on your AI experience. If there is another issue, highlight, or idea, tell me and I will add it.",
        )

    def _handle_feedback_turn(
        self,
        conversation: Conversation,
        user_input: str,
        analysis: ConversationTurnAnalysis,
        previous_state: ConversationState,
    ) -> str:
        extracted = self.llm_service.extract_feedback(user_input)
        issue = self.llm_service.classify_issue(user_input)
        rating_already_captured = self._get_context_value(conversation, "rating") is not None

        if not rating_already_captured:
            embedded_rating = self._extract_embedded_rating_if_present(user_input)
            if embedded_rating is not None:
                self._set_rating(conversation, embedded_rating)

        if self._has_extractable_feedback(extracted):
            conversation.state = ConversationState.STORE_FEEDBACK
            self._store_feedback_entry(
                conversation=conversation,
                user_input=user_input,
                extracted=extracted,
                sentiment=extracted.sentiment,
                issue_type=issue.issue_type,
            )

        self._set_context_value(conversation, "active_issue_type", issue.issue_type)
        self._set_context_value(conversation, "last_issue_tags", extracted.issue_tags)
        self._set_context_value(conversation, "last_sentiment", extracted.sentiment)

        contextual_follow_up = self._maybe_build_contextual_follow_up(
            conversation=conversation,
            extracted=extracted,
            issue_type=issue.issue_type,
            previous_state=previous_state,
        )

        if contextual_follow_up:
            conversation.state = ConversationState.ISSUE_HANDLING
            base_reply = contextual_follow_up
        elif self._get_context_value(conversation, "rating") is None:
            conversation.state = ConversationState.ASK_RATING
            base_reply = self._build_rating_prompt()
        else:
            conversation.state = ConversationState.FEEDBACK_CONTINUE
            base_reply = self._build_continue_prompt(conversation, extracted)

        reply = self._append_human_followup_if_needed(
            conversation=conversation,
            base_reply=base_reply,
            user_feedback=user_input,
            extracted=extracted,
            issue_type=issue.issue_type,
        )
        return self._respond(conversation, reply)

    def _handle_rating_turn(self, conversation: Conversation, rating_result: RatingExtraction) -> str:
        if self._get_context_value(conversation, "rating") is not None:
            conversation.state = ConversationState.FEEDBACK_CONTINUE
            return self._respond(conversation, "I already have your rating. If there is more feedback, I can add it.")

        if rating_result.is_vague or rating_result.rating is None:
            conversation.state = ConversationState.HANDLE_VAGUE_RATING
            return self._respond(conversation, rating_result.clarification_needed)

        self._set_rating(conversation, rating_result.rating)

        if self._feedback_count(conversation) > 0:
            conversation.state = ConversationState.FEEDBACK_CONTINUE
            return self._respond(conversation, self._build_post_rating_response(conversation, rating_result.rating))

        conversation.state = ConversationState.FEEDBACK_CONTINUE
        return self._respond(conversation, self._build_post_rating_prompt(rating_result.rating))

    def _set_rating(self, conversation: Conversation, rating: int) -> None:
        self._set_context_value(conversation, "rating", rating)
        self._update_feedback_ratings(conversation, rating)

    def _update_feedback_ratings(self, conversation: Conversation, rating: int) -> None:
        feedback = self._get_or_create_feedback_entry(conversation)
        feedback.rating = rating

    def _store_feedback_entry(
        self,
        conversation: Conversation,
        user_input: str,
        extracted: FeedbackExtraction,
        sentiment: str,
        issue_type: str,
    ) -> None:
        feedback = self._get_or_create_feedback_entry(conversation)
        feedback.rating = self._get_context_value(conversation, "rating")
        feedback.sentiment = self._resolve_conversation_sentiment(conversation, sentiment)
        feedback.positives = self._merge_lists(feedback.positives, extracted.positives)
        feedback.negatives = self._merge_lists(feedback.negatives, extracted.negatives)
        feedback.suggestions = self._merge_lists(feedback.suggestions, extracted.suggestions)
        feedback.issue_tags = self._merge_lists(feedback.issue_tags, extracted.issue_tags)
        feedback.raw_text = self._merge_raw_text(feedback.raw_text, user_input)
        feedback.summary = self._build_feedback_summary(feedback)
        self._append_feedback_memory(conversation, extracted, sentiment, issue_type)
        feedback.issue_type = self._resolve_issue_type(conversation)

    def _append_feedback_memory(
        self,
        conversation: Conversation,
        extracted: FeedbackExtraction,
        sentiment: str,
        issue_type: str,
    ) -> None:
        context = self._conversation_context(conversation)
        memory = context.setdefault(
            "feedback_memory",
            {
                "positives": [],
                "negatives": [],
                "suggestions": [],
                "issue_types": [],
                "issue_tags": [],
                "sentiments": [],
                "entry_count": 0,
                "follow_ups_asked": [],
                "human_followups_asked": [],
            },
        )

        memory["positives"] = self._merge_lists(memory.get("positives"), extracted.positives)
        memory["negatives"] = self._merge_lists(memory.get("negatives"), extracted.negatives)
        memory["suggestions"] = self._merge_lists(memory.get("suggestions"), extracted.suggestions)
        memory["issue_tags"] = self._merge_lists(memory.get("issue_tags"), extracted.issue_tags)
        if issue_type != "none":
            memory["issue_types"].append(issue_type)
        memory["sentiments"].append(sentiment)
        memory["entry_count"] += 1

        context["feedback_captured"] = memory["entry_count"] > 0
        context["issue_type"] = self._resolve_issue_type_from_memory(memory)
        context["sentiment"] = self._resolve_sentiment_from_memory(memory)
        conversation.context = context

    def _conversation_context(self, conversation: Conversation) -> dict:
        context = dict(conversation.context or {})
        default_context = self._default_context()
        merged = {**default_context, **context}
        merged["feedback_memory"] = {**default_context["feedback_memory"], **context.get("feedback_memory", {})}
        return merged

    def _set_context_value(self, conversation: Conversation, key: str, value) -> None:
        context = self._conversation_context(conversation)
        context[key] = value
        conversation.context = context

    def _get_context_value(self, conversation: Conversation, key: str, default=None):
        return self._conversation_context(conversation).get(key, default)

    def _default_context(self) -> dict:
        return {
            "rating": None,
            "active_issue_type": "none",
            "last_issue_tags": [],
            "last_sentiment": "mixed",
            "feedback_captured": False,
            "metadata_locked": False,
            "feedback_memory": {
                "positives": [],
                "negatives": [],
                "suggestions": [],
                "issue_types": [],
                "issue_tags": [],
                "sentiments": [],
                "entry_count": 0,
                "follow_ups_asked": [],
                "human_followups_asked": [],
            },
        }

    def _feedback_count(self, conversation: Conversation) -> int:
        memory = self._conversation_context(conversation).get("feedback_memory", {})
        return int(memory.get("entry_count", 0))

    def _merge_lists(self, old_list, new_list) -> list[str]:
        if not old_list:
            old_list = []
        if not new_list:
            new_list = []
        return list(set(old_list + new_list))

    def _merge_raw_text(self, existing_text: str | None, new_text: str) -> str:
        existing_parts = [part for part in (existing_text or "").split("\n---\n") if part.strip()]
        if new_text not in existing_parts:
            existing_parts.append(new_text)
        return "\n---\n".join(existing_parts)

    def _build_feedback_summary(self, feedback: Feedback) -> str:
        summary_parts: list[str] = []
        if feedback.rating is not None:
            summary_parts.append(f"Rating {feedback.rating}/5")
        if feedback.sentiment:
            summary_parts.append(f"Sentiment {feedback.sentiment}")
        if feedback.negatives:
            summary_parts.append(f"Key issue: {feedback.negatives[0]}")
        elif feedback.suggestions:
            summary_parts.append(f"Top request: {feedback.suggestions[0]}")
        elif feedback.positives:
            summary_parts.append(f"Highlight: {feedback.positives[0]}")
        return " | ".join(summary_parts)

    def _get_feedback_entries(self, conversation: Conversation) -> list[Feedback]:
        return list(self.db.scalars(select(Feedback).where(Feedback.conversation_id == conversation.id).order_by(Feedback.id)))

    def _get_or_create_feedback_entry(self, conversation: Conversation) -> Feedback:
        feedback_entries = self._get_feedback_entries(conversation)
        if not feedback_entries:
            feedback = Feedback(
                conversation_id=conversation.id,
                rating=self._get_context_value(conversation, "rating"),
                sentiment=self._resolve_conversation_sentiment(conversation, self._get_context_value(conversation, "last_sentiment", "mixed")),
                positives=[],
                negatives=[],
                suggestions=[],
                issue_type=self._resolve_issue_type(conversation),
                issue_tags=[],
                raw_text="",
                summary="",
            )
            self.db.add(feedback)
            self.db.flush()
            return feedback

        primary = feedback_entries[0]
        if len(feedback_entries) > 1:
            for extra in feedback_entries[1:]:
                primary.rating = primary.rating if primary.rating is not None else extra.rating
                primary.positives = self._merge_lists(primary.positives, extra.positives)
                primary.negatives = self._merge_lists(primary.negatives, extra.negatives)
                primary.suggestions = self._merge_lists(primary.suggestions, extra.suggestions)
                primary.issue_tags = self._merge_lists(primary.issue_tags, extra.issue_tags)
                primary.raw_text = self._merge_raw_text(primary.raw_text, extra.raw_text)
                primary.summary = primary.summary or extra.summary
                self.db.delete(extra)
        return primary

    def _resolve_issue_type(self, conversation: Conversation) -> str:
        memory = self._conversation_context(conversation).get("feedback_memory", {})
        return self._resolve_issue_type_from_memory(memory)

    def _resolve_issue_type_from_memory(self, memory: dict) -> str:
        issue_types = [issue for issue in memory.get("issue_types", []) if issue and issue != "none"]
        if not issue_types:
            return "none"

        counts: dict[str, int] = {}
        for issue_type in issue_types:
            counts[issue_type] = counts.get(issue_type, 0) + 1

        priority = {"technical": 3, "quality": 2, "usability": 1, "none": 0}
        return max(counts, key=lambda issue: (counts[issue], priority.get(issue, 0)))

    def _resolve_conversation_sentiment(self, conversation: Conversation, latest_sentiment: str) -> str:
        memory = self._conversation_context(conversation).get("feedback_memory", {})
        sentiments = list(memory.get("sentiments", []))
        if latest_sentiment:
            sentiments.append(latest_sentiment)
        return self._resolve_sentiment_from_memory({"sentiments": sentiments})

    def _resolve_sentiment_from_memory(self, memory: dict) -> str:
        sentiments = [sentiment for sentiment in memory.get("sentiments", []) if sentiment]
        if not sentiments:
            return "mixed"
        unique = set(sentiments)
        if len(unique) > 1:
            return "mixed"
        return sentiments[-1]

    def _has_extractable_feedback(self, extracted: FeedbackExtraction) -> bool:
        return bool(extracted.positives or extracted.negatives or extracted.suggestions or extracted.issue_tags)

    def _extract_embedded_rating_if_present(self, user_input: str) -> int | None:
        result = self.llm_service.extract_rating(user_input)
        return result.rating

    def _is_user_declining(self, user_input: str) -> bool:
        normalized = user_input.strip().lower()
        return normalized in {
            "no",
            "nope",
            "nah",
            "not now",
            "nothing else",
            "that's all",
            "thats all",
            "all good",
            "no thanks",
            "no more",
            "stop",
            "that's it",
            "thats it",
        }

    def _maybe_build_contextual_follow_up(
        self,
        conversation: Conversation,
        extracted: FeedbackExtraction,
        issue_type: str,
        previous_state: ConversationState,
    ) -> str | None:
        if previous_state == ConversationState.ISSUE_HANDLING:
            return None

        follow_up_key = self._choose_follow_up_key(extracted, issue_type)
        if not follow_up_key or self._was_follow_up_asked(conversation, follow_up_key):
            return None

        self._mark_follow_up_asked(conversation, follow_up_key)
        humanized = self._generate_human_follow_up(
            conversation=conversation,
            user_feedback=" ".join(extracted.negatives + extracted.suggestions + extracted.positives),
            extracted=extracted,
            issue_type=issue_type,
        )
        return humanized or self._build_follow_up_from_key(follow_up_key)

    def _choose_follow_up_key(self, extracted: FeedbackExtraction, issue_type: str) -> str | None:
        tags = set(extracted.issue_tags)
        if "slow_response_time" in tags:
            return "performance_detail"
        if extracted.suggestions:
            return "feature_request"
        if issue_type in {"technical", "usability", "quality"} and extracted.negatives:
            return issue_type
        if extracted.sentiment == "positive" and extracted.positives:
            return "positive_detail"
        if not extracted.positives and not extracted.negatives and not extracted.suggestions:
            return "clarify"
        return None

    def _was_follow_up_asked(self, conversation: Conversation, key: str) -> bool:
        memory = self._conversation_context(conversation).get("feedback_memory", {})
        return key in memory.get("follow_ups_asked", [])

    def _mark_follow_up_asked(self, conversation: Conversation, key: str) -> None:
        context = self._conversation_context(conversation)
        memory = context.setdefault("feedback_memory", self._default_context()["feedback_memory"])
        if key not in memory["follow_ups_asked"]:
            memory["follow_ups_asked"].append(key)
        conversation.context = context

    def _build_follow_up_from_key(self, key: str) -> str:
        prompts = {
            "performance_detail": "That helps. About how long did the delay take, and what were you trying to do when it felt slow?",
            "feature_request": "That is helpful. What would you expect the system to do differently in the ideal version?",
            "technical": "That sounds frustrating. What exactly happened, and what were you trying to do at the time?",
            "usability": "I can work with that. Which part felt hardest to use, and what would make it clearer?",
            "quality": "I want to capture this accurately. What felt unrealistic, missing, or off about the output?",
            "positive_detail": "That is good to hear. What specifically worked well for you?",
            "clarify": "Can you say a little more so I capture the useful part of that feedback?",
        }
        return prompts[key]

    def _build_issue_follow_up(self, issue_type: str, issue_tags: list[str], detailed: bool) -> str:
        if "slow_response_time" in issue_tags:
            return "About how long did the delay take, and did it happen every time or only on that step?"
        if "multiple_output_request" in issue_tags:
            return "How many outputs would feel right to you, and when would you want that option?"
        if issue_type == "technical":
            if detailed:
                return "Did it crash, freeze, or fail in some other way? A quick step-by-step description would help."
            return "What exactly happened and when?"
        if issue_type == "usability":
            if detailed:
                return "Which part was hardest to use, and what would make that flow feel more obvious?"
            return "Which part was difficult to use?"
        if issue_type == "quality":
            if detailed:
                return "What should have looked or behaved differently so the result felt right to you?"
            return "What felt incorrect or low quality?"
        return "Could you share a little more detail so I can capture the issue accurately?"

    def _build_rating_prompt(self) -> str:
        return (
            "On a scale of 1-5, how would you rate your experience?\n"
            "1 = Very poor (unusable, major issues)\n"
            "2 = Poor (many problems)\n"
            "3 = Average (some issues)\n"
            "4 = Good (minor improvements needed)\n"
            "5 = Excellent (worked very well)"
        )

    def _build_continue_prompt(self, conversation: Conversation, extracted: FeedbackExtraction) -> str:
        count = self._feedback_count(conversation)
        if extracted.sentiment == "positive":
            variants = [
                "I have noted the positive feedback. Was there anything else that worked especially well?",
                "That is helpful. If there was another strong point, I would love to capture it too.",
                "Great, I have added that. Anything else you want the team to keep doing?",
            ]
        elif extracted.suggestions:
            variants = [
                "I have captured that idea. Any other improvement you would like to add?",
                "That suggestion is noted. Is there another change you would want most?",
                "Helpful direction. Anything else you want the product to do differently?",
            ]
        else:
            variants = [
                "I have noted that. Anything else you would like to add?",
                "Thanks, I have captured that. Is there one more detail you want the team to know?",
                "That is recorded. If anything else comes to mind, you can add it now.",
            ]
        return variants[count % len(variants)]

    def _build_post_rating_response(self, conversation: Conversation, rating: int) -> str:
        if rating <= 2:
            return "Thanks for being direct. If there is one more problem you want prioritized, tell me and I will add it."
        if rating == 3:
            return "Thanks, I have added the rating. If there is another improvement that would move this from average to good, I would like to capture it."
        return "Thanks, I have added the rating. If there is anything else worth preserving or improving, tell me."

    def _build_post_rating_prompt(self, rating: int) -> str:
        if rating <= 2:
            return "Thanks for being candid. Tell me what did not work, and I will make sure it gets fixed."
        if rating == 3:
            return "Thanks. What felt average or inconsistent, and what would improve the experience?"
        return "Thanks. What worked especially well, and is there anything you would still improve?"

    def _append_human_followup_if_needed(
        self,
        *,
        conversation: Conversation,
        base_reply: str,
        user_feedback: str,
        extracted: FeedbackExtraction,
        issue_type: str,
    ) -> str:
        if "\n" in base_reply or base_reply.count("?") >= 1:
            return base_reply

        follow_up = self._generate_human_follow_up(
            conversation=conversation,
            user_feedback=user_feedback,
            extracted=extracted,
            issue_type=issue_type,
        )
        if not follow_up or follow_up in base_reply:
            return base_reply
        return f"{base_reply}\n\n{follow_up}"

    def _generate_human_follow_up(
        self,
        *,
        conversation: Conversation,
        user_feedback: str,
        extracted: FeedbackExtraction,
        issue_type: str,
    ) -> str | None:
        if not self._has_extractable_feedback(extracted):
            return None

        context = self._conversation_context(conversation)
        memory = context.get("feedback_memory", {})
        previous_followups = list(memory.get("human_followups_asked", []))
        result = self.llm_service.generate_human_followup_question(
            task_type=conversation.task_type or "text",
            prompt=conversation.prompt or "",
            ai_output=conversation.ai_output or "",
            user_feedback=user_feedback,
            existing_negatives=memory.get("negatives", []),
            existing_suggestions=memory.get("suggestions", []),
            previous_followups=previous_followups,
            detected_issue_type=issue_type,
        )
        question = next((item.strip() for item in result.questions if item.strip()), "")
        if not question or question in previous_followups:
            return None

        memory["human_followups_asked"] = previous_followups + [question]
        context["feedback_memory"] = memory
        conversation.context = context
        return question

    def _store_metadata_on_first_message(
        self,
        conversation: Conversation,
        *,
        task_type: str | None,
        prompt: str | None,
        ai_output: str | None,
        ai_output_file_url: str | None,
    ) -> None:
        if self._metadata_locked(conversation):
            return

        conversation.task_type = task_type or conversation.task_type or "text"
        conversation.prompt = (prompt or conversation.prompt or "").strip()
        conversation.ai_output = (ai_output or conversation.ai_output or "").strip()
        conversation.ai_output_file_url = (ai_output_file_url or conversation.ai_output_file_url or "").strip() or None
        self._set_context_value(conversation, "metadata_locked", True)

    def _metadata_locked(self, conversation: Conversation) -> bool:
        return bool(
            self._get_context_value(conversation, "metadata_locked", False)
            or conversation.task_type
            or conversation.prompt
            or conversation.ai_output
            or conversation.ai_output_file_url
        )

    def _respond(self, conversation: Conversation, content: str) -> str:
        self._add_assistant_message(conversation, content)
        if conversation.title == "New feedback session":
            conversation.title = content[:60]
        return content

    def _add_assistant_message(self, conversation: Conversation, content: str) -> None:
        self.db.add(
            Message(
                conversation_id=conversation.id,
                role=MessageRole.ASSISTANT,
                content=content,
            )
        )

    def _log_state(self, label: str, conversation: Conversation, user_input: str) -> None:
        logger.info(
            "chat_transition label=%s state=%s context=%s user_input=%r",
            label,
            conversation.state,
            conversation.context,
            user_input,
        )
