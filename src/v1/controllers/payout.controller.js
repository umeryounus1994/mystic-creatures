const stripeConnectController = require('./stripeConnect.controller');
const paypalPayoutController = require('./paypalPayout.controller');
const UserModel = require('../models/user.model');
const Commission = require('../models/commission.model');
const { generateResponse } = require('../utils/response');

/**
 * Unified payout function - automatically selects method based on partner preference
 */
const sendPayout = async (req, res) => {
  try {
    const { commission_id } = req.body;
    
    if (!commission_id) {
      return generateResponse(res, 400, 'Commission ID is required');
    }
    
    const commission = await Commission.findById(commission_id)
      .populate('partner_id');
    
    if (!commission) {
      return generateResponse(res, 404, 'Commission not found');
    }
    
    if (commission.payout_status === 'paid') {
      return generateResponse(res, 400, 'Commission already paid');
    }
    
    const partner = commission.partner_id;
    const preferredMethod = partner.partner_profile?.preferred_payout_method || 'stripe';
    
    // Check which payout methods are available
    // For Stripe: Only need account_id (payouts_enabled check removed - Stripe API will validate)
    const hasStripe = !!partner.partner_profile?.stripe_connect?.account_id;
    const hasPayPal = partner.partner_profile?.paypal_payout?.paypal_email;
    const hasBankDetails = partner.partner_profile?.bank_details?.account_number && 
                          partner.partner_profile?.bank_details?.routing_number;
    
    // Determine payout method
    let payoutMethod;
    
    if (preferredMethod === 'bank_transfer' && hasBankDetails) {
      payoutMethod = 'bank_transfer';
    } else if (preferredMethod === 'stripe' && hasStripe) {
      payoutMethod = 'stripe';
    } else if (preferredMethod === 'paypal' && hasPayPal) {
      payoutMethod = 'paypal';
    } else if (hasStripe) {
      payoutMethod = 'stripe';
    } else if (hasPayPal) {
      payoutMethod = 'paypal';
    } else if (hasBankDetails) {
      payoutMethod = 'bank_transfer';
    } else {
      return generateResponse(res, 400, 'Partner has no payout method configured. Please set up Stripe Connect, PayPal email, or bank details.');
    }
    
    // Handle bank transfer - just mark as paid (manual bank transfer)
    if (payoutMethod === 'bank_transfer') {
      commission.payout_status = 'paid';
      commission.payout_method = 'bank_transfer';
      commission.payout_date = new Date();
      commission.payout_transaction_id = `bank_transfer_${Date.now()}`;
      await commission.save();
      
      return generateResponse(res, 200, 'Commission marked as paid (bank transfer)', {
        commission_id: commission._id,
        payout_method: 'bank_transfer',
        status: 'paid',
        note: 'Bank transfer will be processed manually'
      });
    }
    
    // Route to appropriate controller for automated payouts
    if (payoutMethod === 'stripe') {
      req.body.amount = commission.net_amount;
      return stripeConnectController.transferToPartner(req, res);
    } else {
      return paypalPayoutController.sendPartnerPayout(req, res);
    }
    
  } catch (error) {
    console.error('Unified payout error:', error);
    return generateResponse(res, 500, 'Error processing payout', null, error.message);
  }
};

/**
 * Batch payout - sends payouts to multiple partners using their preferred method
 */
const batchPayouts = async (req, res) => {
  try {
    const { commission_ids } = req.body;
    
    if (!commission_ids || !Array.isArray(commission_ids) || commission_ids.length === 0) {
      return generateResponse(res, 400, 'Commission IDs array is required');
    }
    
    // Get all commissions
    const commissions = await Commission.find({
      _id: { $in: commission_ids },
      payout_status: { $in: ['unpaid', 'pending'] }
    }).populate('partner_id');
    
    if (commissions.length === 0) {
      return generateResponse(res, 400, 'No pending commissions found');
    }
    
    // Separate by payout method
    const stripeCommissions = [];
    const paypalCommissions = [];
    const bankTransferCommissions = [];
    const noMethodCommissions = [];
    
    commissions.forEach(commission => {
      const partner = commission.partner_id;
      const preferredMethod = partner.partner_profile?.preferred_payout_method || 'stripe';
      
      const hasStripe = partner.partner_profile?.stripe_connect?.account_id && 
                        partner.partner_profile?.stripe_connect?.payouts_enabled;
      const hasPayPal = partner.partner_profile?.paypal_payout?.paypal_email;
      const hasBankDetails = partner.partner_profile?.bank_details?.account_number && 
                             partner.partner_profile?.bank_details?.routing_number;
      
      if (preferredMethod === 'bank_transfer' && hasBankDetails) {
        bankTransferCommissions.push(commission);
      } else if (preferredMethod === 'stripe' && hasStripe) {
        stripeCommissions.push(commission);
      } else if (preferredMethod === 'paypal' && hasPayPal) {
        paypalCommissions.push(commission);
      } else if (hasStripe) {
        stripeCommissions.push(commission);
      } else if (hasPayPal) {
        paypalCommissions.push(commission);
      } else if (hasBankDetails) {
        bankTransferCommissions.push(commission);
      } else {
        noMethodCommissions.push(commission);
      }
    });
    
    const results = {
      stripe: { success: 0, failed: 0 },
      paypal: { success: 0, failed: 0 },
      bank_transfer: { success: 0, failed: 0 },
      no_method: noMethodCommissions.length
    };
    
    // Process Bank Transfer payouts (mark as paid, manual processing)
    if (bankTransferCommissions.length > 0) {
      try {
        await Commission.updateMany(
          { _id: { $in: bankTransferCommissions.map(c => c._id) } },
          {
            payout_status: 'paid',
            payout_method: 'bank_transfer',
            payout_date: new Date(),
            payout_transaction_id: `bank_transfer_batch_${Date.now()}`
          }
        );
        results.bank_transfer.success = bankTransferCommissions.length;
      } catch (error) {
        console.error('Bank transfer marking failed:', error);
        await Commission.updateMany(
          { _id: { $in: bankTransferCommissions.map(c => c._id) } },
          {
            payout_status: 'failed',
            payout_error: error.message
          }
        );
        results.bank_transfer.failed = bankTransferCommissions.length;
      }
    }
    
    // Process Stripe payouts (one by one since Stripe doesn't have batch transfers)
    for (const commission of stripeCommissions) {
      try {
        req.body = { commission_id: commission._id, amount: commission.net_amount };
        // We'll call the transfer function directly
        const stripe = require('../../../config/stripe');
        const partner = commission.partner_id;
        const accountId = partner.partner_profile.stripe_connect.account_id;
        
        const transfer = await stripe.transfers.create({
          amount: Math.round(commission.net_amount * 100),
          currency: 'eur',
          destination: accountId,
          metadata: {
            commission_id: commission._id.toString(),
            booking_id: commission.booking_id.toString(),
            partner_id: partner._id.toString()
          }
        });
        
        commission.payout_status = 'paid';
        commission.payout_method = 'stripe';
        commission.payout_date = new Date();
        commission.payout_transaction_id = transfer.id;
        await commission.save();
        
        results.stripe.success++;
      } catch (error) {
        console.error(`Stripe payout failed for commission ${commission._id}:`, error);
        commission.payout_status = 'failed';
        commission.payout_error = error.message;
        await commission.save();
        results.stripe.failed++;
      }
    }
    
    // Process PayPal batch payout
    if (paypalCommissions.length > 0) {
      try {
        req.body = { commission_ids: paypalCommissions.map(c => c._id.toString()) };
        await paypalPayoutController.batchPartnerPayouts(req, res);
        results.paypal.success = paypalCommissions.length;
      } catch (error) {
        console.error('PayPal batch payout failed:', error);
        // Mark as failed
        await Commission.updateMany(
          { _id: { $in: paypalCommissions.map(c => c._id) } },
          {
            payout_status: 'failed',
            payout_error: error.message
          }
        );
        results.paypal.failed = paypalCommissions.length;
      }
    }
    
    return generateResponse(res, 200, 'Batch payouts processed', {
      total_commissions: commissions.length,
      stripe: results.stripe,
      paypal: results.paypal,
      bank_transfer: results.bank_transfer,
      no_method: results.no_method
    });
    
  } catch (error) {
    console.error('Batch payouts error:', error);
    return generateResponse(res, 500, 'Error processing batch payouts', null, error.message);
  }
};

/**
 * Get partner payout methods status
 */
const getPartnerPayoutMethods = async (req, res) => {
  try {
    const partnerId = req.user.id;
    
    const partner = await UserModel.findById(partnerId);
    
    if (!partner || partner.user_type !== 'partner') {
      return generateResponse(res, 403, 'Access denied. Partner account required.');
    }
    
    const stripeStatus = {
      connected: !!partner.partner_profile?.stripe_connect?.account_id,
      account_id: partner.partner_profile?.stripe_connect?.account_id || null,
      onboarding_completed: partner.partner_profile?.stripe_connect?.onboarding_completed || false,
      charges_enabled: partner.partner_profile?.stripe_connect?.charges_enabled || false,
      payouts_enabled: partner.partner_profile?.stripe_connect?.payouts_enabled || false,
      onboarding_url: partner.partner_profile?.stripe_connect?.onboarding_url || null
    };
    
    const paypalStatus = {
      configured: !!partner.partner_profile?.paypal_payout?.paypal_email,
      email: partner.partner_profile?.paypal_payout?.paypal_email || null,
      verified: partner.partner_profile?.paypal_payout?.verified || false
    };
    
    const bankTransferStatus = {
      configured: !!(partner.partner_profile?.bank_details?.account_number && 
                     partner.partner_profile?.bank_details?.routing_number),
      account_number: partner.partner_profile?.bank_details?.account_number ? 
                      `${partner.partner_profile.bank_details.account_number.slice(-4).padStart(partner.partner_profile.bank_details.account_number.length, '*')}` : null,
      routing_number: partner.partner_profile?.bank_details?.routing_number ? 
                     `${partner.partner_profile.bank_details.routing_number.slice(-4).padStart(partner.partner_profile.bank_details.routing_number.length, '*')}` : null,
      account_holder: partner.partner_profile?.bank_details?.account_holder || null
    };
    
    const preferredMethod = partner.partner_profile?.preferred_payout_method || 'stripe';
    
    // Determine available methods
    const availableMethods = [];
    if (stripeStatus.payouts_enabled) availableMethods.push('stripe');
    if (paypalStatus.configured) availableMethods.push('paypal');
    if (bankTransferStatus.configured) availableMethods.push('bank_transfer');
    
    return generateResponse(res, 200, 'Payout methods retrieved', {
      preferred_method: preferredMethod,
      available_methods: availableMethods,
      stripe: stripeStatus,
      paypal: paypalStatus,
      bank_transfer: bankTransferStatus
    });
    
  } catch (error) {
    console.error('Get payout methods error:', error);
    return generateResponse(res, 500, 'Error retrieving payout methods', null, error.message);
  }
};

/**
 * Update partner preferred payout method
 */
const updatePreferredPayoutMethod = async (req, res) => {
  try {
    const { preferred_method } = req.body;
    const partnerId = req.user.id;
    
    if (!preferred_method || !['stripe', 'paypal', 'bank_transfer'].includes(preferred_method)) {
      return generateResponse(res, 400, 'Valid preferred method is required (stripe, paypal, or bank_transfer)');
    }
    
    const partner = await UserModel.findById(partnerId);
    
    if (!partner || partner.user_type !== 'partner') {
      return generateResponse(res, 403, 'Access denied. Partner account required.');
    }
    
    // Validate that the method is available
    if (preferred_method === 'stripe') {
      const hasStripe = !!partner.partner_profile?.stripe_connect?.account_id;
      if (!hasStripe) {
        return generateResponse(res, 400, 'Stripe Connect account ID not configured. Please add your Stripe account ID first.');
      }
    } else if (preferred_method === 'paypal') {
      const hasPayPal = partner.partner_profile?.paypal_payout?.paypal_email;
      if (!hasPayPal) {
        return generateResponse(res, 400, 'PayPal email not configured. Please add your PayPal email first.');
      }
    }
    
    if (!partner.partner_profile) {
      partner.partner_profile = {};
    }
    
    partner.partner_profile.preferred_payout_method = preferred_method;
    await partner.save();
    
    return generateResponse(res, 200, 'Preferred payout method updated', {
      preferred_method: preferred_method
    });
    
  } catch (error) {
    console.error('Update preferred payout method error:', error);
    return generateResponse(res, 500, 'Error updating preferred payout method', null, error.message);
  }
};

/**
 * Get payout history for partner
 */
const getPayoutHistory = async (req, res) => {
  try {
    const partnerId = req.user.id;
    const { page = 1, limit = 20, status } = req.query;
    
    const partner = await UserModel.findById(partnerId);
    
    if (!partner || partner.user_type !== 'partner') {
      return generateResponse(res, 403, 'Access denied. Partner account required.');
    }
    
    const query = {
      partner_id: partnerId,
      payout_status: { $ne: 'unpaid' } // Only show processed payouts
    };
    
    if (status) {
      query.payout_status = status;
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const commissions = await Commission.find(query)
      .populate('booking_id', 'booking_date total_amount')
      .sort({ payout_date: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Commission.countDocuments(query);
    
    return generateResponse(res, 200, 'Payout history retrieved', {
      payouts: commissions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('Get payout history error:', error);
    return generateResponse(res, 500, 'Error retrieving payout history', null, error.message);
  }
};

/**
 * Manually trigger automatic payouts (for testing or manual execution)
 * Admin only endpoint
 */
const triggerAutomaticPayouts = async (req, res) => {
  try {
    const processAutomaticPayouts = require('../jobs/automaticPayouts.job');
    
    console.log('🔧 Manual trigger of automatic payouts requested');
    const result = await processAutomaticPayouts();
    
    return generateResponse(res, 200, 'Automatic payouts processed', result);
    
  } catch (error) {
    console.error('Error triggering automatic payouts:', error);
    return generateResponse(res, 500, 'Error processing automatic payouts', null, error.message);
  }
};

/**
 * Update partner bank transfer details
 */
const updateBankDetails = async (req, res) => {
  try {
    const { partner_id, account_number, routing_number, account_holder } = req.body;
    
    if (!partner_id) {
      return generateResponse(res, 400, 'Partner ID is required');
    }
    
    if (!account_number || !routing_number || !account_holder) {
      return generateResponse(res, 400, 'Account number, routing number, and account holder name are required');
    }
    
    // Validate account number (should be numeric, typically 8-17 digits)
    if (!/^\d{8,40}$/.test(account_number.replace(/\s+/g, ''))) {
      return generateResponse(res, 400, 'Invalid account number format. Must be 8-40 digits');
    }
    
    // Validate routing number (should be 9 digits for US banks)
    if (!/^\d{9-15}$/.test(routing_number.replace(/\s+/g, ''))) {
      return generateResponse(res, 400, 'Invalid routing number format. Must be 9-15 digits');
    }
    
    // Validate account holder name (should not be empty and have reasonable length)
    if (account_holder.trim().length < 2 || account_holder.trim().length > 100) {
      return generateResponse(res, 400, 'Account holder name must be between 2 and 100 characters');
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
    
    // Initialize bank_details if it doesn't exist
    if (!partner.partner_profile.bank_details) {
      partner.partner_profile.bank_details = {};
    }
    
    // Update bank details (remove spaces from account and routing numbers)
    partner.partner_profile.bank_details.account_number = account_number.replace(/\s+/g, '');
    partner.partner_profile.bank_details.routing_number = routing_number.replace(/\s+/g, '');
    partner.partner_profile.bank_details.account_holder = account_holder.trim();
    
    await partner.save();
    
    // Return masked account details for security
    const maskedAccountNumber = account_number.replace(/\s+/g, '').slice(-4).padStart(account_number.replace(/\s+/g, '').length, '*');
    const maskedRoutingNumber = routing_number.replace(/\s+/g, '').slice(-4).padStart(routing_number.replace(/\s+/g, '').length, '*');
    
    return generateResponse(res, 200, 'Bank details updated successfully', {
      partner_id: partner._id,
      account_holder: account_holder.trim(),
      account_number: maskedAccountNumber, // Return masked version
      routing_number: maskedRoutingNumber, // Return masked version
      message: 'Bank details have been updated. Last 4 digits: ' + account_number.replace(/\s+/g, '').slice(-4)
    });
    
  } catch (error) {
    console.error('Update bank details error:', error);
    return generateResponse(res, 500, 'Error updating bank details', null, error.message);
  }
};

/**
 * Get automatic payout configuration (Admin)
 */
const getAutomaticPayoutConfig = async (req, res) => {
  try {
    const payoutConfig = require('../../../config/automaticPayouts.config');
    const config = payoutConfig.getConfig();
    
    return generateResponse(res, 200, 'Automatic payout configuration retrieved', config);
  } catch (error) {
    console.error('Get automatic payout config error:', error);
    return generateResponse(res, 500, 'Error retrieving configuration', null, error.message);
  }
};

/**
 * Update automatic payout configuration (Admin)
 */
const updateAutomaticPayoutConfig = async (req, res) => {
  try {
    const { enabled, minAmount, minDays, batchSize, schedule } = req.body;
    
    const payoutConfig = require('../../../config/automaticPayouts.config');
    
    const updates = {};
    if (enabled !== undefined) updates.enabled = enabled;
    if (minAmount !== undefined) updates.minAmount = parseFloat(minAmount);
    if (minDays !== undefined) updates.minDays = parseInt(minDays, 10);
    if (batchSize !== undefined) updates.batchSize = parseInt(batchSize, 10);
    if (schedule !== undefined) updates.schedule = schedule;
    
    // Validate schedule format (basic cron validation)
    if (updates.schedule && !/^(\*|([0-9]|[1-5][0-9])|\*\/([0-9]|[1-5][0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|[12][0-9]|3[01])|\*\/([1-9]|[12][0-9]|3[01])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/.test(updates.schedule)) {
      return generateResponse(res, 400, 'Invalid cron schedule format');
    }
    
    const success = payoutConfig.updateConfig(updates);
    
    if (success) {
      const updatedConfig = payoutConfig.getConfig();
      return generateResponse(res, 200, 'Configuration updated successfully', updatedConfig);
    } else {
      return generateResponse(res, 500, 'Error saving configuration');
    }
  } catch (error) {
    console.error('Update automatic payout config error:', error);
    return generateResponse(res, 500, 'Error updating configuration', null, error.message);
  }
};

module.exports = {
  sendPayout,
  batchPayouts,
  getPartnerPayoutMethods,
  updatePreferredPayoutMethod,
  getPayoutHistory,
  triggerAutomaticPayouts,
  updateBankDetails,
  getAutomaticPayoutConfig,
  updateAutomaticPayoutConfig
};
