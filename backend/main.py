from fastapi import FastAPI

from database import Base, engine
from models.user import User
from routers import auth

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SignifyPDF API",
    description="Backend API for secure PDF signing and verification system",
    version="1.0.0"
)

app.include_router(auth.router)


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