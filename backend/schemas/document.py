from datetime import datetime
from pydantic import BaseModel


class DocumentResponse(BaseModel):
    id: int
    original_filename: str
    stored_filename: str
    file_size: int
    status: str
    verification_id: str
    file_hash: str
    created_at: datetime

    model_config = {
        "from_attributes": True
    }