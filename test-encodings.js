'use strict';

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3002';

// Helper function to create test data in different encodings
function createTestData() {
  const testString = 'Hello World! This is a test file with special characters: ñáéíóú 测试 テスト';
  
  return {
    utf8: testString,
    ascii: testString,
    binary: Buffer.from(testString, 'utf8').toString('binary'),
    base64: Buffer.from(testString, 'utf8').toString('base64'),
    hex: Buffer.from(testString, 'utf8').toString('hex'),
    'utf-16le': Buffer.from(testString, 'utf8').toString('utf16le'),
    ucs2: Buffer.from(testString, 'utf8').toString('ucs2')
  };
}

// Helper function to test an encoding endpoint
async function testEncoding(encoding, data) {
  try {
    console.log(`\n=== Testing ${encoding.toUpperCase()} encoding ===`);
    
    const response = await axios.post(`${BASE_URL}/upload-${encoding}`, {
      file1: data,
      file1_ext: 'txt',
      file2: data + '_second_file',
      file2_ext: 'json',
      metadata: 'test metadata'
    });
    
    console.log(`Status: ${response.status}`);
    console.log(`Message: ${response.data.message}`);
    console.log('Files processed:');
    response.data.files.forEach(file => {
      if (file.success) {
        console.log(`  ✓ ${file.fieldname}: ${file.size} bytes -> ${file.path}`);
      } else {
        console.log(`  ✗ ${file.fieldname}: ${file.error}`);
      }
    });
    
    return response.data;
  } catch (error) {
    console.error(`Error testing ${encoding}:`, error.response?.data || error.message);
    return null;
  }
}

// Helper function to test the universal encoding endpoint
async function testUniversalEncoding(encoding, data) {
  try {
    console.log(`\n=== Testing Universal endpoint with ${encoding.toUpperCase()} encoding ===`);
    
    // Create URLSearchParams for form data
    const formData = new URLSearchParams();
    formData.append('encoding', encoding);
    formData.append('file1', data);
    formData.append('file1_ext', 'jpg');
    formData.append('file2', data + '_universal_test');
    formData.append('file2_ext', 'png');
    formData.append('metadata', 'universal test metadata');
    
    const response = await axios.post(`${BASE_URL}/upload-encoded`, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    console.log(`Status: ${response.status}`);
    console.log(`Message: ${response.data.message}`);
    console.log('Files processed:');
    response.data.files.forEach(file => {
      if (file.success) {
        console.log(`  ✓ ${file.fieldname}: ${file.size} bytes -> ${file.path}`);
      } else {
        console.log(`  ✗ ${file.fieldname}: ${file.error}`);
      }
    });
    
    return response.data;
  } catch (error) {
    console.error(`Error testing universal ${encoding}:`, error.response?.data || error.message);
    return null;
  }
}

// Helper function to test health endpoint
async function testHealth() {
  try {
    console.log('\n=== Testing Health Endpoint ===');
    const response = await axios.get(`${BASE_URL}/health`);
    console.log(`Status: ${response.status}`);
    console.log('Server Info:', response.data);
  } catch (error) {
    console.error('Error testing health endpoint:', error.response?.data || error.message);
  }
}

// Helper function to clean up test files
async function cleanupTestFiles(emptyFolder = false) {
  try {
    console.log('\n🧹 Cleaning up test files...');
    const uploadsDir = path.join(__dirname, 'uploads');
    
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      let deletedCount = 0;
      
      if (emptyFolder) {
        // Empty the entire uploads folder (except system files)
        console.log('🗂️  Emptying uploads folder...');
        for (const file of files) {
          // Skip system files and hidden files
          if (file.startsWith('.') || file === '.DS_Store') {
            continue;
          }
          
          const filePath = path.join(uploadsDir, file);
          fs.unlinkSync(filePath);
          deletedCount++;
        }
        console.log(`🗑️  Deleted ${deletedCount} files (emptied folder)`);
      } else {
        // Time-based cleanup (only recent files)
        for (const file of files) {
          // Skip system files and hidden files
          if (file.startsWith('.') || file === '.DS_Store') {
            continue;
          }
          
          // Only delete files created during this test run (within last 5 minutes)
          const filePath = path.join(uploadsDir, file);
          const stats = fs.statSync(filePath);
          const fileAge = Date.now() - stats.mtime.getTime();
          
          // Delete files created in the last 5 minutes (300000 ms)
          if (fileAge < 300000) {
            fs.unlinkSync(filePath);
            deletedCount++;
          }
        }
        console.log(`🗑️  Deleted ${deletedCount} test files (time-based cleanup)`);
      }
    } else {
      console.log('📁 Uploads directory does not exist');
    }
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting Multipart Server Encoding Tests');
  console.log('Make sure the multipartServer is running on port 3002');
  
  // Check command line arguments for cleanup mode
  const emptyFolder = process.argv.includes('--empty-folder') || process.argv.includes('--clean');
  const timeBased = process.argv.includes('--time-based') || process.argv.includes('--preserve');
  
  if (emptyFolder) {
    console.log('🗂️  Will empty uploads folder after tests');
  } else if (timeBased) {
    console.log('⏱️  Will use time-based cleanup (preserve existing files)');
  } else {
    console.log('🗂️  Will empty uploads folder after tests (default)');
  }
  
  // Test health endpoint first
  await testHealth();
  
  // Create test data
  const testData = createTestData();
  
  // Test each encoding endpoint
  const encodings = ['utf8', 'ascii', 'binary', 'base64', 'hex', 'utf-16le', 'ucs2'];
  
  for (const encoding of encodings) {
    await testEncoding(encoding, testData[encoding]);
  }
  
  // Test universal endpoint with different encodings
  for (const encoding of encodings) {
    await testUniversalEncoding(encoding, testData[encoding]);
  }
  
  console.log('\n✅ All tests completed!');
  
  // Clean up test files (default to empty folder, unless time-based is specified)
  await cleanupTestFiles(!timeBased);
  
  console.log('\n📁 Check the uploads directory to see any remaining files:');
  console.log(`   ${path.join(__dirname, 'uploads')}`);
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testEncoding,
  testUniversalEncoding,
  testHealth,
  createTestData
}; 