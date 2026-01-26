const express = require('express');
const router = express.Router();
const stripeConnectController = require('../controllers/stripeConnect.controller');
const { checkAuthOrigins } = require('../../../middlewares/authMiddlewareGenericAll');

// Admin routes - managing partner Stripe Connect accounts
router.post('/create-account', checkAuthOrigins, stripeConnectController.createConnectAccount);
router.get('/account-status/:partner_id', checkAuthOrigins, stripeConnectController.getConnectAccountStatus);
router.post('/create-onboarding-link', checkAuthOrigins, stripeConnectController.createOnboardingLink);
router.post('/update-account-id', checkAuthOrigins, stripeConnectController.updateAccountId);
router.post('/transfer', checkAuthOrigins, stripeConnectController.transferToPartner);
router.get('/transfer/:transfer_id', checkAuthOrigins, stripeConnectController.getTransferDetails);

module.exports = router;
