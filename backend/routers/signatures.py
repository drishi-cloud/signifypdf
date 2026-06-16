import base64
import os
import uuid

import fitz
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from database import get_db
from models.document import Document
from models.signature import Signature
from models.user import User
from schemas.signature import (
    SignatureCreate,
    SignatureUpdate,
    SignatureResponse,
    SignatureFinalizeRequest
)
from utils.audit import create_audit_log
from utils.security import get_current_user


router = APIRouter(
    prefix="/api/signatures",
    tags=["Signatures"]
)

SIGNED_DIR = "signed"
os.makedirs(SIGNED_DIR, exist_ok=True)


def convert_hex_to_rgb(hex_color: str):
    if not hex_color:
        return (0, 0, 0)

    if not hex_color.startswith("#") or len(hex_color) != 7:
        return (0, 0, 0)

    red = int(hex_color[1:3], 16) / 255
    green = int(hex_color[3:5], 16) / 255
    blue = int(hex_color[5:7], 16) / 255

    return (red, green, blue)


def get_pdf_font_name(browser_font: str):
    if not browser_font:
        return "tiit"

    font_lower = browser_font.lower()

    if "mono" in font_lower:
        return "cour"

    return "tiit"


def extract_base64_image(image_data: str):
    if "," in image_data:
        image_data = image_data.split(",", 1)[1]

    try:
        return base64.b64decode(image_data)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid signature image data"
        )


@router.post(
    "",
    response_model=SignatureResponse,
    status_code=status.HTTP_201_CREATED
)
def create_signature(
    signature_data: SignatureCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    document = db.query(Document).filter(
        Document.id == signature_data.document_id,
        Document.owner_id == current_user.id
    ).first()

    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    signature = Signature(
        document_id=signature_data.document_id,
        user_id=current_user.id,
        page_number=signature_data.page_number,
        x_position=signature_data.x_position,
        y_position=signature_data.y_position,
        width=signature_data.width,
        height=signature_data.height,
        status="pending"
    )

    db.add(signature)
    db.commit()
    db.refresh(signature)

    create_audit_log(
        db=db,
        document_id=signature.document_id,
        user_id=current_user.id,
        action="SIGNATURE_ADDED",
        message="Signature added to document"
    )

    db.commit()

    return signature


@router.post("/finalize")
def finalize_signed_pdf(
    finalize_data: SignatureFinalizeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    document = db.query(Document).filter(
        Document.id == finalize_data.document_id,
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
            detail="Original PDF file not found"
        )

    if len(finalize_data.signatures) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one signature is required"
        )

    signature_content_map = {}

    for signature_content in finalize_data.signatures:
        signature_content_map[signature_content.signature_id] = signature_content

    signature_ids = list(signature_content_map.keys())

    saved_signatures = db.query(Signature).filter(
        Signature.id.in_(signature_ids),
        Signature.document_id == document.id,
        Signature.user_id == current_user.id
    ).all()

    if len(saved_signatures) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No saved signatures found"
        )

    pdf_document = fitz.open(document.file_path)

    try:
        for signature in saved_signatures:
            if signature.page_number < 1 or signature.page_number > len(pdf_document):
                continue

            signature_content = signature_content_map.get(signature.id)

            if signature_content is None:
                continue

            page = pdf_document[signature.page_number - 1]
            page_rect = page.rect

            x0 = signature.x_position * page_rect.width
            y0 = signature.y_position * page_rect.height
            x1 = x0 + signature.width * page_rect.width
            y1 = y0 + signature.height * page_rect.height

            signature_rect = fitz.Rect(x0, y0, x1, y1)

            if signature_content.type == "text":
                text_value = signature_content.value.strip()

                if not text_value:
                    text_value = "Signature"

                text_color = convert_hex_to_rgb(signature_content.color)
                pdf_font = get_pdf_font_name(signature_content.font)

                font_size = signature_rect.height * 0.45

                if font_size < 10:
                    font_size = 10

                if font_size > 32:
                    font_size = 32

                page.insert_textbox(
                    signature_rect,
                    text_value,
                    fontsize=font_size,
                    fontname=pdf_font,
                    color=text_color,
                    align=fitz.TEXT_ALIGN_CENTER
                )

            elif signature_content.type == "image":
                image_bytes = extract_base64_image(signature_content.value)

                page.insert_image(
                    signature_rect,
                    stream=image_bytes,
                    keep_proportion=True
                )

            signature.status = "signed"

        signed_filename = f"signed_{document.verification_id}_{uuid.uuid4().hex[:8]}.pdf"
        signed_file_path = os.path.join(SIGNED_DIR, signed_filename)

        pdf_document.save(
            signed_file_path,
            garbage=4,
            deflate=True
        )

    finally:
        pdf_document.close()

    document.status = "signed"

    create_audit_log(
        db=db,
        document_id=document.id,
        user_id=current_user.id,
        action="PDF_SIGNED",
        message="Final signed PDF generated"
    )

    db.commit()

    return FileResponse(
        path=signed_file_path,
        media_type="application/pdf",
        filename=signed_filename
    )


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
def update_signature(
    signature_id: int,
    signature_data: SignatureUpdate,
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

    signature.page_number = signature_data.page_number
    signature.x_position = signature_data.x_position
    signature.y_position = signature_data.y_position
    signature.width = signature_data.width
    signature.height = signature_data.height

    create_audit_log(
        db=db,
        document_id=signature.document_id,
        user_id=current_user.id,
        action="SIGNATURE_MOVED",
        message="Signature position updated"
    )

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

    create_audit_log(
        db=db,
        document_id=signature.document_id,
        user_id=current_user.id,
        action="SIGNATURE_DELETED",
        message="Signature removed from document"
    )

    db.delete(signature)
    db.commit()

    return {
        "message": "Signature deleted successfully"
    }