const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authRequired } = require('../middleware/authMiddleware');
const controller = require('../controllers/authController');

const router = express.Router();

router.post('/register', [
  body('role').isIn(['citizen', 'officer']).withMessage('Valid role is required')
], validate, controller.register);

router.post('/login', [
  body('identifier').trim().notEmpty().withMessage('User ID, email, or phone is required'),
  body('role').isIn(['citizen', 'officer', 'admin']).withMessage('Valid role is required'),
  body('password').notEmpty().withMessage('Password is required')
], validate, controller.login);

router.get('/me', authRequired, controller.me);

module.exports = router;
