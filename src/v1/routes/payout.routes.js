const express = require('express');
const router = express.Router();
const payoutController = require('../controllers/payout.controller');
const { checkUserAuth } = require('../../../middlewares/authMiddleware');
const { checkAdminUserAuth } = require('../../../middlewares/authMiddlewareAdminPanel');

// Admin routes
router.get('/', checkAdminUserAuth, payoutController.getAll);
router.post('/', checkAdminUserAuth, payoutController.create);
router.get('/:id', checkAdminUserAuth, payoutController.getById);
router.put('/:id/process', checkAdminUserAuth, payoutController.process);

// Partner routes
router.get('/partner/my-payouts', checkUserAuth, payoutController.getPartnerPayouts);

module.exports = router;