from datetime import datetime
from pydantic import BaseModel


class AuditLogResponse(BaseModel):
    id: int
    document_id: int
    user_id: int
    action: str
    message: str
    created_at: datetime

    model_config = {
        "from_attributes": True
    }