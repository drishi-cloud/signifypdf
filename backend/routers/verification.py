from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models.document import Document
from schemas.verification import VerificationResponse


router = APIRouter(
    prefix="/api/verify",
    tags=["Verification"]
)


@router.get(
    "/{verification_id}",
    response_model=VerificationResponse
)
def verify_document(
    verification_id: str,
    db: Session = Depends(get_db)
):
    document = db.query(Document).filter(
        Document.verification_id == verification_id
    ).first()

    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No document found with this verification ID"
        )

    return document