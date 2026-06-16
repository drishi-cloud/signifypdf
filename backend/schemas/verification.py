from datetime import datetime
from pydantic import BaseModel


class VerificationResponse(BaseModel):
    original_filename: str
    status: str
    verification_id: str
    file_hash: str
    created_at: datetime

    model_config = {
        "from_attributes": True
    }