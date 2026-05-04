import multer from 'multer';
import { Request } from 'express';

// Configure multer to use memory storage
const storage = multer.memoryStorage();

// File filter to only accept CSV and Excel files
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/csv',
  ];

  const fileExtension = file.originalname.split('.').pop()?.toLowerCase();
  const allowedExtensions = ['csv', 'xlsx', 'xls'];

  if (fileExtension && allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only CSV and Excel files (.csv, .xlsx, .xls) are allowed'));
  }
};

// Configure multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});
