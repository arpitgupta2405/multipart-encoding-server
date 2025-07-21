# Enhanced Multipart Server

This enhanced multipart server supports multiple encoding formats for file uploads, matching the encoding types supported by the integrator-adaptor system.

## Supported Encodings

The server supports the following encoding formats:
- **binary** - Raw binary data
- **ascii** - ASCII encoded text
- **utf8** - UTF-8 encoded text
- **utf-16le** - UTF-16 Little Endian encoded text
- **ucs2** - UCS-2 encoded text
- **hex** - Hexadecimal encoded data
- **base64** - Base64 encoded data

## Endpoints

### 1. Standard Multipart Upload
```
POST /upload
```
Handles standard multipart/form-data uploads using multer.

### 2. Encoding-Specific Endpoints

#### Binary Encoding
```
POST /upload-binary
Content-Type: application/x-www-form-urlencoded
```
Expects file fields to be binary encoded strings.

#### ASCII Encoding
```
POST /upload-ascii
Content-Type: application/x-www-form-urlencoded
```
Expects file fields to be ASCII encoded strings.

#### UTF-8 Encoding
```
POST /upload-utf8
Content-Type: application/x-www-form-urlencoded
```
Expects file fields to be UTF-8 encoded strings.

#### UTF-16LE Encoding
```
POST /upload-utf16le
Content-Type: application/x-www-form-urlencoded
```
Expects file fields to be UTF-16LE encoded strings.

#### UCS-2 Encoding
```
POST /upload-ucs2
Content-Type: application/x-www-form-urlencoded
```
Expects file fields to be UCS-2 encoded strings.

#### Hex Encoding
```
POST /upload-hex
Content-Type: application/x-www-form-urlencoded
```
Expects file fields to be hexadecimal encoded strings.

#### Base64 Encoding
```
POST /upload-base64
Content-Type: application/x-www-form-urlencoded
```
Expects file fields to be base64 encoded strings.

### 3. Universal Encoding Endpoint
```
POST /upload-encoded
Content-Type: application/x-www-form-urlencoded
```
Accepts an `encoding` parameter to specify the encoding type dynamically.

**Parameters:**
- `encoding` (optional): The encoding type to use. Defaults to 'utf8'
- File fields: Any field starting with 'file' will be processed

### 4. Health Check
```
GET /health
```
Returns server status and supported encodings.

## Request Format

For encoding-specific endpoints, send data in the following format:

```javascript
{
  "file1": "encoded_data_here",
  "file1_ext": "jpg",  // Optional: specify file extension
  "file2": "another_encoded_file",
  "file2_ext": "png",  // Optional: specify file extension
  "metadata": "additional_data"
}
```

For the universal endpoint:

```javascript
{
  "encoding": "base64",
  "file1": "base64_encoded_data",
  "file1_ext": "jpg",  // Optional: specify file extension
  "file2": "another_base64_file",
  "file2_ext": "pdf",  // Optional: specify file extension
  "metadata": "additional_data"
}
```

## Response Format

All endpoints return a JSON response with the following structure:

```javascript
{
  "message": "Description of the operation",
  "files": [
    {
      "fieldname": "file1",
      "encoding": "base64",
      "size": 1234,
      "path": "/path/to/saved/file",
      "success": true
    }
  ],
  "fields": {
    // All non-file fields from the request
  }
}
```

## Error Handling

If processing fails for a file, the response will include:

```javascript
{
  "fieldname": "file1",
  "encoding": "base64",
  "error": "Error description",
  "success": false
}
```

## File Storage

All processed files are saved to the `uploads/` directory with filenames that include:
- Timestamp
- Field name
- Encoding type
- Original file extension (if provided) or `.bin` as default

Examples:
- With extension: `1703123456789-file1-base64.jpg`
- Without extension: `1703123456789-file1-base64.bin`

## Usage Examples

### Using curl with base64 encoding:

```bash
# Create base64 encoded data
echo "Hello World" | base64

# Send to server
curl -X POST http://localhost:3002/upload-base64 \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "file1=SGVsbG8gV29ybGQK&file1_ext=jpg&metadata=test"
```

### Running Tests with Automatic Cleanup:

```bash
# Run the test suite (default: empties uploads folder)
npm test

# Run with explicit empty folder cleanup
npm run test:clean

# Run with time-based cleanup (preserves existing files)
npm run test:preserve

# Direct command line options
node test-encodings.js --empty-folder    # Empty uploads folder
node test-encodings.js --time-based      # Time-based cleanup
node test-encodings.js --preserve        # Same as time-based
node test-encodings.js --clean           # Same as empty-folder
```

**Cleanup Options:**
- **Default/Empty Folder**: Deletes ALL files in uploads directory (except system files)
- **Time-based**: Only deletes files created within the last 5 minutes
- **Safe for**: Development and testing environments
- **Not recommended for**: Production environments with important files

### Using JavaScript/Node.js:

```javascript
const axios = require('axios');

// Test UTF-8 encoding
const response = await axios.post('http://localhost:3002/upload-utf8', {
  file1: 'Hello World!',
  file2: 'Another file content',
  metadata: 'test data'
});

console.log(response.data);
```

### Using the universal endpoint:

```javascript
const axios = require('axios');

// Test with hex encoding
const response = await axios.post('http://localhost:3002/upload-encoded', {
  encoding: 'hex',
  file1: Buffer.from('Hello World').toString('hex'),
  metadata: 'test data'
});

console.log(response.data);
```

## Testing

Run the test script to verify all endpoints:

```bash
# Install dependencies
npm install axios

# Start the server
node multipartServer.js

# In another terminal, run tests
node test-encodings.js
```

## Server Configuration

- **Port**: 3002 (configurable via PORT environment variable)
- **Upload Directory**: `./uploads/` (created automatically)
- **Request Size Limit**: 50MB per endpoint
- **File Storage**: Disk storage with timestamped filenames

## Integration with Integrator-Adaptor

This enhanced multipartServer aligns with the encoding types supported by the integrator-adaptor system as defined in `integrator-models/src/models/import/httpImport.js`:

```javascript
schemaObject.http.blobFormat = { 
  type: String, 
  enum: ['utf8', 'ucs2', 'utf-16le', 'ascii', 'binary', 'base64', 'hex'], 
  lowercase: true 
}
```

The server provides a testing environment for all these encoding formats, ensuring compatibility with the main system's import functionality. 