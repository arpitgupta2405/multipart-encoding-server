'use strict';

const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3002;

// Logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url} - ${req.ip}`);
  next();
});

// Ensure uploads directory exists
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR);
}

// Multer setup for disk storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    // Use original filename, but you could add timestamp or random string for uniqueness
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Helper function to process encoded data
function processEncodedData(data, encoding, fieldname, fileExtension = null) {
  console.log(`[PROCESSING] Processing ${fieldname} with ${encoding} encoding`);
  
  try {
    let buffer;
    let decodedData;
    
    switch (encoding) {
      case 'binary':
        // For binary, expect raw binary data
        buffer = Buffer.from(data, 'binary');
        decodedData = buffer;
        break;
        
      case 'ascii':
        // For ASCII, expect ASCII encoded string
        buffer = Buffer.from(data, 'ascii');
        decodedData = buffer;
        break;
        
      case 'utf8':
      case 'utf-8':
        // For UTF-8, expect UTF-8 encoded string
        buffer = Buffer.from(data, 'utf8');
        decodedData = buffer;
        break;
        
      case 'utf-16le':
        // For UTF-16LE, expect UTF-16LE encoded string
        buffer = Buffer.from(data, 'utf16le');
        decodedData = buffer;
        break;
        
      case 'ucs2':
        // For UCS-2, expect UCS-2 encoded string
        buffer = Buffer.from(data, 'ucs2');
        decodedData = buffer;
        break;
        
      case 'hex':
        // For hex, expect hexadecimal string
        buffer = Buffer.from(data, 'hex');
        decodedData = buffer;
        break;
        
      case 'base64':
        // For base64, expect base64 encoded string
        buffer = Buffer.from(data, 'base64');
        decodedData = buffer;
        break;
        
      default:
        throw new Error(`Unsupported encoding: ${encoding}`);
    }
    
    // Determine file extension
    let ext = '.bin'; // Default extension for binary data
    if (fileExtension) {
      // Ensure extension starts with a dot
      ext = fileExtension.startsWith('.') ? fileExtension : `.${fileExtension}`;
      // Clean the extension to remove any invalid characters
      ext = ext.replace(/[^a-zA-Z0-9.]/g, '');
    }
    
    // Generate filename with encoding info and original extension
    const filename = `${Date.now()}-${fieldname}-${encoding}${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);
    
    // Write the decoded data to file
    fs.writeFileSync(filepath, decodedData);
    
    console.log(`[SUCCESS] File saved: ${filename} (${decodedData.length} bytes)`);
    
    return {
      fieldname: fieldname,
      encoding: encoding,
      size: decodedData.length,
      path: filepath,
      success: true
    };
  } catch (e) {
    console.log(`[ERROR] Failed to process ${fieldname} with ${encoding} encoding: ${e.message}`);
    return {
      fieldname: fieldname,
      encoding: encoding,
      error: `Failed to process ${encoding} data: ${e.message}`,
      success: false
    };
  }
}

// 1. Standard multipart form-data endpoint
app.post('/upload', upload.any(), (req, res) => {
  console.log(`[API HIT] /upload - Standard multipart form-data endpoint`);
  console.log(`[DETAILS] Files received: ${req.files ? req.files.length : 0}, Fields: ${Object.keys(req.body).length}`);
  
  // req.files is an array of files
  // req.body contains text fields
  res.json({
    message: 'Received and stored standard multipart form-data',
    files: req.files.map(f => ({
      fieldname: f.fieldname,
      originalname: f.originalname,
      mimetype: f.mimetype,
      size: f.size,
      path: f.path
    })),
    fields: req.body
  });
});

// 2. Multipart form-data with base64 encoding endpoint
app.post('/upload-base64', express.urlencoded({ extended: true, limit: '50mb' }), (req, res) => {
  console.log(`[API HIT] /upload-base64 - Base64 encoding endpoint`);
  console.log(`[DETAILS] Base64 fields found: ${Object.keys(req.body).filter(key => key.startsWith('file') && !key.endsWith('_ext')).length}`);
  
  // Expect file fields to be base64 encoded in req.body
  const base64Fields = Object.keys(req.body).filter(key => key.startsWith('file') && !key.endsWith('_ext'));
  const savedFiles = base64Fields.map(field => {
    const fileExtension = req.body[`${field}_ext`] || null;
    return processEncodedData(req.body[field], 'base64', field, fileExtension);
  });
  
  res.json({
    message: 'Received and stored multipart form-data with base64 encoding',
    files: savedFiles,
    fields: req.body
  });
});

// 3. Multipart form-data with binary encoding endpoint
app.post('/upload-binary', express.urlencoded({ extended: true, limit: '50mb' }), (req, res) => {
  console.log(`[API HIT] /upload-binary - Binary encoding endpoint`);
  console.log(`[DETAILS] Binary fields found: ${Object.keys(req.body).filter(key => key.startsWith('file') && !key.endsWith('_ext')).length}`);
  
  const binaryFields = Object.keys(req.body).filter(key => key.startsWith('file') && !key.endsWith('_ext'));
  const savedFiles = binaryFields.map(field => {
    const fileExtension = req.body[`${field}_ext`] || null;
    return processEncodedData(req.body[field], 'binary', field, fileExtension);
  });
  
  res.json({
    message: 'Received and stored multipart form-data with binary encoding',
    files: savedFiles,
    fields: req.body
  });
});

// 4. Multipart form-data with ASCII encoding endpoint
app.post('/upload-ascii', express.urlencoded({ extended: true, limit: '50mb' }), (req, res) => {
  console.log(`[API HIT] /upload-ascii - ASCII encoding endpoint`);
  console.log(`[DETAILS] ASCII fields found: ${Object.keys(req.body).filter(key => key.startsWith('file') && !key.endsWith('_ext')).length}`);
  
  const asciiFields = Object.keys(req.body).filter(key => key.startsWith('file') && !key.endsWith('_ext'));
  const savedFiles = asciiFields.map(field => {
    const fileExtension = req.body[`${field}_ext`] || null;
    return processEncodedData(req.body[field], 'ascii', field, fileExtension);
  });
  
  res.json({
    message: 'Received and stored multipart form-data with ASCII encoding',
    files: savedFiles,
    fields: req.body
  });
});

// 5. Multipart form-data with UTF-8 encoding endpoint
app.post('/upload-utf8', express.urlencoded({ extended: true, limit: '50mb' }), (req, res) => {
  console.log(`[API HIT] /upload-utf8 - UTF-8 encoding endpoint`);
  console.log(`[DETAILS] UTF-8 fields found: ${Object.keys(req.body).filter(key => key.startsWith('file') && !key.endsWith('_ext')).length}`);
  
  const utf8Fields = Object.keys(req.body).filter(key => key.startsWith('file') && !key.endsWith('_ext'));
  const savedFiles = utf8Fields.map(field => {
    const fileExtension = req.body[`${field}_ext`] || null;
    return processEncodedData(req.body[field], 'utf8', field, fileExtension);
  });
  
  res.json({
    message: 'Received and stored multipart form-data with UTF-8 encoding',
    files: savedFiles,
    fields: req.body
  });
});

// 6. Multipart form-data with UTF-16LE encoding endpoint
app.post('/upload-utf-16le', express.urlencoded({ extended: true, limit: '50mb' }), (req, res) => {
  console.log(`[API HIT] /upload-utf-16le - UTF-16LE encoding endpoint`);
  console.log(`[DETAILS] UTF-16LE fields found: ${Object.keys(req.body).filter(key => key.startsWith('file') && !key.endsWith('_ext')).length}`);
  
  const utf16leFields = Object.keys(req.body).filter(key => key.startsWith('file') && !key.endsWith('_ext'));
  const savedFiles = utf16leFields.map(field => {
    const fileExtension = req.body[`${field}_ext`] || null;
    return processEncodedData(req.body[field], 'utf-16le', field, fileExtension);
  });
  
  res.json({
    message: 'Received and stored multipart form-data with UTF-16LE encoding',
    files: savedFiles,
    fields: req.body
  });
});

// 7. Multipart form-data with UCS-2 encoding endpoint
app.post('/upload-ucs2', express.urlencoded({ extended: true, limit: '50mb' }), (req, res) => {
  console.log(`[API HIT] /upload-ucs2 - UCS-2 encoding endpoint`);
  console.log(`[DETAILS] UCS-2 fields found: ${Object.keys(req.body).filter(key => key.startsWith('file') && !key.endsWith('_ext')).length}`);
  
  const ucs2Fields = Object.keys(req.body).filter(key => key.startsWith('file') && !key.endsWith('_ext'));
  const savedFiles = ucs2Fields.map(field => {
    const fileExtension = req.body[`${field}_ext`] || null;
    return processEncodedData(req.body[field], 'ucs2', field, fileExtension);
  });
  
  res.json({
    message: 'Received and stored multipart form-data with UCS-2 encoding',
    files: savedFiles,
    fields: req.body
  });
});

// 8. Multipart form-data with hex encoding endpoint
app.post('/upload-hex', express.urlencoded({ extended: true, limit: '50mb' }), (req, res) => {
  console.log(`[API HIT] /upload-hex - Hex encoding endpoint`);
  console.log(`[DETAILS] Hex fields found: ${Object.keys(req.body).filter(key => key.startsWith('file') && !key.endsWith('_ext')).length}`);
  
  const hexFields = Object.keys(req.body).filter(key => key.startsWith('file') && !key.endsWith('_ext'));
  const savedFiles = hexFields.map(field => {
    const fileExtension = req.body[`${field}_ext`] || null;
    return processEncodedData(req.body[field], 'hex', field, fileExtension);
  });
  
  res.json({
    message: 'Received and stored multipart form-data with hex encoding',
    files: savedFiles,
    fields: req.body
  });
});

// 9. Universal encoding endpoint that accepts encoding type as parameter
app.post('/upload-encoded', express.urlencoded({ extended: true, limit: '50mb' }), (req, res) => {
  const encoding = req.body.encoding || 'utf8';
  const fileFields = Object.keys(req.body).filter(key => key.startsWith('file') && !key.endsWith('_ext'));
  
  console.log(`[API HIT] /upload-encoded - Universal encoding endpoint`);
  console.log(`[DETAILS] Encoding: ${encoding}, File fields found: ${Object.keys(req.body).filter(key => key.startsWith('file') && !key.endsWith('_ext')).length}`);
  
  if (!fileFields.length) {
    console.log(`[ERROR] No file fields found in request body`);
    return res.status(400).json({
      error: 'No file fields found in request body',
      supportedEncodings: ['binary', 'ascii', 'utf8', 'utf-16le', 'ucs2', 'hex', 'base64']
    });
  }
  
  const savedFiles = fileFields.map(field => {
    const fileExtension = req.body[`${field}_ext`] || null;
    return processEncodedData(req.body[field], encoding, field, fileExtension);
  });
  
  res.json({
    message: `Received and stored multipart form-data with ${encoding} encoding`,
    encoding: encoding,
    files: savedFiles,
    fields: req.body
  });
});

// 10. Health check endpoint
app.get('/health', (req, res) => {
  console.log(`[API HIT] /health - Health check endpoint`);
  console.log(`[DETAILS] Health check requested`);
  
  res.json({
    status: 'healthy',
    server: 'multipartServer',
    supportedEncodings: ['binary', 'ascii', 'utf8', 'utf-16le', 'ucs2', 'hex', 'base64'],
        endpoints: [
      '/upload (standard multipart)',
      '/upload-base64',
      '/upload-binary',
      '/upload-ascii',
      '/upload-utf8',
      '/upload-utf-16le',
      '/upload-ucs2',
      '/upload-hex',
      '/upload-encoded (universal with encoding parameter)'
    ]
  });
});

app.listen(PORT, () => {
  console.log(`🚀 [SERVER START] Multipart server running on port ${PORT}`);
  console.log(`📋 [INFO] Supported encodings: binary, ascii, utf8, utf-16le, ucs2, hex, base64`);
  console.log(`📁 [INFO] Upload directory: ${UPLOAD_DIR}`);
  console.log(`🔗 [INFO] Health check: http://localhost:${PORT}/health`);
  console.log(`📝 [INFO] All endpoints are ready to receive requests`);
});