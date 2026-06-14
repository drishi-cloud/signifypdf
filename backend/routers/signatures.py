from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models.document import Document
from models.signature import Signature
from models.user import User
from schemas.signature import SignatureCreate, SignatureUpdate, SignatureResponse
from utils.security import get_current_user


router = APIRouter(
    prefix="/api/signatures",
    tags=["Signatures"]
)


@router.post(
    "",
    response_model=SignatureResponse,
    status_code=status.HTTP_201_CREATED
)
def create_signature(
    signature: SignatureCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    document = db.query(Document).filter(
        Document.id == signature.document_id,
        Document.owner_id == current_user.id
    ).first()

    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    new_signature = Signature(
        document_id=signature.document_id,
        user_id=current_user.id,
        page_number=signature.page_number,
        x_position=signature.x_position,
        y_position=signature.y_position,
        width=signature.width,
        height=signature.height
    )

    db.add(new_signature)
    db.commit()
    db.refresh(new_signature)

    return new_signature


@router.get(
    "/{document_id}",
    response_model=list[SignatureResponse]
)
def get_document_signatures(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.owner_id == current_user.id
    ).first()

    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    signatures = db.query(Signature).filter(
        Signature.document_id == document_id,
        Signature.user_id == current_user.id
    ).order_by(Signature.created_at.desc()).all()

    return signatures


@router.put(
    "/{signature_id}",
    response_model=SignatureResponse
)
def update_signature_position(
    signature_id: int,
    updated_signature: SignatureUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    signature = db.query(Signature).filter(
        Signature.id == signature_id,
        Signature.user_id == current_user.id
    ).first()

    if signature is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Signature not found"
        )

    document = db.query(Document).filter(
        Document.id == signature.document_id,
        Document.owner_id == current_user.id
    ).first()

    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    signature.page_number = updated_signature.page_number
    signature.x_position = updated_signature.x_position
    signature.y_position = updated_signature.y_position
    signature.width = updated_signature.width
    signature.height = updated_signature.height

    db.commit()
    db.refresh(signature)

    return signature
@router.delete(
    "/{signature_id}",
    status_code=status.HTTP_200_OK
)
def delete_signature(
    signature_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    signature = db.query(Signature).filter(
        Signature.id == signature_id,
        Signature.user_id == current_user.id
    ).first()

    if signature is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Signature not found"
        )

    db.delete(signature)
    db.commit()

    return {
        "message": "Signature deleted successfully"
    }