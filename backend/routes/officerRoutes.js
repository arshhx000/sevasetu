const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authRequired, allowRoles } = require('../middleware/authMiddleware');
const { getOfficers, createOfficer, updateOfficerStatus } = require('../controllers/officerController');

const router = express.Router();

router.get('/', authRequired, allowRoles('admin', 'officer'), getOfficers);
router.post('/', authRequired, allowRoles('admin'), [
  body('name').trim().notEmpty(),
  body('officialEmail').isEmail(),
  body('employeeId').trim().notEmpty(),
  body('password').optional().isLength({ min: 6 })
], validate, createOfficer);
router.patch('/:id/status', authRequired, allowRoles('admin'), [body('isActive').isBoolean()], validate, updateOfficerStatus);

module.exports = router;
