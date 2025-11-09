const paypal = require('paypal-rest-sdk');

// Configure PayPal
paypal.configure({
    'mode': process.env.NODE_ENV === 'production' ? 'live' : 'sandbox',
    'client_id': process.env.PAYPAL_CLIENT_ID,
    'client_secret': process.env.PAYPAL_CLIENT_SECRET
});

module.exports = paypal;
