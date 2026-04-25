const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authRequired, allowRoles } = require('../middleware/authMiddleware');
const {
  getCategories,
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/categoryController');

const router = express.Router();

router.get('/', authRequired, getCategories);
router.get('/all', authRequired, allowRoles('admin'), getAllCategories);
router.post('/', authRequired, allowRoles('admin'), [body('name').trim().notEmpty()], validate, createCategory);
router.patch('/:id', authRequired, allowRoles('admin'), updateCategory);
router.delete('/:id', authRequired, allowRoles('admin'), deleteCategory);

module.exports = router;
