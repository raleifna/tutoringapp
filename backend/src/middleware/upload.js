// src/middleware/upload.js - File Upload Middleware (Multer)
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { AppError } = require('./errorHandler');

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024; // 5MB

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'misc';
    if (file.fieldname === 'avatar') folder = 'avatars';
    else if (file.fieldname === 'attachment') folder = 'attachments';
    else if (file.fieldname === 'file' || file.fieldname === 'verificationFiles')
      folder = 'documents';
    const targetDir = path.join(UPLOAD_DIR, folder);
    fs.mkdirSync(targetDir, { recursive: true });
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedImages = /jpeg|jpg|png|gif|webp/;
  const allowedDocs = /pdf|doc|docx|txt/;
  const ext = path.extname(file.originalname).toLowerCase().slice(1);

  if (file.fieldname === 'avatar' && allowedImages.test(ext)) {
    return cb(null, true);
  }
  if (file.fieldname === 'attachment' && (allowedImages.test(ext) || allowedDocs.test(ext))) {
    return cb(null, true);
  }
  if (file.fieldname === 'file' && allowedDocs.test(ext)) {
    return cb(null, true);
  }
  if (
    file.fieldname === 'verificationFiles' &&
    (allowedImages.test(ext) || allowedDocs.test(ext))
  ) {
    return cb(null, true);
  }

  cb(new AppError('Invalid file type', 400));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

module.exports = { upload };
