const express = require('express');
const router = express.Router();
const payoutController = require('../controllers/payout.controller');
const { checkAuthOrigins } = require('../../../middlewares/authMiddlewareGenericAll');

// Unified payout routes (auto-selects method based on partner preference)
router.post('/send', checkAuthOrigins, payoutController.sendPayout);
router.post('/batch', checkAuthOrigins, payoutController.batchPayouts);

// Automatic payouts (admin only - for manual triggering)
router.post('/trigger-automatic', checkAuthOrigins, payoutController.triggerAutomaticPayouts);

// Partner routes - managing their payout preferences
router.get('/methods', checkAuthOrigins, payoutController.getPartnerPayoutMethods);
router.post('/preferred-method', checkAuthOrigins, payoutController.updatePreferredPayoutMethod);
router.post('/bank-details', checkAuthOrigins, payoutController.updateBankDetails);
router.get('/history', checkAuthOrigins, payoutController.getPayoutHistory);

// Admin routes - automatic payout configuration
router.get('/config', checkAuthOrigins, payoutController.getAutomaticPayoutConfig);
router.post('/config', checkAuthOrigins, payoutController.updateAutomaticPayoutConfig);

module.exports = router;
