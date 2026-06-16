from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine

from models.user import User
from models.document import Document
from models.signature import Signature
from models.audit_log import AuditLog

from routers import auth, documents, signatures, verification, audit


Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SignifyPDF API",
    description="Backend API for secure PDF signing and verification system",
    version="1.0.0"
)

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(signatures.router)
app.include_router(verification.router)
app.include_router(audit.router)


@app.get("/")
def home():
    return {
        "message": "SignifyPDF backend is running successfully"
    }


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "project": "SignifyPDF"
    }