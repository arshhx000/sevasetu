const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const MAX_COMPLAINT_IMAGES = Number(process.env.MAX_COMPLAINT_IMAGES || 3);
const MAX_IMAGE_SIZE_MB = Number(process.env.MAX_IMAGE_SIZE_MB || 5);

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (_req, file) => {
    const originalName = (file.originalname || '').replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80) || 'complaint-image';
    return {
      folder: 'sevasetu/complaints',
      resource_type: 'image',
      public_id: `${Date.now()}-${originalName}`
    };
  }
});

function imageFileFilter(_req, file, cb) {
  if (!file?.mimetype?.startsWith('image/')) {
    return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Only image files are allowed'));
  }
  return cb(null, true);
}

const uploadComplaintImages = multer({
  storage,
  limits: {
    fileSize: MAX_IMAGE_SIZE_MB * 1024 * 1024,
    files: MAX_COMPLAINT_IMAGES
  },
  fileFilter: imageFileFilter
});

function requireComplaintImages(req, res, next) {
  const files = req.files || [];
  if (files.length === 0) {
    return res.status(400).json({ message: 'At least one image is required' });
  }

  if (files.length > MAX_COMPLAINT_IMAGES) {
    return res.status(400).json({ message: `Maximum ${MAX_COMPLAINT_IMAGES} images are allowed` });
  }

  return next();
}

function complaintUploadErrorHandler(err, _req, res, next) {
  if (!(err instanceof multer.MulterError)) return next(err);

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: `Each image must be ${MAX_IMAGE_SIZE_MB}MB or smaller` });
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({ message: `Maximum ${MAX_COMPLAINT_IMAGES} images are allowed` });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ message: 'Only image files are allowed' });
  }

  return res.status(400).json({ message: 'Image upload failed', error: err.message });
}

module.exports = {
  uploadComplaintImages,
  requireComplaintImages,
  complaintUploadErrorHandler,
  MAX_COMPLAINT_IMAGES,
  MAX_IMAGE_SIZE_MB
};