from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey
from sqlalchemy.sql import func

from database import Base


class Signature(Base):
    __tablename__ = "signatures"

    id = Column(Integer, primary_key=True, index=True)

    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    page_number = Column(Integer, nullable=False)

    x_position = Column(Float, nullable=False)
    y_position = Column(Float, nullable=False)
    width = Column(Float, nullable=False)
    height = Column(Float, nullable=False)

    status = Column(String, default="pending")

    created_at = Column(DateTime(timezone=True), server_default=func.now())