from fastapi import FastAPI

app = FastAPI(
    title="SignifyPDF API",
    description="Backend API for secure PDF signing and verification system",
    version="1.0.0"
)

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