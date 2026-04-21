from __future__ import annotations

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


def run_startup_migrations(engine: Engine) -> None:
    """Apply lightweight schema fixes for local deployments without Alembic."""
    inspector = inspect(engine)
    table_names = inspector.get_table_names()

    if "users" in table_names:
        _ensure_user_columns(engine, inspector)
    if "conversations" in table_names:
        _ensure_conversation_columns(engine, inspector)
    if "feedback" in table_names:
        _ensure_feedback_columns(engine, inspector)


def _ensure_user_columns(engine: Engine, inspector) -> None:
    columns = {column["name"]: column for column in inspector.get_columns("users")}
    if "created_at" in columns:
        return

    with engine.begin() as connection:
        if engine.dialect.name == "sqlite":
            connection.execute(text("ALTER TABLE users ADD COLUMN created_at DATETIME"))
            connection.execute(text("UPDATE users SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL"))
            return

        connection.execute(
            text(
                """
                ALTER TABLE users
                ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                """
            )
        )


def _ensure_conversation_columns(engine: Engine, inspector) -> None:
    columns = {column["name"]: column for column in inspector.get_columns("conversations")}
    statements: list[str] = []

    if "task_type" not in columns:
        statements.append("ALTER TABLE conversations ADD COLUMN task_type VARCHAR(50)")
    if "prompt" not in columns:
        statements.append("ALTER TABLE conversations ADD COLUMN prompt TEXT")
    if "ai_output" not in columns:
        statements.append("ALTER TABLE conversations ADD COLUMN ai_output TEXT")
    if "ai_output_file_url" not in columns:
        statements.append("ALTER TABLE conversations ADD COLUMN ai_output_file_url VARCHAR(500)")

    if not statements:
        return

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))


def _ensure_feedback_columns(engine: Engine, inspector) -> None:
    columns = {column["name"]: column for column in inspector.get_columns("feedback")}
    needs_raw_text = "raw_text" not in columns
    needs_issue_tags = "issue_tags" not in columns
    needs_summary = "summary" not in columns
    rating_is_required = bool(columns.get("rating", {}).get("nullable") is False)

    if engine.dialect.name == "sqlite":
        if rating_is_required:
            _rebuild_feedback_table_sqlite(
                engine,
                columns,
                include_issue_tags=not needs_issue_tags,
                include_raw_text=not needs_raw_text,
                include_summary=not needs_summary,
            )
            columns = {column["name"]: column for column in inspect(engine).get_columns("feedback")}
            needs_raw_text = "raw_text" not in columns
            needs_issue_tags = "issue_tags" not in columns
            needs_summary = "summary" not in columns

        with engine.begin() as connection:
            if needs_raw_text:
                connection.execute(text("ALTER TABLE feedback ADD COLUMN raw_text TEXT NOT NULL DEFAULT ''"))
            if needs_issue_tags:
                connection.execute(text("ALTER TABLE feedback ADD COLUMN issue_tags JSON NOT NULL DEFAULT '[]'"))
            if needs_summary:
                connection.execute(text("ALTER TABLE feedback ADD COLUMN summary TEXT NOT NULL DEFAULT ''"))
        return

    with engine.begin() as connection:
        if needs_raw_text:
            connection.execute(text("ALTER TABLE feedback ADD COLUMN IF NOT EXISTS raw_text TEXT NOT NULL DEFAULT ''"))
        if needs_issue_tags:
            connection.execute(text("ALTER TABLE feedback ADD COLUMN IF NOT EXISTS issue_tags JSON NOT NULL DEFAULT '[]'::json"))
        if needs_summary:
            connection.execute(text("ALTER TABLE feedback ADD COLUMN IF NOT EXISTS summary TEXT NOT NULL DEFAULT ''"))


def _rebuild_feedback_table_sqlite(
    engine: Engine,
    columns: dict,
    include_issue_tags: bool,
    include_raw_text: bool,
    include_summary: bool,
) -> None:
    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE feedback RENAME TO feedback_legacy"))
        connection.execute(
            text(
                """
                CREATE TABLE feedback (
                    id INTEGER NOT NULL PRIMARY KEY,
                    conversation_id INTEGER NOT NULL,
                    rating INTEGER NULL,
                    sentiment VARCHAR(50) NOT NULL,
                    positives JSON NOT NULL,
                    negatives JSON NOT NULL,
                    suggestions JSON NOT NULL,
                    issue_type VARCHAR(50) NOT NULL,
                    issue_tags JSON NOT NULL DEFAULT '[]',
                    raw_text TEXT NOT NULL DEFAULT '',
                    summary TEXT NOT NULL DEFAULT '',
                    created_at DATETIME NOT NULL,
                    FOREIGN KEY(conversation_id) REFERENCES conversations (id)
                )
                """
            )
        )

        issue_tags_select = "issue_tags" if include_issue_tags and "issue_tags" in columns else "'[]'"
        raw_text_select = "raw_text" if include_raw_text and "raw_text" in columns else "''"
        summary_select = "summary" if include_summary and "summary" in columns else "''"

        connection.execute(
            text(
                f"""
                INSERT INTO feedback (
                    id,
                    conversation_id,
                    rating,
                    sentiment,
                    positives,
                    negatives,
                    suggestions,
                    issue_type,
                    issue_tags,
                    raw_text,
                    summary,
                    created_at
                )
                SELECT
                    id,
                    conversation_id,
                    rating,
                    sentiment,
                    positives,
                    negatives,
                    suggestions,
                    issue_type,
                    {issue_tags_select},
                    {raw_text_select},
                    {summary_select},
                    created_at
                FROM feedback_legacy
                """
            )
        )
        connection.execute(text("DROP TABLE feedback_legacy"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_feedback_id ON feedback (id)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_feedback_conversation_id ON feedback (conversation_id)"))
