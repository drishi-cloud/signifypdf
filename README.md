# SignifyPDF

SignifyPDF is a secure PDF signing and verification system built using FastAPI, React, Tailwind CSS, and Supabase PostgreSQL.

The system allows users to upload PDF documents, place signatures on the PDF, generate a signed PDF, and verify documents using a unique verification ID.

## Features

* User registration and login
* JWT-based authentication
* Secure PDF upload
* PDF preview in browser
* Typed signature
* Drawn signature
* Uploaded signature image
* Drag and drop signature placement
* Move and delete signatures
* Generate signed PDF
* Unique verification ID for each document
* Public document verification page
* Audit logs for important actions
* Supabase PostgreSQL database support

## Tech Stack

### Frontend

* React
* Vite
* Tailwind CSS
* React Router
* React PDF

### Backend

* Python
* FastAPI
* Uvicorn
* SQLAlchemy
* PostgreSQL / Supabase
* JWT Authentication
* PyMuPDF

## Project Folder Structure

```text
signifypdf/
│
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── models/
│   ├── routers/
│   ├── schemas/
│   ├── utils/
│   ├── uploads/
│   ├── signed/
│   ├── requirements.txt
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

## Backend Setup

Go to the backend folder:

```bash
cd backend
```

Create virtual environment:

```bash
python -m venv venv
```

Activate virtual environment:

```bash
venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file inside the backend folder:

```env
SECRET_KEY=signifypdf_super_secret_key_change_later
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres?sslmode=require
```

Run backend:

```bash
fastapi dev main.py
```

Backend will run on:

```text
http://127.0.0.1:8000
```

Swagger API documentation:

```text
http://127.0.0.1:8000/docs
```

## Frontend Setup

Go to the frontend folder:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Run frontend:

```bash
npm run dev
```

Frontend will run on:

```text
http://localhost:5173
```

## Main API Endpoints

### Authentication

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
```

### Documents

```text
POST   /api/docs/upload
GET    /api/docs
GET    /api/docs/{document_id}
GET    /api/docs/{document_id}/file
DELETE /api/docs/{document_id}
```

### Signatures

```text
POST   /api/signatures
GET    /api/signatures/{document_id}
PUT    /api/signatures/{signature_id}
DELETE /api/signatures/{signature_id}
POST   /api/signatures/finalize
```

### Verification

```text
GET /api/verify/{verification_id}
```

### Audit Logs

```text
GET /api/audit/{document_id}
```

## How the System Works

1. User creates an account.
2. User logs in and receives a JWT token.
3. User uploads a PDF document.
4. The backend stores PDF details in the database.
5. A unique verification ID is generated for the document.
6. User opens the PDF preview page.
7. User places a signature on the PDF.
8. Signature position is saved in the database.
9. User generates the final signed PDF.
10. The signed PDF is created using PyMuPDF.
11. Anyone can verify the document using the verification ID.

## Database Tables

The project uses these main tables:

```text
users
documents
signatures
audit_logs
```

## Security Features

* Passwords are hashed before storing.
* JWT tokens are used for authentication.
* Users can access only their own documents.
* PDF file type and file size are validated.
* Each document gets a unique verification ID.
* Audit logs are created for important actions.

## Important Note

The `.env` file contains private credentials and should not be pushed to GitHub.

## Project Status

This project is created as an internship/final-year level PDF signing and verification system using a Python-based backend and React frontend.
