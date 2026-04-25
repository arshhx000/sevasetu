const express = require('express');
const { authRequired, allowRoles } = require('../middleware/authMiddleware');
const { getCitizens, getOfficerPerformance } = require('../controllers/adminController');

const router = express.Router();

router.get('/citizens', authRequired, allowRoles('admin'), getCitizens);
router.get('/officer-performance', authRequired, allowRoles('admin'), getOfficerPerformance);

module.exports = router;
