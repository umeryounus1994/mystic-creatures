const express = require('express');
const router = express.Router();
const commissionController = require('../controllers/commission.controller');
const { checkUserAuth } = require('../../../middlewares/authMiddleware');
const { checkAdminUserAuth } = require('../../../middlewares/authMiddlewareAdminPanel');
const { checkAuthOrigins } = require('#middlewares/authMiddlewareGenericAll');

// Admin routes
router.get('/', checkAuthOrigins, commissionController.getAll);
router.get('/:id', checkAuthOrigins, commissionController.getById);
router.put('/:id/status', checkAuthOrigins, commissionController.updateStatus);

// Partner routes
router.get('/partner/my-commissions', checkUserAuth, commissionController.getPartnerCommissions);

module.exports = router;