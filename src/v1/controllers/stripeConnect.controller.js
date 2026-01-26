const stripe = require('../../../config/stripe');
const UserModel = require('../models/user.model');
const { generateResponse } = require('../utils/response');

/**
 * Create Stripe Connect account for partner
 * This creates an Express account that partners can onboard to
 */
const createConnectAccount = async (req, res) => {
  try {
    const { partner_id } = req.body;
    
    if (!partner_id) {
      return generateResponse(res, 400, 'Partner ID is required');
    }
    
    const partner = await UserModel.findById(partner_id);
    
    if (!partner) {
      return generateResponse(res, 404, 'Partner not found');
    }
    
    if (partner.user_type !== 'partner') {
      return generateResponse(res, 400, 'User is not a partner');
    }
    
    // Check if account already exists
    if (partner.partner_profile?.stripe_connect?.account_id) {
      return generateResponse(res, 400, 'Stripe Connect account already exists for this partner');
    }
    
    // Create Stripe Express account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US', // You can make this dynamic based on partner location
      email: partner.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual', // or 'company' based on partner type
    });
    
    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.FRONTEND_URL}/partner/stripe/reauth`,
      return_url: `${process.env.FRONTEND_URL}/partner/stripe/success`,
      type: 'account_onboarding',
    });
    
    // Update partner profile
    partner.partner_profile = partner.partner_profile || {};
    partner.partner_profile.stripe_connect = {
      account_id: account.id,
      onboarding_completed: false,
      charges_enabled: false,
      payouts_enabled: false,
      onboarding_url: accountLink.url,
      account_type: 'express'
    };
    
    await partner.save();
    
    return generateResponse(res, 200, 'Stripe Connect account created successfully', {
      account_id: account.id,
      onboarding_url: accountLink.url,
      partner_id: partner._id
    });
    
  } catch (error) {
    console.error('Stripe Connect account creation error:', error);
    return generateResponse(res, 500, 'Error creating Stripe Connect account', null, error.message);
  }
};

/**
 * Get Stripe Connect account status
 */
const getConnectAccountStatus = async (req, res) => {
  try {
    const { partner_id } = req.params;
    
    const partner = await UserModel.findById(partner_id);
    
    if (!partner) {
      return generateResponse(res, 404, 'Partner not found');
    }
    
    if (!partner.partner_profile?.stripe_connect?.account_id) {
      return generateResponse(res, 404, 'Stripe Connect account not found');
    }
    
    const accountId = partner.partner_profile.stripe_connect.account_id;
    
    // Get account details from Stripe
    const account = await stripe.accounts.retrieve(accountId);
    
    // Update local status
    partner.partner_profile.stripe_connect.charges_enabled = account.charges_enabled;
    partner.partner_profile.stripe_connect.payouts_enabled = account.payouts_enabled;
    partner.partner_profile.stripe_connect.onboarding_completed = 
      account.charges_enabled && account.payouts_enabled;
    
    await partner.save();
    
    return generateResponse(res, 200, 'Account status retrieved', {
      account_id: accountId,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      onboarding_completed: partner.partner_profile.stripe_connect.onboarding_completed,
      details_submitted: account.details_submitted,
      email: account.email
    });
    
  } catch (error) {
    console.error('Get Stripe Connect account status error:', error);
    return generateResponse(res, 500, 'Error retrieving account status', null, error.message);
  }
};

/**
 * Create new onboarding link (if partner needs to complete onboarding again)
 */
const createOnboardingLink = async (req, res) => {
  try {
    const { partner_id } = req.body;
    
    const partner = await UserModel.findById(partner_id);
    
    if (!partner) {
      return generateResponse(res, 404, 'Partner not found');
    }
    
    if (!partner.partner_profile?.stripe_connect?.account_id) {
      return generateResponse(res, 404, 'Stripe Connect account not found. Please create account first.');
    }
    
    const accountId = partner.partner_profile.stripe_connect.account_id;
    
    // Create account link
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.FRONTEND_URL}/partner/stripe/reauth`,
      return_url: `${process.env.FRONTEND_URL}/partner/stripe/success`,
      type: 'account_onboarding',
    });
    
    // Update onboarding URL
    partner.partner_profile.stripe_connect.onboarding_url = accountLink.url;
    await partner.save();
    
    return generateResponse(res, 200, 'Onboarding link created', {
      onboarding_url: accountLink.url,
      account_id: accountId
    });
    
  } catch (error) {
    console.error('Create onboarding link error:', error);
    return generateResponse(res, 500, 'Error creating onboarding link', null, error.message);
  }
};

/**
 * Transfer funds to partner's Stripe account
 */
const transferToPartner = async (req, res) => {
  try {
    const { commission_id, amount } = req.body;
    
    if (!commission_id || !amount) {
      return generateResponse(res, 400, 'Commission ID and amount are required');
    }
    
    const Commission = require('../models/commission.model');
    const commission = await Commission.findById(commission_id)
      .populate('partner_id');
    
    if (!commission) {
      return generateResponse(res, 404, 'Commission not found');
    }
    
    if (commission.payout_status === 'paid') {
      return generateResponse(res, 400, 'Commission already paid');
    }
    
    const partner = commission.partner_id;
    
    if (!partner.partner_profile?.stripe_connect?.account_id) {
      return generateResponse(res, 400, 'Partner Stripe Connect account not set up');
    }
    
    // Note: We don't check payouts_enabled here because:
    // 1. Partner might have added account ID manually
    // 2. Status might not be updated yet
    // 3. Stripe API will return error if account is not ready
    // This allows the system to attempt transfer and Stripe will handle validation
    
    const accountId = partner.partner_profile.stripe_connect.account_id;
    
    // Create transfer to connected account
    const transfer = await stripe.transfers.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'eur', // EUR currency
      destination: accountId,
      metadata: {
        commission_id: commission_id.toString(),
        booking_id: commission.booking_id.toString(),
        partner_id: partner._id.toString()
      }
    });
    
    // Update commission
    commission.payout_status = 'paid';
    commission.payout_method = 'stripe';
    commission.payout_date = new Date();
    commission.payout_transaction_id = transfer.id;
    await commission.save();
    
    return generateResponse(res, 200, 'Transfer completed successfully', {
      transfer_id: transfer.id,
      amount: amount,
      commission_id: commission._id,
      status: transfer.status
    });
    
  } catch (error) {
    console.error('Transfer to partner error:', error);
    
    // Update commission with error status
    try {
      if (commission_id) {
        await Commission.findByIdAndUpdate(commission_id, {
          payout_status: 'failed',
          payout_error: error.message || 'Stripe transfer failed',
          payout_method: 'stripe'
        });
      }
    } catch (updateError) {
      console.error('Error updating commission status:', updateError);
    }
    
    return generateResponse(res, 500, 'Error transferring funds', null, error.message);
  }
};

/**
 * Get transfer details
 */
const getTransferDetails = async (req, res) => {
  try {
    const { transfer_id } = req.params;
    
    const transfer = await stripe.transfers.retrieve(transfer_id);
    
    return generateResponse(res, 200, 'Transfer details retrieved', transfer);
    
  } catch (error) {
    console.error('Get transfer details error:', error);
    return generateResponse(res, 500, 'Error retrieving transfer details', null, error.message);
  }
};

/**
 * Update Stripe Connect account ID for partner
 * Allows partners to add their existing Stripe account ID
 */
const updateAccountId = async (req, res) => {
  try {
    const { partner_id, stripe_account_id } = req.body;
    
    if (!partner_id) {
      return generateResponse(res, 400, 'Partner ID is required');
    }
    
    if (!stripe_account_id) {
      return generateResponse(res, 400, 'Stripe Account ID is required');
    }
    
    // Validate Stripe account ID format (must start with "acct_")
    if (!stripe_account_id.startsWith('acct_')) {
      return generateResponse(res, 400, 'Invalid Stripe Account ID format. Must start with "acct_"');
    }
    
    const partner = await UserModel.findById(partner_id);
    
    if (!partner) {
      return generateResponse(res, 404, 'Partner not found');
    }
    
    if (partner.user_type !== 'partner') {
      return generateResponse(res, 400, 'User is not a partner');
    }
    
    // Initialize partner_profile if it doesn't exist
    if (!partner.partner_profile) {
      partner.partner_profile = {};
    }
    
    // Initialize stripe_connect if it doesn't exist
    if (!partner.partner_profile.stripe_connect) {
      partner.partner_profile.stripe_connect = {
        account_id: null,
        onboarding_completed: false,
        charges_enabled: false,
        payouts_enabled: false,
        account_type: 'express'
      };
    }
    
    // Update account ID
    const previousAccountId = partner.partner_profile.stripe_connect.account_id;
    partner.partner_profile.stripe_connect.account_id = stripe_account_id.trim();
    
    // Verify account with Stripe API (async, don't block)
    try {
      const account = await stripe.accounts.retrieve(stripe_account_id);
      
      // Update status based on Stripe account
      partner.partner_profile.stripe_connect.onboarding_completed = account.details_submitted || false;
      partner.partner_profile.stripe_connect.charges_enabled = account.charges_enabled || false;
      partner.partner_profile.stripe_connect.payouts_enabled = account.payouts_enabled || false;
      
      await partner.save();
      
      return generateResponse(res, 200, 'Stripe Account ID updated successfully', {
        account_id: stripe_account_id,
        partner_id: partner._id,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        onboarding_completed: account.details_submitted || false,
        previous_account_id: previousAccountId || null
      });
      
    } catch (stripeError) {
      // If Stripe verification fails, still save the account ID but mark status as unknown
      console.error('Stripe account verification error:', stripeError);
      
      partner.partner_profile.stripe_connect.onboarding_completed = false;
      partner.partner_profile.stripe_connect.charges_enabled = false;
      partner.partner_profile.stripe_connect.payouts_enabled = false;
      
      await partner.save();
      
      // Provide more specific error message based on Stripe error type
      let warningMessage = 'Account verification failed. ';
      if (stripeError.type === 'StripeInvalidRequestError') {
        if (stripeError.code === 'resource_missing') {
          warningMessage += 'The account ID does not exist in Stripe. Please verify the account ID is correct.';
        } else {
          warningMessage += `Stripe error: ${stripeError.message || 'Invalid account ID'}`;
        }
      } else if (stripeError.message) {
        warningMessage += stripeError.message;
      } else {
        warningMessage += 'Please ensure the account ID is correct and matches your Stripe account (test vs live mode).';
      }
      
      return generateResponse(res, 200, 'Stripe Account ID updated, but verification failed. Please verify the account ID is correct.', {
        account_id: stripe_account_id,
        partner_id: partner._id,
        charges_enabled: false,
        payouts_enabled: false,
        onboarding_completed: false,
        warning: warningMessage,
        error_code: stripeError.code || null,
        error_type: stripeError.type || null,
        previous_account_id: previousAccountId || null
      });
    }
    
  } catch (error) {
    console.error('Update Stripe Account ID error:', error);
    return generateResponse(res, 500, 'Error updating Stripe Account ID', null, error.message);
  }
};

module.exports = {
  createConnectAccount,
  getConnectAccountStatus,
  createOnboardingLink,
  transferToPartner,
  getTransferDetails,
  updateAccountId
};
