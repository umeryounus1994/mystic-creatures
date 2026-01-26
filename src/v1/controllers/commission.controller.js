const Commission = require('../models/commission.model');
const { generateResponse } = require('../utils/response');

const commissionController = {
    // Get all commissions (Admin only)
    getAll: async (req, res) => {
        try {
            const { page = 1, limit = 10, status, partner_id } = req.query;
            
            const filter = {};
            if (status) filter.status = status;
            if (partner_id) filter.partner_id = partner_id;
            
            const commissions = await Commission.find(filter)
                .populate({
                    path: 'partner_id',
                    select: 'first_name last_name email username partner_profile'
                })
                .populate('booking_id')
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .sort({ created_at: -1 });
                
            const total = await Commission.countDocuments(filter);
            
            // Transform commissions to include payment method and payout info
            const transformedCommissions = commissions.map(commission => {
                const commissionObj = commission.toObject();
                // Add payment_method from booking (how customer paid)
                if (commission.booking_id && commission.booking_id.payment_method) {
                    commissionObj.payment_method = commission.booking_id.payment_method;
                }
                // Add payout_method (how partner will be paid - set when payout happens, otherwise show expected method)
                if (commission.payout_method) {
                    commissionObj.payout_method = commission.payout_method;
                } else if (commission.partner_id && commission.partner_id.partner_profile) {
                    // If not paid yet, show the expected payout method based on partner's preferences
                    const partner = commission.partner_id;
                    const preferredMethod = partner.partner_profile.preferred_payout_method || 'stripe';
                    const hasStripe = !!partner.partner_profile.stripe_connect?.account_id;
                    const hasPayPal = !!partner.partner_profile.paypal_payout?.paypal_email;
                    const hasBankDetails = !!partner.partner_profile.bank_details?.account_number && 
                                         !!partner.partner_profile.bank_details?.routing_number;
                    
                    // Determine expected payout method (same logic as payout controller)
                    let expectedMethod = null;
                    if (preferredMethod === 'bank_transfer' && hasBankDetails) {
                        expectedMethod = 'bank_transfer';
                    } else if (preferredMethod === 'stripe' && hasStripe) {
                        expectedMethod = 'stripe';
                    } else if (preferredMethod === 'paypal' && hasPayPal) {
                        expectedMethod = 'paypal';
                    } else if (hasStripe) {
                        expectedMethod = 'stripe';
                    } else if (hasPayPal) {
                        expectedMethod = 'paypal';
                    } else if (hasBankDetails) {
                        expectedMethod = 'bank_transfer';
                    }
                    
                    commissionObj.payout_method = expectedMethod;
                } else {
                    commissionObj.payout_method = null;
                }
                // Add partner's preferred payout method for context
                if (commission.partner_id && commission.partner_id.partner_profile) {
                    commissionObj.partner_preferred_payout_method = commission.partner_id.partner_profile.preferred_payout_method || null;
                }
                return commissionObj;
            });
            
            return generateResponse(res, 200, 'Commissions retrieved successfully', {
                commissions: transformedCommissions,
                pagination: {
                    current_page: parseInt(page),
                    total_pages: Math.ceil(total / limit),
                    total_items: total
                }
            });
        } catch (error) {
            return generateResponse(res, 500, 'Error retrieving commissions', null, error.message);
        }
    },

    // Get commission by ID (Admin only)
    getById: async (req, res) => {
        try {
            const commission = await Commission.findById(req.params.id)
                .populate({
                    path: 'partner_id',
                    select: 'first_name last_name email username partner_profile'
                })
                .populate('booking_id');
                
            if (!commission) {
                return generateResponse(res, 404, 'Commission not found');
            }
            
            // Transform commission to include payment method and payout info
            const commissionObj = commission.toObject();
            // Add payment_method from booking (how customer paid)
            if (commission.booking_id && commission.booking_id.payment_method) {
                commissionObj.payment_method = commission.booking_id.payment_method;
            }
            // Add payout_method (how partner will be paid - set when payout happens, otherwise show expected method)
            if (commission.payout_method) {
                commissionObj.payout_method = commission.payout_method;
            } else if (commission.partner_id && commission.partner_id.partner_profile) {
                // If not paid yet, show the expected payout method based on partner's preferences
                const partner = commission.partner_id;
                const preferredMethod = partner.partner_profile.preferred_payout_method || 'stripe';
                const hasStripe = !!partner.partner_profile.stripe_connect?.account_id;
                const hasPayPal = !!partner.partner_profile.paypal_payout?.paypal_email;
                const hasBankDetails = !!partner.partner_profile.bank_details?.account_number && 
                                     !!partner.partner_profile.bank_details?.routing_number;
                
                // Determine expected payout method (same logic as payout controller)
                let expectedMethod = null;
                if (preferredMethod === 'bank_transfer' && hasBankDetails) {
                    expectedMethod = 'bank_transfer';
                } else if (preferredMethod === 'stripe' && hasStripe) {
                    expectedMethod = 'stripe';
                } else if (preferredMethod === 'paypal' && hasPayPal) {
                    expectedMethod = 'paypal';
                } else if (hasStripe) {
                    expectedMethod = 'stripe';
                } else if (hasPayPal) {
                    expectedMethod = 'paypal';
                } else if (hasBankDetails) {
                    expectedMethod = 'bank_transfer';
                }
                
                commissionObj.payout_method = expectedMethod;
            } else {
                commissionObj.payout_method = null;
            }
            // Add partner's preferred payout method for context
            if (commission.partner_id && commission.partner_id.partner_profile) {
                commissionObj.partner_preferred_payout_method = commission.partner_id.partner_profile.preferred_payout_method || null;
            }
            
            return generateResponse(res, 200, 'Commission retrieved successfully', commissionObj);
        } catch (error) {
            return generateResponse(res, 500, 'Error retrieving commission', null, error.message);
        }
    },

    // Update commission status (Admin only)
    updateStatus: async (req, res) => {
        try {
            const { status } = req.body;
            
            const updateData = { status };
            if (status === 'paid') {
                updateData.paid_at = new Date();
            }
            
            const commission = await Commission.findByIdAndUpdate(
                req.params.id,
                updateData,
                { new: true, runValidators: true }
            );
            
            if (!commission) {
                return generateResponse(res, 404, 'Commission not found');
            }
            
            return generateResponse(res, 200, 'Commission status updated successfully', commission);
        } catch (error) {
            return generateResponse(res, 400, 'Error updating commission status', null, error.message);
        }
    },

    // Get partner commissions
    getPartnerCommissions: async (req, res) => {
        try {
            const { page = 1, limit = 10, status } = req.query;
            
            const filter = { partner_id: req.user.id };
            if (status) filter.status = status;
            
            const commissions = await Commission.find(filter)
                .populate({
                    path: 'partner_id',
                    select: 'partner_profile'
                })
                .populate('booking_id')
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .sort({ created_at: -1 });
                
            const total = await Commission.countDocuments(filter);
            
            // Transform commissions to include payment method and payout info
            const transformedCommissions = commissions.map(commission => {
                const commissionObj = commission.toObject();
                // Add payment_method from booking (how customer paid)
                if (commission.booking_id && commission.booking_id.payment_method) {
                    commissionObj.payment_method = commission.booking_id.payment_method;
                }
                // Add payout_method (how partner will be paid - set when payout happens, otherwise show expected method)
                if (commission.payout_method) {
                    commissionObj.payout_method = commission.payout_method;
                } else if (commission.partner_id && commission.partner_id.partner_profile) {
                    // If not paid yet, show the expected payout method based on partner's preferences
                    const partner = commission.partner_id;
                    const preferredMethod = partner.partner_profile.preferred_payout_method || 'stripe';
                    const hasStripe = !!partner.partner_profile.stripe_connect?.account_id;
                    const hasPayPal = !!partner.partner_profile.paypal_payout?.paypal_email;
                    const hasBankDetails = !!partner.partner_profile.bank_details?.account_number && 
                                         !!partner.partner_profile.bank_details?.routing_number;
                    
                    // Determine expected payout method (same logic as payout controller)
                    let expectedMethod = null;
                    if (preferredMethod === 'bank_transfer' && hasBankDetails) {
                        expectedMethod = 'bank_transfer';
                    } else if (preferredMethod === 'stripe' && hasStripe) {
                        expectedMethod = 'stripe';
                    } else if (preferredMethod === 'paypal' && hasPayPal) {
                        expectedMethod = 'paypal';
                    } else if (hasStripe) {
                        expectedMethod = 'stripe';
                    } else if (hasPayPal) {
                        expectedMethod = 'paypal';
                    } else if (hasBankDetails) {
                        expectedMethod = 'bank_transfer';
                    }
                    
                    commissionObj.payout_method = expectedMethod;
                } else {
                    commissionObj.payout_method = null;
                }
                // Add partner's preferred payout method for context
                if (commission.partner_id && commission.partner_id.partner_profile) {
                    commissionObj.partner_preferred_payout_method = commission.partner_id.partner_profile.preferred_payout_method || null;
                }
                return commissionObj;
            });
            
            return generateResponse(res, 200, 'Partner commissions retrieved successfully', {
                commissions: transformedCommissions,
                pagination: {
                    current_page: parseInt(page),
                    total_pages: Math.ceil(total / limit),
                    total_items: total
                }
            });
        } catch (error) {
            return generateResponse(res, 500, 'Error retrieving partner commissions', null, error.message);
        }
    }
};

module.exports = commissionController;