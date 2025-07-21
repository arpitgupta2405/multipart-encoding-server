'use strict';

const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const app = express();
const PORT = process.env.PORT || 3002;

// Remote upload configuration
const REMOTE_UPLOAD_CONFIG = {
  enabled: process.env.REMOTE_UPLOAD_ENABLED === 'true',
  destinations: {
    s3: {
      enabled: process.env.S3_UPLOAD_ENABLED === 'true',
      bucket: process.env.S3_BUCKET,
      region: process.env.S3_REGION || 'us-east-1',
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
    },
    ftp: {
      enabled: process.env.FTP_UPLOAD_ENABLED === 'true',
      host: process.env.FTP_HOST,
      port: process.env.FTP_PORT || 21,
      username: process.env.FTP_USERNAME,
      password: process.env.FTP_PASSWORD,
      path: process.env.FTP_PATH || '/uploads'
    },
    http: {
      enabled: process.env.HTTP_UPLOAD_ENABLED === 'true',
      url: process.env.HTTP_UPLOAD_URL,
      method: process.env.HTTP_UPLOAD_METHOD || 'POST',
      headers: process.env.HTTP_UPLOAD_HEADERS ? JSON.parse(process.env.HTTP_UPLOAD_HEADERS) : {}
    }
  }
};

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

// Remote upload functions
async function uploadToS3(filePath, filename, bucket = REMOTE_UPLOAD_CONFIG.destinations.s3.bucket) {
  try {
    console.log(`[S3 UPLOAD] Starting upload to S3: ${filename}`);
    
    // For S3 upload, we'll use a simple HTTP PUT to a pre-signed URL or direct S3 API
    // This is a simplified implementation - in production you'd use AWS SDK
    const fileContent = fs.readFileSync(filePath);
    const s3Url = `https://${bucket}.s3.${REMOTE_UPLOAD_CONFIG.destinations.s3.region}.amazonaws.com/${filename}`;
    
    const response = await axios.put(s3Url, fileContent, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'x-amz-acl': 'public-read'
      },
      auth: {
        username: REMOTE_UPLOAD_CONFIG.destinations.s3.accessKeyId,
        password: REMOTE_UPLOAD_CONFIG.destinations.s3.secretAccessKey
      }
    });
    
    console.log(`[S3 UPLOAD] Success: ${filename} uploaded to S3`);
    return {
      success: true,
      url: s3Url,
      size: fileContent.length
    };
  } catch (error) {
    console.log(`[S3 UPLOAD] Error uploading ${filename}: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

async function uploadToFTP(filePath, filename) {
  try {
    console.log(`[FTP UPLOAD] Starting upload to FTP: ${filename}`);
    
    // For FTP upload, we'll use a simple HTTP POST to an FTP gateway
    // This is a simplified implementation - in production you'd use an FTP library
    const fileContent = fs.readFileSync(filePath);
    const ftpConfig = REMOTE_UPLOAD_CONFIG.destinations.ftp;
    
    const formData = new FormData();
    formData.append('file', fileContent, {
      filename: filename,
      contentType: 'application/octet-stream'
    });
    formData.append('path', ftpConfig.path);
    
    const response = await axios.post(`ftp://${ftpConfig.host}:${ftpConfig.port}`, formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Basic ${Buffer.from(`${ftpConfig.username}:${ftpConfig.password}`).toString('base64')}`
      }
    });
    
    console.log(`[FTP UPLOAD] Success: ${filename} uploaded to FTP`);
    return {
      success: true,
      path: `${ftpConfig.path}/${filename}`,
      size: fileContent.length
    };
  } catch (error) {
    console.log(`[FTP UPLOAD] Error uploading ${filename}: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

async function uploadToHTTP(filePath, filename) {
  try {
    console.log(`[HTTP UPLOAD] Starting upload to HTTP endpoint: ${filename}`);
    
    const fileContent = fs.readFileSync(filePath);
    const httpConfig = REMOTE_UPLOAD_CONFIG.destinations.http;
    
    const formData = new FormData();
    formData.append('file', fileContent, {
      filename: filename,
      contentType: 'application/octet-stream'
    });
    
    const response = await axios({
      method: httpConfig.method,
      url: httpConfig.url,
      data: formData,
      headers: {
        ...formData.getHeaders(),
        ...httpConfig.headers
      }
    });
    
    console.log(`[HTTP UPLOAD] Success: ${filename} uploaded to HTTP endpoint`);
    return {
      success: true,
      response: response.data,
      size: fileContent.length
    };
  } catch (error) {
    console.log(`[HTTP UPLOAD] Error uploading ${filename}: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// Enhanced processEncodedData function with remote upload
async function processEncodedData(data, encoding, fieldname, fileExtension = null) {
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
    
    // Remote upload results
    const remoteUploads = [];
    
    // Upload to remote destinations if enabled
    if (REMOTE_UPLOAD_CONFIG.enabled) {
      console.log(`[REMOTE UPLOAD] Starting remote uploads for ${filename}`);
      
      // Upload to S3 if enabled
      if (REMOTE_UPLOAD_CONFIG.destinations.s3.enabled) {
        const s3Result = await uploadToS3(filepath, filename);
        remoteUploads.push({
          destination: 's3',
          ...s3Result
        });
      }
      
      // Upload to FTP if enabled
      if (REMOTE_UPLOAD_CONFIG.destinations.ftp.enabled) {
        const ftpResult = await uploadToFTP(filepath, filename);
        remoteUploads.push({
          destination: 'ftp',
          ...ftpResult
        });
      }
      
      // Upload to HTTP endpoint if enabled
      if (REMOTE_UPLOAD_CONFIG.destinations.http.enabled) {
        const httpResult = await uploadToHTTP(filepath, filename);
        remoteUploads.push({
          destination: 'http',
          ...httpResult
        });
      }
    }
    
    return {
      fieldname: fieldname,
      encoding: encoding,
      size: decodedData.length,
      path: filepath,
      success: true,
      remoteUploads: remoteUploads
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
app.post('/upload-base64', express.urlencoded({ extended: true, limit: '50mb' }), async (req, res) => {
  console.log(`[API HIT] /upload-base64 - Base64 encoding endpoint`);
  console.log(`[DETAILS] Base64 fields found: ${Object.keys(req.body).filter(key => key.startsWith('file') && !key.endsWith('_ext')).length}`);
  
  // Expect file fields to be base64 encoded in req.body
  const base64Fields = Object.keys(req.body).filter(key => key.startsWith('file') && !key.endsWith('_ext'));
  const savedFiles = await Promise.all(base64Fields.map(async field => {
    const fileExtension = req.body[`${field}_ext`] || null;
    return await processEncodedData(req.body[field], 'base64', field, fileExtension);
  }));
  
  res.json({
    message: 'Received and stored multipart form-data with base64 encoding',
    files: savedFiles,
    fields: req.body
  });
});

// 3. Multipart form-data with binary encoding endpoint
app.post('/upload-binary', express.urlencoded({ extended: true, limit: '50mb' }), async (req, res) => {
  console.log(`[API HIT] /upload-binary - Binary encoding endpoint`);
  console.log(`[DETAILS] Binary fields found: ${Object.keys(req.body).filter(key => key.startsWith('file') && !key.endsWith('_ext')).length}`);
  
  const binaryFields = Object.keys(req.body).filter(key => key.startsWith('file') && !key.endsWith('_ext'));
  const savedFiles = await Promise.all(binaryFields.map(async field => {
    const fileExtension = req.body[`${field}_ext`] || null;
    return await processEncodedData(req.body[field], 'binary', field, fileExtension);
  }));
  
  res.json({
    message: 'Received and stored multipart form-data with binary encoding',
    files: savedFiles,
    fields: req.body
  });
});

// 4. Multipart form-data with ASCII encoding endpoint
app.post('/upload-ascii', express.urlencoded({ extended: true, limit: '50mb' }), async (req, res) => {
  console.log(`[API HIT] /upload-ascii - ASCII encoding endpoint`);
  console.log(`[DETAILS] ASCII fields found: ${Object.keys(req.body).filter(key => key.startsWith('file') && !key.endsWith('_ext')).length}`);
  
  const asciiFields = Object.keys(req.body).filter(key => key.startsWith('file') && !key.endsWith('_ext'));
  const savedFiles = await Promise.all(asciiFields.map(async field => {
    const fileExtension = req.body[`${field}_ext`] || null;
    return await processEncodedData(req.body[field], 'ascii', field, fileExtension);
  }));
  
  res.json({
    message: 'Received and stored multipart form-data with ASCII encoding',
    files: savedFiles,
    fields: req.body
  });
});

// 5. Multipart form-data with UTF-8 encoding endpoint
app.post('/upload-utf8', express.urlencoded({ extended: true, limit: '50mb' }), async (req, res) => {
  console.log(`[API HIT] /upload-utf8 - UTF-8 encoding endpoint`);
  console.log(`[DETAILS] UTF-8 fields found: ${Object.keys(req.body).filter(key => key.startsWith('file') && !key.endsWith('_ext')).length}`);
  
  const utf8Fields = Object.keys(req.body).filter(key => key.startsWith('file') && !key.endsWith('_ext'));
  const savedFiles = await Promise.all(utf8Fields.map(async field => {
    const fileExtension = req.body[`${field}_ext`] || null;
    return await processEncodedData(req.body[field], 'utf8', field, fileExtension);
  }));
  
  res.json({
    message: 'Received and stored multipart form-data with UTF-8 encoding',
    files: savedFiles,
    fields: req.body
  });
});

// 6. Multipart form-data with UTF-16LE encoding endpoint
app.post('/upload-utf-16le', express.urlencoded({ extended: true, limit: '50mb' }), async (req, res) => {
  console.log(`[API HIT] /upload-utf-16le - UTF-16LE encoding endpoint`);
  console.log(`[DETAILS] UTF-16LE fields found: ${Object.keys(req.body).filter(key => key.startsWith('file') && !key.endsWith('_ext')).length}`);
  
  const utf16leFields = Object.keys(req.body).filter(key => key.startsWith('file') && !key.endsWith('_ext'));
  const savedFiles = await Promise.all(utf16leFields.map(async field => {
    const fileExtension = req.body[`${field}_ext`] || null;
    return await processEncodedData(req.body[field], 'utf-16le', field, fileExtension);
  }));
  
  res.json({
    message: 'Received and stored multipart form-data with UTF-16LE encoding',
    files: savedFiles,
    fields: req.body
  });
});

// 7. Multipart form-data with UCS-2 encoding endpoint
app.post('/upload-ucs2', express.urlencoded({ extended: true, limit: '50mb' }), async (req, res) => {
  console.log(`[API HIT] /upload-ucs2 - UCS-2 encoding endpoint`);
  console.log(`[DETAILS] UCS-2 fields found: ${Object.keys(req.body).filter(key => key.startsWith('file') && !key.endsWith('_ext')).length}`);
  
  const ucs2Fields = Object.keys(req.body).filter(key => key.startsWith('file') && !key.endsWith('_ext'));
  const savedFiles = await Promise.all(ucs2Fields.map(async field => {
    const fileExtension = req.body[`${field}_ext`] || null;
    return await processEncodedData(req.body[field], 'ucs2', field, fileExtension);
  }));
  
  res.json({
    message: 'Received and stored multipart form-data with UCS-2 encoding',
    files: savedFiles,
    fields: req.body
  });
});

// 8. Multipart form-data with hex encoding endpoint
app.post('/upload-hex', express.urlencoded({ extended: true, limit: '50mb' }), async (req, res) => {
  console.log(`[API HIT] /upload-hex - Hex encoding endpoint`);
  console.log(`[DETAILS] Hex fields found: ${Object.keys(req.body).filter(key => key.startsWith('file') && !key.endsWith('_ext')).length}`);
  
  const hexFields = Object.keys(req.body).filter(key => key.startsWith('file') && !key.endsWith('_ext'));
  const savedFiles = await Promise.all(hexFields.map(async field => {
    const fileExtension = req.body[`${field}_ext`] || null;
    return await processEncodedData(req.body[field], 'hex', field, fileExtension);
  }));
  
  res.json({
    message: 'Received and stored multipart form-data with hex encoding',
    files: savedFiles,
    fields: req.body
  });
});

// 9. Universal encoding endpoint that accepts encoding type as parameter
app.post('/upload-encoded', express.urlencoded({ extended: true, limit: '50mb' }), async (req, res) => {
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
  
  const savedFiles = await Promise.all(fileFields.map(async field => {
    const fileExtension = req.body[`${field}_ext`] || null;
    return await processEncodedData(req.body[field], encoding, field, fileExtension);
  }));
  
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
    remoteUpload: {
      enabled: REMOTE_UPLOAD_CONFIG.enabled,
      destinations: {
        s3: REMOTE_UPLOAD_CONFIG.destinations.s3.enabled,
        ftp: REMOTE_UPLOAD_CONFIG.destinations.ftp.enabled,
        http: REMOTE_UPLOAD_CONFIG.destinations.http.enabled
      }
    },
    endpoints: [
      '/upload (standard multipart)',
      '/upload-base64',
      '/upload-binary',
      '/upload-ascii',
      '/upload-utf8',
      '/upload-utf-16le',
      '/upload-ucs2',
      '/upload-hex',
      '/upload-encoded (universal with encoding parameter)',
      '/config/remote-upload (configure remote uploads)',
      '/config/remote-upload/status (get remote upload status)'
    ]
  });
});

// 11. Configure remote upload settings
app.post('/config/remote-upload', express.json(), (req, res) => {
  console.log(`[API HIT] /config/remote-upload - Configure remote upload settings`);
  
  try {
    const { enabled, destinations } = req.body;
    
    if (enabled !== undefined) {
      REMOTE_UPLOAD_CONFIG.enabled = enabled;
    }
    
    if (destinations) {
      if (destinations.s3) {
        Object.assign(REMOTE_UPLOAD_CONFIG.destinations.s3, destinations.s3);
      }
      if (destinations.ftp) {
        Object.assign(REMOTE_UPLOAD_CONFIG.destinations.ftp, destinations.ftp);
      }
      if (destinations.http) {
        Object.assign(REMOTE_UPLOAD_CONFIG.destinations.http, destinations.http);
      }
    }
    
    console.log(`[CONFIG] Remote upload settings updated`);
    
    res.json({
      message: 'Remote upload configuration updated successfully',
      config: {
        enabled: REMOTE_UPLOAD_CONFIG.enabled,
        destinations: {
          s3: {
            enabled: REMOTE_UPLOAD_CONFIG.destinations.s3.enabled,
            bucket: REMOTE_UPLOAD_CONFIG.destinations.s3.bucket,
            region: REMOTE_UPLOAD_CONFIG.destinations.s3.region
          },
          ftp: {
            enabled: REMOTE_UPLOAD_CONFIG.destinations.ftp.enabled,
            host: REMOTE_UPLOAD_CONFIG.destinations.ftp.host,
            port: REMOTE_UPLOAD_CONFIG.destinations.ftp.port,
            path: REMOTE_UPLOAD_CONFIG.destinations.ftp.path
          },
          http: {
            enabled: REMOTE_UPLOAD_CONFIG.destinations.http.enabled,
            url: REMOTE_UPLOAD_CONFIG.destinations.http.url,
            method: REMOTE_UPLOAD_CONFIG.destinations.http.method
          }
        }
      }
    });
  } catch (error) {
    console.log(`[ERROR] Failed to update remote upload config: ${error.message}`);
    res.status(400).json({
      error: 'Failed to update remote upload configuration',
      details: error.message
    });
  }
});

// 12. Get remote upload status
app.get('/config/remote-upload/status', (req, res) => {
  console.log(`[API HIT] /config/remote-upload/status - Get remote upload status`);
  
  res.json({
    enabled: REMOTE_UPLOAD_CONFIG.enabled,
    destinations: {
      s3: {
        enabled: REMOTE_UPLOAD_CONFIG.destinations.s3.enabled,
        configured: !!REMOTE_UPLOAD_CONFIG.destinations.s3.bucket,
        bucket: REMOTE_UPLOAD_CONFIG.destinations.s3.bucket,
        region: REMOTE_UPLOAD_CONFIG.destinations.s3.region
      },
      ftp: {
        enabled: REMOTE_UPLOAD_CONFIG.destinations.ftp.enabled,
        configured: !!(REMOTE_UPLOAD_CONFIG.destinations.ftp.host && REMOTE_UPLOAD_CONFIG.destinations.ftp.username),
        host: REMOTE_UPLOAD_CONFIG.destinations.ftp.host,
        port: REMOTE_UPLOAD_CONFIG.destinations.ftp.port,
        path: REMOTE_UPLOAD_CONFIG.destinations.ftp.path
      },
      http: {
        enabled: REMOTE_UPLOAD_CONFIG.destinations.http.enabled,
        configured: !!REMOTE_UPLOAD_CONFIG.destinations.http.url,
        url: REMOTE_UPLOAD_CONFIG.destinations.http.url,
        method: REMOTE_UPLOAD_CONFIG.destinations.http.method
      }
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 [SERVER START] Multipart server running on port ${PORT}`);
  console.log(`📋 [INFO] Supported encodings: binary, ascii, utf8, utf-16le, ucs2, hex, base64`);
  console.log(`📁 [INFO] Upload directory: ${UPLOAD_DIR}`);
  console.log(`🔗 [INFO] Health check: http://localhost:${PORT}/health`);
  console.log(`📝 [INFO] All endpoints are ready to receive requests`);
  console.log(`🌐 [INFO] Remote upload enabled: ${REMOTE_UPLOAD_CONFIG.enabled}`);
  if (REMOTE_UPLOAD_CONFIG.enabled) {
    console.log(`📤 [INFO] Remote destinations: S3(${REMOTE_UPLOAD_CONFIG.destinations.s3.enabled}), FTP(${REMOTE_UPLOAD_CONFIG.destinations.ftp.enabled}), HTTP(${REMOTE_UPLOAD_CONFIG.destinations.http.enabled})`);
  }
});