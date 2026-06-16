# SignifyPDF API Testing Notes

This file contains API testing commands for the SignifyPDF backend.

Backend base URL:

```text
http://127.0.0.1:8000
```

## 1. Health Check

```bash
curl http://127.0.0.1:8000/health
```

Expected response:

```json
{
  "status": "ok",
  "project": "SignifyPDF"
}
```

## 2. Register User

```bash
curl -X POST http://127.0.0.1:8000/api/auth/register ^
-H "Content-Type: application/json" ^
-d "{\"name\":\"Test User\",\"email\":\"test@example.com\",\"password\":\"123456\"}"
```

This creates a new user account.

## 3. Login User

```bash
curl -X POST http://127.0.0.1:8000/api/auth/login ^
-H "Content-Type: application/json" ^
-d "{\"email\":\"test@example.com\",\"password\":\"123456\"}"
```

Expected response:

```json
{
  "access_token": "JWT_TOKEN_HERE",
  "token_type": "bearer"
}
```

Copy the `access_token`. It is required for protected APIs.

## 4. Get Logged-in User

Replace `JWT_TOKEN_HERE` with the token received after login.

```bash
curl -X GET http://127.0.0.1:8000/api/auth/me ^
-H "Authorization: Bearer JWT_TOKEN_HERE"
```

## 5. Upload PDF

Replace the file path with your PDF path.

```bash
curl -X POST http://127.0.0.1:8000/api/docs/upload ^
-H "Authorization: Bearer JWT_TOKEN_HERE" ^
-F "file=@C:\Users\YourName\Desktop\sample.pdf"
```

This uploads a PDF and returns document details including the verification ID.

## 6. Get All Documents

```bash
curl -X GET http://127.0.0.1:8000/api/docs ^
-H "Authorization: Bearer JWT_TOKEN_HERE"
```

## 7. Get Single Document

Replace `DOCUMENT_ID` with the actual document ID.

```bash
curl -X GET http://127.0.0.1:8000/api/docs/DOCUMENT_ID ^
-H "Authorization: Bearer JWT_TOKEN_HERE"
```

## 8. Get PDF File

```bash
curl -X GET http://127.0.0.1:8000/api/docs/DOCUMENT_ID/file ^
-H "Authorization: Bearer JWT_TOKEN_HERE" ^
-o downloaded-document.pdf
```

## 9. Add Signature Position

```bash
curl -X POST http://127.0.0.1:8000/api/signatures ^
-H "Content-Type: application/json" ^
-H "Authorization: Bearer JWT_TOKEN_HERE" ^
-d "{\"document_id\":1,\"page_number\":1,\"x_position\":0.2,\"y_position\":0.3,\"width\":0.25,\"height\":0.08}"
```

This stores the signature position on the PDF.

## 10. Get Document Signatures

```bash
curl -X GET http://127.0.0.1:8000/api/signatures/DOCUMENT_ID ^
-H "Authorization: Bearer JWT_TOKEN_HERE"
```

## 11. Move Signature

Replace `SIGNATURE_ID` with the actual signature ID.

```bash
curl -X PUT http://127.0.0.1:8000/api/signatures/SIGNATURE_ID ^
-H "Content-Type: application/json" ^
-H "Authorization: Bearer JWT_TOKEN_HERE" ^
-d "{\"page_number\":1,\"x_position\":0.4,\"y_position\":0.5,\"width\":0.25,\"height\":0.08}"
```

## 12. Delete Signature

```bash
curl -X DELETE http://127.0.0.1:8000/api/signatures/SIGNATURE_ID ^
-H "Authorization: Bearer JWT_TOKEN_HERE"
```

## 13. Generate Signed PDF

Replace `SIGNATURE_ID` and `DOCUMENT_ID` with actual values.

```bash
curl -X POST http://127.0.0.1:8000/api/signatures/finalize ^
-H "Content-Type: application/json" ^
-H "Authorization: Bearer JWT_TOKEN_HERE" ^
-d "{\"document_id\":1,\"signatures\":[{\"signature_id\":1,\"type\":\"text\",\"value\":\"Test User\",\"font\":\"Georgia, serif\",\"color\":\"#0f172a\"}]}" ^
-o signed-document.pdf
```

This creates and downloads the final signed PDF.

## 14. Verify Document

Replace `VERIFICATION_ID` with the actual verification ID.

```bash
curl -X GET http://127.0.0.1:8000/api/verify/VERIFICATION_ID
```

This endpoint is public and does not require login.

## 15. Get Audit Logs

```bash
curl -X GET http://127.0.0.1:8000/api/audit/DOCUMENT_ID ^
-H "Authorization: Bearer JWT_TOKEN_HERE"
```

This returns important actions performed on the document.

## Notes

* Protected routes require a JWT token.
* Public verification does not require login.
* PDF upload only accepts valid PDF files.
* Signature positions are stored using relative values between 0 and 1.
* Final signed PDF is generated using PyMuPDF.
