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

// Multer setup for memory storage to handle both files and encoded text fields
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    fieldSize: 50 * 1024 * 1024, // 50MB for text fields
    fields: 100 // Allow up to 100 fields
  }
});

// Helper function to process encoded data
function processEncodedData(data, encoding, fieldname, fileExtension = null) {
  console.log(`[PROCESSING] Processing ${fieldname} with ${encoding} encoding`);
  
  try {
    let buffer;
    let decodedData;
    
    switch (encoding) {
      case 'binary':
        buffer = Buffer.from(data, 'binary');
        decodedData = buffer;
        break;
        
      case 'ascii':
        buffer = Buffer.from(data, 'ascii');
        decodedData = buffer;
        break;
        
      case 'utf8':
      case 'utf-8':
        buffer = Buffer.from(data, 'utf8');
        decodedData = buffer;
        break;
        
      case 'utf-16le':
        buffer = Buffer.from(data, 'utf16le');
        decodedData = buffer;
        break;
        
      case 'ucs2':
        buffer = Buffer.from(data, 'ucs2');
        decodedData = buffer;
        break;
        
      case 'hex':
        if (!/^[0-9a-fA-F]+$/.test(data)) {
          throw new Error('Invalid hexadecimal string');
        }
        buffer = Buffer.from(data, 'hex');
        decodedData = buffer;
        break;
        
      case 'base64':
        console.log(`[BASE64] Validating base64 data for ${fieldname}`);
        
        const cleanData = data.replace(/\s/g, '');
        
        if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleanData)) {
          throw new Error('Invalid base64 format');
        }
        
        if (cleanData.length % 4 !== 0) {
          throw new Error('Invalid base64 string length');
        }
        
        try {
          buffer = Buffer.from(cleanData, 'base64');
          decodedData = buffer;
          console.log(`[BASE64] Successfully decoded ${decodedData.length} bytes`);
        } catch (base64Error) {
          const urlSafeData = cleanData.replace(/-/g, '+').replace(/_/g, '/');
          try {
            buffer = Buffer.from(urlSafeData, 'base64');
            decodedData = buffer;
            console.log(`[BASE64] Successfully decoded ${decodedData.length} bytes using URL-safe base64`);
          } catch (urlSafeError) {
            throw new Error(`Base64 decoding failed: ${base64Error.message}`);
          }
        }
        break;
        
      default:
        throw new Error(`Unsupported encoding: ${encoding}`);
    }
    
    if (!decodedData || decodedData.length === 0) {
      throw new Error('Decoded data is empty');
    }
    
    // Determine file extension
    let ext = '.bin';
    if (fileExtension) {
      ext = fileExtension.startsWith('.') ? fileExtension : `.${fileExtension}`;
      ext = ext.replace(/[^a-zA-Z0-9.]/g, '');
    }
    
    // Auto-detect file type for images if no extension provided
    if (!fileExtension && encoding === 'base64') {
      const header = decodedData.slice(0, 8);
      if (header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF) {
        ext = '.jpg';
        console.log(`[AUTO-DETECT] Detected JPEG image`);
      } else if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) {
        ext = '.png';
        console.log(`[AUTO-DETECT] Detected PNG image`);
      } else if (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46) {
        ext = '.gif';
        console.log(`[AUTO-DETECT] Detected GIF image`);
      } else if (header[0] === 0x42 && header[1] === 0x4D) {
        ext = '.bmp';
        console.log(`[AUTO-DETECT] Detected BMP image`);
      }
    }
    
    const filename = `${Date.now()}-${fieldname}-${encoding}${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);
    
    fs.writeFileSync(filepath, decodedData);
    
    console.log(`[SUCCESS] File saved: ${filename} (${decodedData.length} bytes)`);
    console.log(`[SUCCESS] File path: ${filepath}`);
    
    return {
      fieldname: fieldname,
      encoding: encoding,
      size: decodedData.length,
      path: filepath,
      success: true,
      decoded: true,
      originalSize: data.length,
      compressionRatio: data.length > 0 ? ((data.length - decodedData.length) / data.length * 100).toFixed(2) : 0
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

// Helper function to process multipart form data for encoded uploads
function processMultipartEncodedData(req, encoding) {
  console.log(`[MULTIPART] Processing multipart form data with ${encoding} encoding`);
  
  const results = [];
  
  // Process uploaded files (regular binary files)
  if (req.files && req.files.length > 0) {
    req.files.forEach(file => {
      console.log(`[FILE] Processing uploaded file: ${file.fieldname}`);
      
      const filename = `${Date.now()}-${file.fieldname}-multipart${path.extname(file.originalname || '.bin')}`;
      const filepath = path.join(UPLOAD_DIR, filename);
      
      fs.writeFileSync(filepath, file.buffer);
      
      results.push({
        fieldname: file.fieldname,
        originalname: file.originalname,
        encoding: 'multipart',
        mimetype: file.mimetype,
        size: file.size,
        path: filepath,
        success: true
      });
    });
  }
  
  // Process encoded text fields
  const fileFields = Object.keys(req.body).filter(key => 
    key.startsWith('file') && 
    !key.endsWith('_ext') && 
    key !== 'encoding'
  );
  
  fileFields.forEach(field => {
    const encodedData = req.body[field];
    const fileExtension = req.body[`${field}_ext`] || null;
    
    if (encodedData) {
      const result = processEncodedData(encodedData, encoding, field, fileExtension);
      results.push(result);
    }
  });
  
  return results;
}

// 1. Standard multipart form-data endpoint
app.post('/upload', upload.any(), (req, res) => {
  console.log(`[API HIT] /upload - Standard multipart form-data endpoint`);
  console.log(`[DETAILS] Files received: ${req.files ? req.files.length : 0}, Fields: ${Object.keys(req.body).length}`);
  
  const results = [];
  
  if (req.files && req.files.length > 0) {
    req.files.forEach(file => {
      const filename = `${Date.now()}-${file.fieldname}-multipart${path.extname(file.originalname || '.bin')}`;
      const filepath = path.join(UPLOAD_DIR, filename);
      
      fs.writeFileSync(filepath, file.buffer);
      
      results.push({
        fieldname: file.fieldname,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: filepath,
        success: true
      });
    });
  }
  
  res.json({
    message: 'Received and stored standard multipart form-data',
    files: results,
    fields: req.body
  });
});

// 2-8. Encoding-specific endpoints (all using multipart)
app.post('/upload-base64', upload.any(), (req, res) => {
  console.log(`[API HIT] /upload-base64 - Base64 encoding endpoint (multipart)`);
  console.log(`[DETAILS] Files received: ${req.files ? req.files.length : 0}, Fields: ${Object.keys(req.body).length}`);
  
  const savedFiles = processMultipartEncodedData(req, 'base64');
  
  res.json({
    message: 'Received and stored multipart form-data with base64 encoding',
    files: savedFiles,
    fields: req.body
  });
});

app.post('/upload-binary', upload.any(), (req, res) => {
  console.log(`[API HIT] /upload-binary - Binary encoding endpoint (multipart)`);
  console.log(`[DETAILS] Files received: ${req.files ? req.files.length : 0}, Fields: ${Object.keys(req.body).length}`);
  
  const savedFiles = processMultipartEncodedData(req, 'binary');
  
  res.json({
    message: 'Received and stored multipart form-data with binary encoding',
    files: savedFiles,
    fields: req.body
  });
});

app.post('/upload-ascii', upload.any(), (req, res) => {
  console.log(`[API HIT] /upload-ascii - ASCII encoding endpoint (multipart)`);
  console.log(`[DETAILS] Files received: ${req.files ? req.files.length : 0}, Fields: ${Object.keys(req.body).length}`);
  
  const savedFiles = processMultipartEncodedData(req, 'ascii');
  
  res.json({
    message: 'Received and stored multipart form-data with ASCII encoding',
    files: savedFiles,
    fields: req.body
  });
});

app.post('/upload-utf8', upload.any(), (req, res) => {
  console.log(`[API HIT] /upload-utf8 - UTF-8 encoding endpoint (multipart)`);
  console.log(`[DETAILS] Files received: ${req.files ? req.files.length : 0}, Fields: ${Object.keys(req.body).length}`);
  
  const savedFiles = processMultipartEncodedData(req, 'utf8');
  
  res.json({
    message: 'Received and stored multipart form-data with UTF-8 encoding',
    files: savedFiles,
    fields: req.body
  });
});

app.post('/upload-utf-16le', upload.any(), (req, res) => {
  console.log(`[API HIT] /upload-utf-16le - UTF-16LE encoding endpoint (multipart)`);
  console.log(`[DETAILS] Files received: ${req.files ? req.files.length : 0}, Fields: ${Object.keys(req.body).length}`);
  
  const savedFiles = processMultipartEncodedData(req, 'utf-16le');
  
  res.json({
    message: 'Received and stored multipart form-data with UTF-16LE encoding',
    files: savedFiles,
    fields: req.body
  });
});

app.post('/upload-ucs2', upload.any(), (req, res) => {
  console.log(`[API HIT] /upload-ucs2 - UCS-2 encoding endpoint (multipart)`);
  console.log(`[DETAILS] Files received: ${req.files ? req.files.length : 0}, Fields: ${Object.keys(req.body).length}`);
  
  const savedFiles = processMultipartEncodedData(req, 'ucs2');
  
  res.json({
    message: 'Received and stored multipart form-data with UCS-2 encoding',
    files: savedFiles,
    fields: req.body
  });
});

app.post('/upload-hex', upload.any(), (req, res) => {
  console.log(`[API HIT] /upload-hex - Hex encoding endpoint (multipart)`);
  console.log(`[DETAILS] Files received: ${req.files ? req.files.length : 0}, Fields: ${Object.keys(req.body).length}`);
  
  const savedFiles = processMultipartEncodedData(req, 'hex');
  
  res.json({
    message: 'Received and stored multipart form-data with hex encoding',
    files: savedFiles,
    fields: req.body
  });
});

// 9. Universal multipart encoding endpoint
app.post('/upload-encoded', upload.any(), (req, res) => {
  const encoding = req.body.encoding || 'utf8';
  
  console.log(`[API HIT] /upload-encoded - Universal encoding endpoint (multipart)`);
  console.log(`[DETAILS] Encoding: ${encoding}, Files received: ${req.files ? req.files.length : 0}, Fields: ${Object.keys(req.body).length}`);
  
  const fileFields = Object.keys(req.body).filter(key => 
    key.startsWith('file') && 
    !key.endsWith('_ext') && 
    key !== 'encoding'
  );
  
  if (!fileFields.length && (!req.files || req.files.length === 0)) {
    console.log(`[ERROR] No file fields or uploaded files found`);
    return res.status(400).json({
      error: 'No file fields or uploaded files found in request',
      supportedEncodings: ['binary', 'ascii', 'utf8', 'utf-16le', 'ucs2', 'hex', 'base64']
    });
  }
  
  const savedFiles = processMultipartEncodedData(req, encoding);
  
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
    server: 'multipart-encoding-server',
    contentType: 'multipart/form-data',
    supportedEncodings: ['binary', 'ascii', 'utf8', 'utf-16le', 'ucs2', 'hex', 'base64'],
    endpoints: [
      '/upload (standard multipart)',
      '/upload-base64 (multipart with base64 fields)',
      '/upload-binary (multipart with binary fields)',
      '/upload-ascii (multipart with ascii fields)',
      '/upload-utf8 (multipart with utf8 fields)',
      '/upload-utf-16le (multipart with utf16le fields)',
      '/upload-ucs2 (multipart with ucs2 fields)',
      '/upload-hex (multipart with hex fields)',
      '/upload-encoded (universal multipart with encoding parameter)'
    ]
  });
});

app.listen(PORT, () => {
  console.log(`🚀 [SERVER START] Multipart encoding server running on port ${PORT}`);
  console.log(`📋 [INFO] Content-Type: multipart/form-data for all endpoints`);
  console.log(`📋 [INFO] Supported encodings: binary, ascii, utf8, utf-16le, ucs2, hex, base64`);
  console.log(`📁 [INFO] Upload directory: ${UPLOAD_DIR}`);
  console.log(`🔗 [INFO] Health check: http://localhost:${PORT}/health`);
  console.log(`📝 [INFO] All endpoints are ready to receive multipart form data`);
});
