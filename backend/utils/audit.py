from models.audit_log import AuditLog


def create_audit_log(
    db,
    document_id: int,
    user_id: int,
    action: str,
    message: str
):
    audit_log = AuditLog(
        document_id=document_id,
        user_id=user_id,
        action=action,
        message=message
    )

    db.add(audit_log)