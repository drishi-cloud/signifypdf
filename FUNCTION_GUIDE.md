# SignifyPDF Function Guide

This file explains the important files, functions, and logic used in the SignifyPDF project. It is useful for viva, project explanation, and code understanding.

## Project Overview

SignifyPDF is a secure PDF signing and verification system.

The project allows users to:

* Register and login
* Upload PDF documents
* Preview PDF files
* Add typed, drawn, or uploaded signatures
* Drag and drop signatures on PDF pages
* Move or delete signatures
* Generate signed PDFs
* Verify documents using a unique verification ID
* Store audit logs for important actions

## Backend Function Guide

The backend is built using FastAPI, SQLAlchemy, JWT, PostgreSQL, and PyMuPDF.

## `main.py`

### Purpose

This is the starting point of the FastAPI backend.

### Important Work

* Creates the FastAPI app
* Enables CORS so React frontend can talk to backend
* Creates database tables
* Connects all routers
* Provides basic backend health routes

### Important Functions

### `home()`

Returns a simple message to confirm that the backend is running.

### `health_check()`

Returns backend health status.

Used to check whether the backend is working properly.

## `database.py`

### Purpose

This file manages database connection.

### Important Work

* Loads database URL from `.env`
* Connects to SQLite or PostgreSQL
* Creates database session
* Provides database session to routes

### Important Functions

### `get_db()`

This function gives a database connection to API routes.

It opens the database session, gives it to the route, and closes it after the work is done.

## Models

Models represent database tables.

## `models/user.py`

### Purpose

Defines the `users` table.

### Fields

* `id`
* `name`
* `email`
* `hashed_password`
* `created_at`

### Use

Stores registered user information.

Password is not stored directly. A hashed password is stored for security.

## `models/document.py`

### Purpose

Defines the `documents` table.

### Fields

* `id`
* `owner_id`
* `original_filename`
* `stored_filename`
* `file_path`
* `file_size`
* `status`
* `verification_id`
* `file_hash`
* `created_at`

### Use

Stores uploaded PDF document details.

Each document belongs to one user.

Each document gets a unique verification ID.

## `models/signature.py`

### Purpose

Defines the `signatures` table.

### Fields

* `id`
* `document_id`
* `user_id`
* `page_number`
* `x_position`
* `y_position`
* `width`
* `height`
* `status`
* `created_at`

### Use

Stores signature position on the PDF.

The actual signature design is handled on the frontend, while the backend stores the position.

## `models/audit_log.py`

### Purpose

Defines the `audit_logs` table.

### Fields

* `id`
* `document_id`
* `user_id`
* `action`
* `message`
* `created_at`

### Use

Stores important actions such as:

* PDF uploaded
* Signature added
* Signature moved
* Signature deleted
* PDF signed

## Schemas

Schemas are used for request and response validation.

## `schemas/user.py`

### Purpose

Validates user-related data.

### Important Schemas

### `UserCreate`

Used when a user registers.

It accepts:

* name
* email
* password

### `UserLogin`

Used when a user logs in.

It accepts:

* email
* password

### `UserResponse`

Used to send user details back to frontend.

### `TokenResponse`

Used to send JWT token after login.

## `schemas/document.py`

### Purpose

Defines how document data is returned to frontend.

### Important Schema

### `DocumentResponse`

Returns document details such as filename, size, status, verification ID, and hash.

## `schemas/signature.py`

### Purpose

Validates signature data.

### Important Schemas

### `SignatureCreate`

Used when a signature is added to a PDF.

### `SignatureUpdate`

Used when a signature is moved.

### `SignatureFinalizeRequest`

Used when the final signed PDF is generated.

### `SignatureResponse`

Used to return signature data to frontend.

## `schemas/verification.py`

### Purpose

Used for public document verification response.

### Important Schema

### `VerificationResponse`

Returns document verification details.

## `schemas/audit.py`

### Purpose

Used to return audit log data.

### Important Schema

### `AuditLogResponse`

Returns audit log details.

## Utility Files

## `utils/security.py`

### Purpose

Handles password security and JWT authentication.

### Important Functions

### `hash_password(password)`

Converts the user's plain password into a secure hashed password.

This protects the real password from being stored directly in the database.

### `verify_password(plain_password, hashed_password)`

Checks whether the entered password matches the stored hashed password.

Used during login.

### `create_access_token(data)`

Creates a JWT token after successful login.

This token is sent to the frontend and used for protected API requests.

### `get_current_user()`

Checks the JWT token and finds the logged-in user.

Used in protected routes like upload PDF, view documents, add signature, and generate signed PDF.

## `utils/audit.py`

### Purpose

Creates audit log entries.

### Important Function

### `create_audit_log()`

Adds an audit log record when an important action happens.

Example actions:

* PDF uploaded
* Signature added
* Signature moved
* Signature deleted
* PDF signed

## Router Files

Routers contain API endpoints.

## `routers/auth.py`

### Purpose

Handles user authentication.

### Important Routes

### `POST /api/auth/register`

Registers a new user.

Steps:

1. Checks if email already exists.
2. Hashes the password.
3. Saves user in database.
4. Returns user details.

### `POST /api/auth/login`

Logs in a user.

Steps:

1. Finds user by email.
2. Checks password.
3. Creates JWT token.
4. Sends token to frontend.

### `GET /api/auth/me`

Returns currently logged-in user details.

Requires JWT token.

## `routers/documents.py`

### Purpose

Handles PDF upload, list, preview, and delete.

### Important Functions

### `calculate_file_hash(file_bytes)`

Creates a SHA-256 hash of the uploaded PDF.

This helps detect duplicate PDF uploads.

### `upload_pdf()`

Uploads a PDF document.

Steps:

1. Checks if file is PDF.
2. Checks minimum and maximum file size.
3. Calculates file hash.
4. Checks duplicate upload.
5. Saves PDF in uploads folder.
6. Creates verification ID.
7. Stores document details in database.
8. Creates audit log.

### `get_documents()`

Returns all documents uploaded by the logged-in user.

### `get_document(document_id)`

Returns details of one document.

It checks that the document belongs to the logged-in user.

### `get_document_file(document_id)`

Returns the actual PDF file so that frontend can preview it.

### `delete_document(document_id)`

Deletes a document.

Steps:

1. Finds the document.
2. Deletes related signatures.
3. Deletes related audit logs.
4. Deletes PDF file from folder.
5. Deletes document record from database.

## `routers/signatures.py`

### Purpose

Handles signature placement, movement, deletion, and final PDF generation.

### Important Helper Functions

### `convert_hex_to_rgb(hex_color)`

Converts frontend color code into RGB format used by PyMuPDF.

Example:

```text
#0f172a
```

is converted into RGB values.

### `get_pdf_font_name(browser_font)`

Converts browser font names into PDF-supported font names.

### `extract_base64_image(image_data)`

Extracts image bytes from base64 image data.

Used for drawn and uploaded signatures.

## Important Routes

### `POST /api/signatures`

Adds a signature position to the PDF.

Steps:

1. Checks if document belongs to user.
2. Saves signature page number and position.
3. Creates audit log.

### `GET /api/signatures/{document_id}`

Returns all signatures for a document.

### `PUT /api/signatures/{signature_id}`

Updates signature position when user moves it.

### `DELETE /api/signatures/{signature_id}`

Deletes a signature from the document.

### `POST /api/signatures/finalize`

Generates final signed PDF.

Steps:

1. Finds the document.
2. Opens the original PDF using PyMuPDF.
3. Gets saved signature positions.
4. Places typed or image signature on PDF.
5. Saves new signed PDF.
6. Updates document status to signed.
7. Updates signature status to signed.
8. Creates audit log.
9. Returns signed PDF for download.

## `routers/verification.py`

### Purpose

Handles public document verification.

### Important Route

### `GET /api/verify/{verification_id}`

Checks whether a document exists with the given verification ID.

This route does not require login.

It returns:

* filename
* status
* verification ID
* file hash
* created date

## `routers/audit.py`

### Purpose

Shows audit logs of a document.

### Important Route

### `GET /api/audit/{document_id}`

Returns all audit logs for a document.

It checks that the document belongs to the logged-in user.

## Frontend Function Guide

The frontend is built using React, Vite, Tailwind CSS, React Router, and React PDF.

## `App.jsx`

### Purpose

Defines all frontend routes.

### Routes

* `/` → Home page
* `/register` → Register page
* `/login` → Login page
* `/dashboard` → Dashboard page
* `/documents/:id` → PDF preview and signing page
* `/verify` → Public verification page

## `main.jsx`

### Purpose

Starts the React app and wraps it inside `BrowserRouter`.

This allows routing between pages.

## `pages/Home.jsx`

### Purpose

Landing page of the project.

### Main Work

Shows:

* Project name
* Project description
* Create Account button
* Login button
* Verify Document button
* Feature cards

## `pages/Register.jsx`

### Purpose

Allows new users to create an account.

### Important Function

### `handleRegister(event)`

Steps:

1. Prevents page refresh.
2. Checks form fields.
3. Sends user data to backend.
4. Shows success or error message.
5. Redirects to login page after successful registration.

## `pages/Login.jsx`

### Purpose

Allows users to login.

### Important Function

### `handleLogin(event)`

Steps:

1. Prevents page refresh.
2. Checks email and password.
3. Sends login request to backend.
4. Receives JWT token.
5. Stores token in localStorage.
6. Redirects user to dashboard.

## `pages/Dashboard.jsx`

### Purpose

Main page after login.

Users can upload PDFs and see uploaded documents.

### Important Functions

### `loadDashboardData()`

Loads user details and uploaded documents.

It sends JWT token to backend.

### `validatePdfFile(file)`

Checks uploaded file before sending it to backend.

It validates:

* File exists
* File is PDF
* File is not too small
* File is not too large

### `handleFileChange(event)`

Runs when user selects a PDF file.

It validates the file and stores it in state.

### `handleUpload(event)`

Uploads selected PDF to backend.

Steps:

1. Checks token.
2. Validates PDF.
3. Creates FormData.
4. Sends PDF to backend.
5. Adds uploaded document to dashboard list.

### `deleteDocument(documentId)`

Deletes selected PDF document.

### `handleLogout()`

Removes token from localStorage and redirects to login.

### `formatFileSize(sizeInBytes)`

Converts file size into readable KB or MB format.

### `formatDate(dateValue)`

Converts date into readable format.

## `pages/DocumentPreview.jsx`

### Purpose

This is the main signing page.

It displays PDF preview and signature tools.

### Important State Values

* `documentDetails` stores current document details.
* `pdfUrl` stores PDF preview URL.
* `savedSignatures` stores signature positions from backend.
* `signatureContents` stores signature text or image content.
* `signatureMode` stores selected signature type.
* `signatureText` stores typed signature.
* `drawnSignature` stores drawn signature image.
* `uploadedSignature` stores uploaded signature image.
* `dragItem` stores currently dragged signature.
* `dragPreview` shows signature while dragging.
* `pageNumber` stores current PDF page.

## Important Functions in `DocumentPreview.jsx`

### `loadDocumentPreview()`

Loads:

* Document details
* Existing signatures
* PDF file

### `handleDocumentLoadSuccess({ numPages })`

Runs when PDF is loaded successfully.

It stores total number of PDF pages.

### `goToPreviousPage()`

Moves to previous PDF page.

### `goToNextPage()`

Moves to next PDF page.

### `calculateSignaturePosition()`

Calculates the position of the signature on PDF.

The position is stored in relative values between 0 and 1.

This makes signature placement work even if PDF display size changes.

### `getCleanSignatureText()`

Returns typed signature text.

If input is empty, it returns default text:

```text
Signature
```

### `isLightColor(hexColor)`

Checks whether a selected color is light.

This helps show a dark preview background when user selects white signature color.

### `getPreviewBackgroundColor(content)`

Decides preview box background color.

### `getTypedSignatureContent()`

Creates signature data for typed signature.

### `getDrawnSignatureContent()`

Creates signature data for drawn signature.

### `getUploadedSignatureContent()`

Creates signature data for uploaded signature image.

### `startNewSignatureDrag(event, content)`

Starts dragging a new signature from the left signature tool area.

### `startExistingSignatureDrag(event, signature)`

Starts dragging an already placed signature.

Used when moving signature position.

### `stopDragging()`

Stops drag operation and clears drag preview.

### `getCanvasPoint(event)`

Finds the exact mouse position on the drawing canvas.

Used for drawing signature.

### `startDrawing(event)`

Starts drawing on canvas.

### `drawSignature(event)`

Draws signature line while mouse is moving.

### `stopDrawing()`

Stops drawing and saves the drawn signature as an image.

### `clearDrawnSignature()`

Clears the drawn signature canvas.

### `handleSignatureImageUpload(event)`

Handles uploaded signature image.

It validates:

* File type
* File size
* Image readability

### `compressImage(dataUrl)`

Compresses uploaded signature image so it can be stored safely in browser localStorage.

### `clearUploadedSignature()`

Clears uploaded signature image.

### `saveSignaturePosition(signatureData, contentToSave)`

Saves new signature position to backend.

Also saves signature content in frontend state.

### `updateSignaturePosition(signatureId, updatedSignatureData)`

Updates signature position after moving it.

### `deleteSignature(signatureId)`

Deletes a signature from backend and removes it from frontend.

### `finalizeSignedPdf()`

Generates the final signed PDF.

Steps:

1. Checks if user is logged in.
2. Checks if at least one signature exists.
3. Collects signature content.
4. Sends data to backend.
5. Receives signed PDF blob.
6. Downloads signed PDF automatically.
7. Updates document status.

### `renderSignatureContent(content)`

Displays signature preview.

It supports:

* Typed signature
* Drawn signature
* Uploaded image signature

### `getModeButtonClass(mode)`

Changes button style based on selected signature mode.

## `pages/Verify.jsx`

### Purpose

Public document verification page.

Anyone can verify a document using verification ID.

### Important Functions

### `handleVerify(event)`

Steps:

1. Prevents page refresh.
2. Checks if verification ID is entered.
3. Sends verification ID to backend.
4. Shows document details if found.
5. Shows error if not found.

### `formatDate(dateValue)`

Converts verification date into readable format.

## Important Concepts Used

## JWT Authentication

JWT is used to keep users logged in securely.

After login, backend creates a token.

Frontend stores token in localStorage.

For protected routes, frontend sends token in request header.

## Password Hashing

Passwords are not stored directly.

They are converted into hashed form before saving.

This improves security.

## PDF Hashing

Each uploaded PDF gets a SHA-256 hash.

This helps detect duplicate uploads.

## Verification ID

Each document gets a unique verification ID.

This ID can be used to verify whether a document exists in the system.

## Audit Logs

Audit logs store important actions.

They help track document activity.

Examples:

* PDF uploaded
* Signature added
* Signature moved
* Signature deleted
* PDF signed

## Relative Signature Position

Signature position is stored using values between 0 and 1.

Example:

```text
x_position = 0.25
y_position = 0.40
```

This means the signature is placed at 25% from left and 40% from top of the PDF.

This is better than fixed pixels because it works with different screen sizes.

## PyMuPDF

PyMuPDF is used in backend to edit PDF files.

It places text or image signatures on the PDF and generates a final signed PDF.

## Supabase PostgreSQL

Supabase is used as a cloud PostgreSQL database.

The backend connects to Supabase using SQLAlchemy.

The frontend does not directly connect to Supabase.

Frontend talks to FastAPI backend, and backend talks to Supabase.

## Final Project Flow

1. User opens SignifyPDF.
2. User creates account.
3. User logs in.
4. User uploads PDF.
5. Backend saves document data.
6. User opens PDF preview.
7. User adds signature.
8. Signature position is saved.
9. User generates signed PDF.
10. Backend creates signed PDF using PyMuPDF.
11. User downloads signed PDF.
12. Document can be verified using verification ID.