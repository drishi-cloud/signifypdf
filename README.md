# SignifyPDF

SignifyPDF is a secure PDF signing and verification system.

## Project Goal

The goal of this project is to allow users to upload PDF documents, place digital signatures, generate signed PDFs, verify document authenticity, and track document activity using audit logs.

## Tech Stack

### Backend
- Python
- FastAPI
- SQLAlchemy
- SQLite for local development
- PostgreSQL / Supabase for final deployment
- JWT Authentication
- Passlib bcrypt

### Frontend
- React
- Vite
- Tailwind CSS
- react-pdf
- dnd-kit

### PDF Handling
- PyMuPDF
- Pillow

## Current Progress

### Day 1
- Project folder structure created
- Backend FastAPI setup completed
- Backend health route created
- FastAPI documentation tested
- React frontend created
- Tailwind CSS configured
- SignifyPDF landing page created

## Planned Features

- User registration and login
- Secure JWT authentication
- PDF upload
- PDF preview
- Drag-and-drop signature placement
- Signed PDF generation
- Document verification
- Audit trail
- Public signing links