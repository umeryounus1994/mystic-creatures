const express = require('express');
const router = express.Router();
const commissionController = require('../controllers/commission.controller');
const { checkUserAuth } = require('../../../middlewares/authMiddleware');
const { checkAdminUserAuth } = require('../../../middlewares/authMiddlewareAdminPanel');

// Admin routes
router.get('/', checkAdminUserAuth, commissionController.getAll);
router.get('/:id', checkAdminUserAuth, commissionController.getById);
router.put('/:id/status', checkAdminUserAuth, commissionController.updateStatus);

// Partner routes
router.get('/partner/my-commissions', checkUserAuth, commissionController.getPartnerCommissions);

module.exports = router;