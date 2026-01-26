const express = require('express');
const router = express.Router();
const paypalPayoutController = require('../controllers/paypalPayout.controller');
const { checkAuthOrigins } = require('../../../middlewares/authMiddlewareGenericAll');

// Admin routes - managing PayPal payouts
router.post('/send-payout', checkAuthOrigins, paypalPayoutController.sendPartnerPayout);
router.post('/batch-payout', checkAuthOrigins, paypalPayoutController.batchPartnerPayouts);
router.get('/payout-status/:payout_batch_id', checkAuthOrigins, paypalPayoutController.getPayoutStatus);
router.post('/update-paypal-email', checkAuthOrigins, paypalPayoutController.updatePartnerPayPalEmail);

module.exports = router;
