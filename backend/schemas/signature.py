from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class SignatureCreate(BaseModel):
    document_id: int
    page_number: int = Field(ge=1)

    x_position: float = Field(ge=0, le=1)
    y_position: float = Field(ge=0, le=1)
    width: float = Field(gt=0, le=1)
    height: float = Field(gt=0, le=1)


class SignatureUpdate(BaseModel):
    page_number: int = Field(ge=1)
    x_position: float = Field(ge=0, le=1)
    y_position: float = Field(ge=0, le=1)
    width: float = Field(gt=0, le=1)
    height: float = Field(gt=0, le=1)


class SignatureFinalizeItem(BaseModel):
    signature_id: int
    type: str
    value: str
    font: Optional[str] = None
    color: Optional[str] = None


class SignatureFinalizeRequest(BaseModel):
    document_id: int
    signatures: List[SignatureFinalizeItem]


class SignatureResponse(BaseModel):
    id: int
    document_id: int
    user_id: int
    page_number: int
    x_position: float
    y_position: float
    width: float
    height: float
    status: str
    created_at: datetime

    model_config = {
        "from_attributes": True
    }