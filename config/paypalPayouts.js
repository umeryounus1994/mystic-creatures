const payoutsSdk = require('@paypal/payouts-sdk');

function client() {
  return new payoutsSdk.core.PayPalHttpClient(environment());
}

function environment() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  
  if (process.env.NODE_ENV === 'production') {
    return new payoutsSdk.core.LiveEnvironment(clientId, clientSecret);
  }
  return new payoutsSdk.core.SandboxEnvironment(clientId, clientSecret);
}

module.exports = { client, environment };
