const paypal = require('paypal-rest-sdk');

// Validate PayPal credentials
const validatePayPalConfig = () => {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    const mode = process.env.NODE_ENV === 'production' ? 'live' : 'sandbox';
    
    if (!clientId || !clientSecret) {
        console.error('⚠️  PayPal Configuration Error:');
        console.error('   PAYPAL_CLIENT_ID:', clientId ? '✓ Set' : '✗ Missing');
        console.error('   PAYPAL_CLIENT_SECRET:', clientSecret ? '✓ Set' : '✗ Missing');
        console.error('   Mode:', mode);
        throw new Error('PayPal credentials are missing. Please set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in your .env file');
    }
    
    // Check if credentials look valid (basic format check)
    if (clientId.length < 10 || clientSecret.length < 10) {
        console.warn('⚠️  PayPal credentials appear to be invalid (too short)');
    }
    
    return { clientId, clientSecret, mode };
};

// Configure PayPal
let paypalConfigured = false;

try {
    const { clientId, clientSecret, mode } = validatePayPalConfig();
    
    paypal.configure({
        'mode': mode,
        'client_id': clientId,
        'client_secret': clientSecret
    });
    
    paypalConfigured = true;
    console.log(`✓ PayPal configured successfully (${mode} mode)`);
} catch (error) {
    console.error('❌ PayPal configuration failed:', error.message);
    // Still export paypal object, but it won't work until credentials are set
    // This prevents the app from crashing on startup
}

// Helper function to check if PayPal is configured
paypal.isConfigured = () => paypalConfigured;

// Helper function to get configuration status
paypal.getConfigStatus = () => {
    return {
        configured: paypalConfigured,
        mode: process.env.NODE_ENV === 'production' ? 'live' : 'sandbox',
        hasClientId: !!process.env.PAYPAL_CLIENT_ID,
        hasClientSecret: !!process.env.PAYPAL_CLIENT_SECRET
    };
};

module.exports = paypal;
