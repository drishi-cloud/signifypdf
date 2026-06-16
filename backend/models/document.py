from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func

from database import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    original_filename = Column(String, nullable=False)
    stored_filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)

    status = Column(String, default="uploaded")
    verification_id = Column(String, unique=True, index=True, nullable=False)
    file_hash = Column(String, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())