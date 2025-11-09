const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhook.controller');

// Stripe webhook (raw body needed)
router.post('/stripe', webhookController.handleStripeWebhook);

module.exports = router;