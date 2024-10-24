const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const axios = require('axios');
const ConvertAPI = require('convertapi')('secret_rUR9P0XgT9vSkZMT');

const app = express();
const PORT = 443 || process.env.PORT;

// Set up multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Serve static files
app.use(express.static('public'));

// Parse JSON and URL-encoded data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// POST route for file uploads and conversion
app.post('/convert', upload.array('files'), async (req, res) => {
  const password = req.body.password || null;
  const format = req.body.format;

  if (!format) {
    return res.status(400).json({ message: 'Please select a file format for conversion.' });
  }

  const files = req.files;
  if (files.length === 0) {
    return res.status(400).json({ message: 'No files selected for conversion.' });
  }

  
  try {
    const convertedFiles = [];
    
    for (const file of files) {
      const filePath = path.join(__dirname, 'uploads', file.filename);
      const convertParams = password ? { File: filePath + path.extname(file), Password: password } : { File: filePath };
      
      const result = await ConvertAPI.convert(format, convertParams);
      convertedFiles.push(result.file.url);
    }
    
    // Create ZIP of converted files
    const zipPath = path.join(__dirname, 'zips', `converted-${Date.now()}.zip`);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    output.on('close', () => {
      res.download(zipPath, () => {
        // Delete ZIP after 2 hours
        setTimeout(() => {
          fs.unlink(`${filePath}`, (err) => {
            if (err) console.error(`Error deleting ZIP: ${zipPath}`);
          });

          fs.unlink(`${zipPath}`, (err) => {
            if (err) console.error(`Error deleting ZIP: ${zipPath}`);
          });
        }, 2 * 60 * 60 * 1000); // 2 hours
      });
    });

    archive.pipe(output);
    for (const fileUrl of convertedFiles) {
      const response = await axios.get(fileUrl, { responseType: 'stream' });
      archive.append(response.data, { name: path.basename(fileUrl) });
    }
    await archive.finalize();

  } catch (error) {
    console.error('Error during conversion: ' + error);
    res.status(500).json({ message: 'An Error occurred' + error });
  }
});

// POST route for URL uploads
app.post('/upload-url', async (req, res) => {
  const fileUrl = req.body.url;

  if (!fileUrl) {
    return res.status(400).json({ message: 'Please provide a valid URL.' });
  }

  try {
    const response = await axios.get(fileUrl, { responseType: 'stream' });

    const filePath = path.join(__dirname, 'uploads', `file-from-url-${Date.now()}`);
    const fileStream = fs.createWriteStream(filePath);

    response.data.pipe(fileStream);

    fileStream.on('finish', () => {
      res.status(200).json({ message: 'File uploaded successfully from URL' });

      // Auto-delete the file after 2 hours
      setTimeout(() => {
        fs.unlink(filePath, (err) => {
          if (err) console.error(`Error deleting file from URL: ${filePath}`);
        });
      }, 2 * 60 * 60 * 1000); // 2 hours
    });

  } catch (error) {
    console.error('Error uploading file from URL:', error);
    res.status(500).json({ message: 'Error uploading file from URL.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
