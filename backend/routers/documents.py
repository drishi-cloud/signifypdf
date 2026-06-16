import hashlib
import os
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from database import get_db
from models.document import Document
from models.signature import Signature
from models.user import User
from models.audit_log import AuditLog
from schemas.document import DocumentResponse
from utils.audit import create_audit_log
from utils.security import get_current_user


router = APIRouter(
    prefix="/api/docs",
    tags=["Documents"]
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

MAX_PDF_SIZE = 10 * 1024 * 1024
MIN_PDF_SIZE = 1024


def calculate_file_hash(file_bytes: bytes) -> str:
    return hashlib.sha256(file_bytes).hexdigest()


@router.post(
    "/upload",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED
)
async def upload_pdf(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are allowed"
        )

    file_bytes = await file.read()

    if len(file_bytes) < MIN_PDF_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="PDF file is too small. Minimum size is 1 KB."
        )

    if len(file_bytes) > MAX_PDF_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="PDF file is too large. Maximum size is 10 MB."
        )

    file_hash = calculate_file_hash(file_bytes)

    existing_document = db.query(Document).filter(
        Document.owner_id == current_user.id,
        Document.file_hash == file_hash
    ).first()

    if existing_document:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This PDF is already uploaded"
        )

    stored_filename = f"{uuid.uuid4().hex}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, stored_filename)

    with open(file_path, "wb") as uploaded_file:
        uploaded_file.write(file_bytes)

    verification_id = f"SIG-{uuid.uuid4().hex[:10].upper()}"

    new_document = Document(
        owner_id=current_user.id,
        original_filename=file.filename,
        stored_filename=stored_filename,
        file_path=file_path,
        file_size=len(file_bytes),
        status="uploaded",
        verification_id=verification_id,
        file_hash=file_hash
    )

    db.add(new_document)
    db.commit()
    db.refresh(new_document)

    create_audit_log(
        db=db,
        document_id=new_document.id,
        user_id=current_user.id,
        action="PDF_UPLOADED",
        message=f"PDF uploaded: {new_document.original_filename}"
    )

    db.commit()

    return new_document


@router.get(
    "",
    response_model=list[DocumentResponse]
)
def get_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    documents = db.query(Document).filter(
        Document.owner_id == current_user.id
    ).order_by(Document.created_at.desc()).all()

    return documents


@router.get(
    "/{document_id}",
    response_model=DocumentResponse
)
def get_document(
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

    return document


@router.get("/{document_id}/file")
def get_document_file(
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

    if not os.path.exists(document.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PDF file not found"
        )

    return FileResponse(
        path=document.file_path,
        media_type="application/pdf",
        filename=document.original_filename
    )


@router.delete(
    "/{document_id}",
    status_code=status.HTTP_200_OK
)
def delete_document(
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

    db.query(Signature).filter(
        Signature.document_id == document.id,
        Signature.user_id == current_user.id
    ).delete()

    db.query(AuditLog).filter(
        AuditLog.document_id == document.id,
        AuditLog.user_id == current_user.id
    ).delete()

    if os.path.exists(document.file_path):
        os.remove(document.file_path)

    db.delete(document)
    db.commit()

    return {
        "message": "Document deleted successfully"
    }