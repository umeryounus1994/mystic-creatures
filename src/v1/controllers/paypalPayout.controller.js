const { client } = require('../../../config/paypalPayouts');
const payoutsSdk = require('@paypal/payouts-sdk');
const UserModel = require('../models/user.model');
const { generateResponse } = require('../utils/response');

/**
 * Send payout to partner via PayPal
 */
const sendPartnerPayout = async (req, res) => {
  let commission_id = null;
  
  try {
    commission_id = req.body.commission_id;
    
    if (!commission_id) {
      return generateResponse(res, 400, 'Commission ID is required');
    }
    
    const Commission = require('../models/commission.model');
    const commission = await Commission.findById(commission_id)
      .populate('partner_id');
    
    if (!commission) {
      return generateResponse(res, 404, 'Commission not found');
    }
    
    if (commission.payout_status === 'paid') {
      return generateResponse(res, 400, 'Payout already processed');
    }
    
    const partner = commission.partner_id;
    
    // Check if partner has PayPal email configured
    if (!partner.partner_profile?.paypal_payout?.paypal_email) {
      return generateResponse(res, 400, 'Partner PayPal email not configured');
    }
    
    const paypalEmail = partner.partner_profile.paypal_payout.paypal_email;
    const amount = commission.net_amount;
    
    // Create payout request
    const request = new payoutsSdk.payouts.PayoutsPostRequest();
    
    request.requestBody({
      sender_batch_header: {
        recipient_type: "EMAIL",
        email_message: "You have received a commission payout from your bookings",
        note: `Commission for booking ${commission.booking_id}`,
        sender_batch_id: `batch_${Date.now()}_${commission_id}`
      },
      items: [{
        recipient_type: "EMAIL",
        amount: {
          value: amount.toFixed(2),
          currency: "EUR"
        },
        receiver: paypalEmail,
        note: `Commission payment for booking ${commission.booking_id}`,
        sender_item_id: commission._id.toString()
      }]
    });
    
    // Execute payout
    const payout = await client().execute(request);
    
    // Update commission record
    commission.payout_status = 'paid';
    commission.payout_method = 'paypal';
    commission.payout_date = new Date();
    commission.payout_transaction_id = payout.result.batch_header.payout_batch_id;
    commission.payout_batch_id = payout.result.batch_header.payout_batch_id;
    await commission.save();
    
    return generateResponse(res, 200, 'Payout sent successfully', {
      payout_batch_id: payout.result.batch_header.payout_batch_id,
      commission_id: commission._id,
      amount: amount,
      status: payout.result.batch_header.batch_status
    });
    
  } catch (error) {
    console.error('PayPal payout error:', error);
    
    // Update commission with error if commission_id exists
    if (commission_id) {
      try {
        const Commission = require('../models/commission.model');
        await Commission.findByIdAndUpdate(commission_id, {
          payout_status: 'failed',
          payout_error: error.message
        });
      } catch (updateError) {
        console.error('Error updating commission:', updateError);
      }
    }
    
    return generateResponse(res, 500, 'Error sending payout', null, error.message);
  }
};

/**
 * Get payout status
 */
const getPayoutStatus = async (req, res) => {
  try {
    const { payout_batch_id } = req.params;
    
    if (!payout_batch_id) {
      return generateResponse(res, 400, 'Payout batch ID is required');
    }
    
    const request = new payoutsSdk.payouts.PayoutsGetRequest(payout_batch_id);
    const payout = await client().execute(request);
    
    return generateResponse(res, 200, 'Payout status retrieved', payout.result);
    
  } catch (error) {
    console.error('Get payout status error:', error);
    return generateResponse(res, 500, 'Error retrieving payout status', null, error.message);
  }
};

/**
 * Batch payout - send multiple payouts at once
 */
const batchPartnerPayouts = async (req, res) => {
  try {
    const { commission_ids } = req.body;
    
    if (!commission_ids || !Array.isArray(commission_ids) || commission_ids.length === 0) {
      return generateResponse(res, 400, 'Commission IDs array is required');
    }
    
    const Commission = require('../models/commission.model');
    
    // Get all commissions
    const commissions = await Commission.find({
      _id: { $in: commission_ids },
      payout_status: { $in: ['unpaid', 'pending'] }
    }).populate('partner_id');
    
    if (commissions.length === 0) {
      return generateResponse(res, 400, 'No pending commissions found');
    }
    
    // Group by partner and create payout items
    const payoutItems = [];
    const partnerCommissions = {};
    const commissionMap = {}; // Track which commissions belong to which payout item
    
    commissions.forEach(commission => {
      const partnerId = commission.partner_id._id.toString();
      
      if (!partnerCommissions[partnerId]) {
        partnerCommissions[partnerId] = {
          partner: commission.partner_id,
          commissions: [],
          totalAmount: 0
        };
      }
      
      partnerCommissions[partnerId].commissions.push(commission);
      partnerCommissions[partnerId].totalAmount += commission.net_amount;
    });
    
    // Create payout items for each partner
    Object.values(partnerCommissions).forEach(({ partner, commissions, totalAmount }) => {
      const paypalEmail = partner.partner_profile?.paypal_payout?.paypal_email;
      
      if (paypalEmail) {
        const itemId = partner._id.toString();
        payoutItems.push({
          recipient_type: "EMAIL",
          amount: {
            value: totalAmount.toFixed(2),
            currency: "EUR"
          },
          receiver: paypalEmail,
          note: `Commission for ${commissions.length} booking(s)`,
          sender_item_id: itemId
        });
        
        // Map commissions to this payout item
        commissionMap[itemId] = commissions.map(c => c._id.toString());
      }
    });
    
    if (payoutItems.length === 0) {
      return generateResponse(res, 400, 'No valid partner PayPal emails found');
    }
    
    // Create batch payout
    const request = new payoutsSdk.payouts.PayoutsPostRequest();
    request.requestBody({
      sender_batch_header: {
        recipient_type: "EMAIL",
        email_message: "You have received commission payouts from your bookings",
        note: `Batch payout for ${payoutItems.length} partner(s)`,
        sender_batch_id: `batch_${Date.now()}`
      },
      items: payoutItems
    });
    
    const payout = await client().execute(request);
    const batchId = payout.result.batch_header.payout_batch_id;
    
    // Update all commission records
    await Commission.updateMany(
      { _id: { $in: commission_ids } },
      {
        payout_status: 'paid',
        payout_date: new Date(),
        payout_transaction_id: batchId,
        payout_batch_id: batchId,
        payout_method: 'paypal'
      }
    );
    
    return generateResponse(res, 200, 'Batch payout sent successfully', {
      payout_batch_id: batchId,
      total_partners: payoutItems.length,
      total_commissions: commissions.length,
      status: payout.result.batch_header.batch_status
    });
    
  } catch (error) {
    console.error('Batch payout error:', error);
    return generateResponse(res, 500, 'Error sending batch payout', null, error.message);
  }
};

/**
 * Update partner PayPal email
 */
const updatePartnerPayPalEmail = async (req, res) => {
  try {
    const { partner_id, paypal_email } = req.body;
    
    if (!partner_id || !paypal_email) {
      return generateResponse(res, 400, 'Partner ID and PayPal email are required');
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
    
    if (!partner.partner_profile.paypal_payout) {
      partner.partner_profile.paypal_payout = {};
    }
    
    partner.partner_profile.paypal_payout.paypal_email = paypal_email.toLowerCase().trim();
    partner.partner_profile.paypal_payout.verified = false; // Reset verification when email changes
    partner.partner_profile.paypal_payout.payout_method = 'paypal';
    
    await partner.save();
    
    return generateResponse(res, 200, 'PayPal email updated successfully', {
      partner_id: partner._id,
      paypal_email: partner.partner_profile.paypal_payout.paypal_email
    });
    
  } catch (error) {
    console.error('Update PayPal email error:', error);
    return generateResponse(res, 500, 'Error updating PayPal email', null, error.message);
  }
};

module.exports = {
  sendPartnerPayout,
  getPayoutStatus,
  batchPartnerPayouts,
  updatePartnerPayPalEmail
};
