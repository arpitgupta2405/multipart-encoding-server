# Multipart Server Move Summary

## Files Moved

The following files have been moved from `playground/` to `multipartServer/`:

### Core Files
- `multipartServer.js` → `multipartServer/multipartServer.js`
- `test-encodings.js` → `multipartServer/test-encodings.js`
- `README-multipartServer.md` → `multipartServer/README.md`
- `package.json` → `multipartServer/package.json` (updated)

### New Files Created
- `multipartServer/.gitignore` - Git ignore file for the project
- `multipartServer/uploads/` - Directory for uploaded files
- `multipartServer/MOVE_SUMMARY.md` - This summary file

## Directory Structure

```
multipartServer/
├── .gitignore
├── multipartServer.js
├── package.json
├── package-lock.json
├── README.md
├── test-encodings.js
├── uploads/
└── node_modules/
```

## Changes Made

1. **Updated package.json**: Changed name from "playground" to "multipart-encoding-server" and updated description
2. **Renamed README**: Changed from `README-multipartServer.md` to `README.md`
3. **Added .gitignore**: Proper Git ignore file for Node.js project
4. **Created uploads directory**: For storing uploaded files
5. **Cleaned up playground**: Removed all multipartServer-related files from playground directory
6. **Added 'use strict'**: Added strict mode directive to all JavaScript files for better error handling and performance

## Usage

To use the multipart-encoding-server:

```bash
cd multipartServer
npm install
npm start
```

To run tests:

```bash
npm test
```

## Supported Encodings

The server supports all encoding types from the multipart server system:
- binary
- ascii
- utf8
- utf-16le
- ucs2
- hex
- base64

## Endpoints

- `/upload` - Standard multipart upload
- `/upload-binary` - Binary encoding
- `/upload-ascii` - ASCII encoding
- `/upload-utf8` - UTF-8 encoding
- `/upload-utf16le` - UTF-16LE encoding
- `/upload-ucs2` - UCS-2 encoding
- `/upload-hex` - Hex encoding
- `/upload-base64` - Base64 encoding
- `/upload-encoded` - Universal endpoint with encoding parameter
- `/health` - Health check endpoint

## Move Date

July 21, 2024 