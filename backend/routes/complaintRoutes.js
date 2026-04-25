const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authRequired, allowRoles } = require('../middleware/authMiddleware');
const {
  uploadComplaintImages,
  requireComplaintImages,
  MAX_COMPLAINT_IMAGES
} = require('../middleware/uploadMiddleware');
const controller = require('../controllers/complaintController');

const router = express.Router();

router.post(
  '/',
  authRequired,
  allowRoles('citizen'),
  uploadComplaintImages.array('images', MAX_COMPLAINT_IMAGES),
  requireComplaintImages,
  [
    body('title').trim().notEmpty(),
    body('description').trim().notEmpty(),
    body('category').trim().notEmpty(),
    body('ward').trim().notEmpty(),
    body('location').trim().notEmpty()
  ],
  validate,
  controller.createComplaint
);

router.get('/', authRequired, controller.getComplaints);
router.get('/track/:trackingId', controller.trackComplaint);
router.get('/:id', authRequired, controller.getComplaintById);
router.patch('/:id', authRequired, allowRoles('officer', 'admin'), controller.updateComplaint);
router.post('/:id/respond', authRequired, allowRoles('citizen'), [body('message').trim().notEmpty()], validate, controller.respondToOfficerRequest);
router.delete('/:id', authRequired, allowRoles('officer', 'admin'), controller.deleteComplaint);

module.exports = router;
