const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { AppError } = require('./errorHandler');

const UPLOAD_DIR = 'uploads';
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = file.fieldname === 'avatar' ? 'avatars' : 'documents';
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
  const ext = path.extname(file.originalname).toLowerCase().slice(1);
  const allowed = /jpeg|jpg|png|gif|webp|pdf|doc|docx|txt/;
  if (allowed.test(ext)) return cb(null, true);
  cb(new AppError('Invalid file type', 400));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

module.exports = { upload };
