from datetime import datetime, timezone
from typing import Optional
from sqlmodel import SQLModel, Field


def get_utc_now() -> datetime:
    return datetime.now(timezone.utc)


class SavedEmail(SQLModel, table=True):
    __tablename__ = "saved_emails"

    id: Optional[int] = Field(default=None, primary_key=True)
    recipient: str = Field(...)
    recipient_label: Optional[str] = Field(default=None)
    purpose: str = Field(...)
    purpose_label: Optional[str] = Field(default=None)
    context: str = Field(...)
    tone: str = Field(default="professional")
    experience_level: str = Field(default="B.Tech Student")
    desired_outcome: str = Field(default="Reply to me")
    subject: str = Field(...)
    email_body: str = Field(...)
    reason: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=get_utc_now)
