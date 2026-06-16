from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models.audit_log import AuditLog
from models.document import Document
from models.user import User
from schemas.audit import AuditLogResponse
from utils.security import get_current_user


router = APIRouter(
    prefix="/api/audit",
    tags=["Audit Logs"]
)


@router.get(
    "/{document_id}",
    response_model=list[AuditLogResponse]
)
def get_audit_logs(
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

    audit_logs = db.query(AuditLog).filter(
        AuditLog.document_id == document_id,
        AuditLog.user_id == current_user.id
    ).order_by(AuditLog.created_at.desc()).all()

    return audit_logs