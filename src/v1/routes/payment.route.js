const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { checkAuthOrigins } = require('../../../middlewares/authMiddlewareGenericAll');

// Stripe routes
router.post('/create-payment-intent', checkAuthOrigins, paymentController.createPaymentIntent);
router.post('/confirm-payment', checkAuthOrigins, paymentController.confirmPayment);

// PayPal routes
router.post('/create-paypal-order', checkAuthOrigins, paymentController.createPayPalOrder);
router.post('/execute-paypal-payment', checkAuthOrigins, paymentController.executePayPalPayment);
router.get('/paypal-payment/:payment_id', checkAuthOrigins, paymentController.getPayPalPaymentDetails);

module.exports = router;
