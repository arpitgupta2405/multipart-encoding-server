# Enhanced Multipart Server

This enhanced multipart server supports multiple encoding formats for file uploads with remote upload capabilities.

## Supported Encodings

The server supports the following encoding formats:

1. **binary** - Raw binary data
2. **ascii** - ASCII encoded text
3. **utf-8** - UTF-8 encoded text
4. **utf-16le** - UTF-16LE encoded text
5. **ucs2** - UCS-2 encoded text
6. **hex** - Hexadecimal encoded data
7. **base64** - Base64 encoded data

## Remote Upload Capabilities

The server can automatically upload decoded files to multiple remote destinations:

- **Amazon S3** - Upload to S3 buckets
- **FTP Server** - Upload to FTP servers
- **HTTP Endpoints** - Upload to any HTTP API endpoint

### Configuration

Remote uploads can be configured via environment variables or the configuration API:

#### Environment Variables

Copy `env.example` to `.env` and configure your settings:

```bash
# Enable remote uploads
REMOTE_UPLOAD_ENABLED=true

# S3 Configuration
S3_UPLOAD_ENABLED=true
S3_BUCKET=your-bucket-name
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key

# FTP Configuration
FTP_UPLOAD_ENABLED=true
FTP_HOST=ftp.example.com
FTP_PORT=21
FTP_USERNAME=your-username
FTP_PASSWORD=your-password
FTP_PATH=/uploads

# HTTP Upload Configuration
HTTP_UPLOAD_ENABLED=true
HTTP_UPLOAD_URL=https://api.example.com/upload
HTTP_UPLOAD_METHOD=POST
HTTP_UPLOAD_HEADERS={"Authorization": "Bearer token"}
```

#### API Configuration

You can also configure remote uploads via API:

```bash
# Enable remote uploads
curl -X POST http://localhost:3002/config/remote-upload \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "destinations": {
      "s3": {
        "enabled": true,
        "bucket": "my-bucket",
        "region": "us-east-1"
      }
    }
  }'

# Check remote upload status
curl http://localhost:3002/config/remote-upload/status
```

## API Endpoints

### File Upload Endpoints

All endpoints support file extension preservation and remote uploads.

#### 1. Standard Multipart Upload
```bash
POST /upload
Content-Type: multipart/form-data

# Standard multipart form data
```

#### 2. Base64 Encoded Upload
```bash
POST /upload-base64
Content-Type: application/x-www-form-urlencoded

file1=<base64-encoded-data>
file1_ext=jpg
file2=<base64-encoded-data>
file2_ext=png
metadata=some metadata
```

#### 3. Binary Encoded Upload
```bash
POST /upload-binary
Content-Type: application/x-www-form-urlencoded

file1=<binary-data>
file1_ext=pdf
```

#### 4. ASCII Encoded Upload
```bash
POST /upload-ascii
Content-Type: application/x-www-form-urlencoded

file1=<ascii-encoded-data>
file1_ext=txt
```

#### 5. UTF-8 Encoded Upload
```bash
POST /upload-utf8
Content-Type: application/x-www-form-urlencoded

file1=<utf8-encoded-data>
file1_ext=json
```

#### 6. UTF-16LE Encoded Upload
```bash
POST /upload-utf-16le
Content-Type: application/x-www-form-urlencoded

file1=<utf16le-encoded-data>
file1_ext=xml
```

#### 7. UCS-2 Encoded Upload
```bash
POST /upload-ucs2
Content-Type: application/x-www-form-urlencoded

file1=<ucs2-encoded-data>
file1_ext=txt
```

#### 8. Hex Encoded Upload
```bash
POST /upload-hex
Content-Type: application/x-www-form-urlencoded

file1=<hex-encoded-data>
file1_ext=bin
```

#### 9. Universal Encoded Upload
```bash
POST /upload-encoded
Content-Type: application/x-www-form-urlencoded

encoding=utf8
file1=<encoded-data>
file1_ext=jpg
file2=<encoded-data>
file2_ext=png
```

### Configuration Endpoints

#### 10. Health Check
```bash
GET /health
```

#### 11. Configure Remote Upload
```bash
POST /config/remote-upload
Content-Type: application/json

{
  "enabled": true,
  "destinations": {
    "s3": {
      "enabled": true,
      "bucket": "my-bucket",
      "region": "us-east-1"
    },
    "ftp": {
      "enabled": true,
      "host": "ftp.example.com",
      "username": "user",
      "password": "pass"
    },
    "http": {
      "enabled": true,
      "url": "https://api.example.com/upload",
      "method": "POST"
    }
  }
}
```

#### 12. Get Remote Upload Status
```bash
GET /config/remote-upload/status
```

## Response Format

All upload endpoints return a consistent response format:

```json
{
  "message": "Received and stored multipart form-data with base64 encoding",
  "files": [
    {
      "fieldname": "file1",
      "encoding": "base64",
      "size": 1024,
      "path": "/path/to/local/file.jpg",
      "success": true,
      "remoteUploads": [
        {
          "destination": "s3",
          "success": true,
          "url": "https://bucket.s3.region.amazonaws.com/filename.jpg",
          "size": 1024
        },
        {
          "destination": "ftp",
          "success": true,
          "path": "/uploads/filename.jpg",
          "size": 1024
        }
      ]
    }
  ],
  "fields": {
    "file1_ext": "jpg",
    "metadata": "some data"
  }
}
```

## File Storage Logic

The server preserves original file extensions:

- Files are saved with their original extensions (e.g., `.jpg`, `.png`, `.pdf`)
- Extension fields (`file1_ext`, `file2_ext`) specify the original file type
- If no extension is provided, files default to `.bin`
- Extensions are cleaned to remove invalid characters

## Remote Upload Features

### S3 Upload
- Supports all S3 regions
- Configurable bucket and region
- Uses AWS credentials for authentication
- Returns S3 URLs for uploaded files

### FTP Upload
- Supports standard FTP servers
- Configurable host, port, username, password
- Uploads to specified directory path
- Returns FTP file paths

### HTTP Upload
- Supports any HTTP API endpoint
- Configurable URL, method, and headers
- Uses multipart form data for uploads
- Returns API response data

## Installation and Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment (optional):**
```bash
cp env.example .env
# Edit .env with your settings
```

3. **Start the server:**
```bash
npm start
```

4. **Run tests:**
```bash
npm test
```

## Testing

Run the test script to verify all endpoints:

```bash
# Install axios for tests
npm install axios

# Start the server
node server.js

# In another terminal, run tests
node test-encodings.js
```

### Test Cleanup Options

The test script supports different cleanup modes:

```bash
# Default: Empty uploads folder completely
node test-encodings.js --empty-folder

# Time-based cleanup (files created in last 5 minutes)
node test-encodings.js --time-based

# Preserve all files
node test-encodings.js --preserve
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3002` |
| `REMOTE_UPLOAD_ENABLED` | Enable remote uploads | `false` |
| `S3_UPLOAD_ENABLED` | Enable S3 uploads | `false` |
| `S3_BUCKET` | S3 bucket name | - |
| `S3_REGION` | S3 region | `us-east-1` |
| `S3_ACCESS_KEY_ID` | S3 access key | - |
| `S3_SECRET_ACCESS_KEY` | S3 secret key | - |
| `FTP_UPLOAD_ENABLED` | Enable FTP uploads | `false` |
| `FTP_HOST` | FTP host | - |
| `FTP_PORT` | FTP port | `21` |
| `FTP_USERNAME` | FTP username | - |
| `FTP_PASSWORD` | FTP password | - |
| `FTP_PATH` | FTP upload path | `/uploads` |
| `HTTP_UPLOAD_ENABLED` | Enable HTTP uploads | `false` |
| `HTTP_UPLOAD_URL` | HTTP upload URL | - |
| `HTTP_UPLOAD_METHOD` | HTTP method | `POST` |
| `HTTP_UPLOAD_HEADERS` | HTTP headers (JSON) | `{}` |

## Logging

The server provides detailed logging for all operations:

- API endpoint hits
- File processing steps
- Remote upload attempts and results
- Error messages with context

## Error Handling

The server handles various error scenarios:

- Invalid encoding formats
- File processing errors
- Remote upload failures
- Configuration errors

All errors are logged and returned in the response with appropriate HTTP status codes.

