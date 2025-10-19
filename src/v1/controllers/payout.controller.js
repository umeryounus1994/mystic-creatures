const Payout = require('../models/payout.model');
const Commission = require('../models/commission.model');
const { generateResponse } = require('../utils/response');

const payoutController = {
    // Get all payouts (Admin only)
    getAll: async (req, res) => {
        try {
            const { page = 1, limit = 10, status, partner_id } = req.query;
            
            const filter = {};
            if (status) filter.status = status;
            if (partner_id) filter.partner_id = partner_id;
            
            const payouts = await Payout.find(filter)
                .populate('partner_id', 'first_name last_name email')
                .populate('commission_ids')
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .sort({ created_at: -1 });
                
            const total = await Payout.countDocuments(filter);
            
            return generateResponse(res, 200, 'Payouts retrieved successfully', {
                payouts,
                pagination: {
                    current_page: parseInt(page),
                    total_pages: Math.ceil(total / limit),
                    total_items: total
                }
            });
        } catch (error) {
            return generateResponse(res, 500, 'Error retrieving payouts', null, error.message);
        }
    },

    // Create new payout (Admin only)
    create: async (req, res) => {
        try {
            const { partner_id, period_start, period_end, commission_ids } = req.body;
            
            // Calculate totals from commissions
            const commissions = await Commission.find({ _id: { $in: commission_ids } });
            const total_bookings = commissions.length;
            const gross_amount = commissions.reduce((sum, c) => sum + c.gross_amount, 0);
            const commission_amount = commissions.reduce((sum, c) => sum + c.commission_amount, 0);
            const net_amount = commission_amount;
            
            const payout = new Payout({
                payout_id: `PAY-${Date.now()}`,
                partner_id,
                period_start,
                period_end,
                total_bookings,
                gross_amount,
                commission_amount,
                net_amount,
                commission_ids
            });
            
            await payout.save();
            
            return generateResponse(res, 201, 'Payout created successfully', payout);
        } catch (error) {
            return generateResponse(res, 400, 'Error creating payout', null, error.message);
        }
    },

    // Get payout by ID (Admin only)
    getById: async (req, res) => {
        try {
            const payout = await Payout.findById(req.params.id)
                .populate('partner_id', 'first_name last_name email')
                .populate('commission_ids');
                
            if (!payout) {
                return generateResponse(res, 404, 'Payout not found');
            }
            
            return generateResponse(res, 200, 'Payout retrieved successfully', payout);
        } catch (error) {
            return generateResponse(res, 500, 'Error retrieving payout', null, error.message);
        }
    },

    // Process payout (Admin only)
    process: async (req, res) => {
        try {
            const { transaction_id, notes } = req.body;
            
            const payout = await Payout.findByIdAndUpdate(
                req.params.id,
                {
                    status: 'completed',
                    processed_by: req.user.id,
                    processed_at: new Date(),
                    transaction_id,
                    notes
                },
                { new: true, runValidators: true }
            );
            
            if (!payout) {
                return generateResponse(res, 404, 'Payout not found');
            }
            
            // Update commission statuses to paid
            await Commission.updateMany(
                { _id: { $in: payout.commission_ids } },
                { status: 'paid', paid_at: new Date() }
            );
            
            return generateResponse(res, 200, 'Payout processed successfully', payout);
        } catch (error) {
            return generateResponse(res, 400, 'Error processing payout', null, error.message);
        }
    },

    // Get partner payouts
    getPartnerPayouts: async (req, res) => {
        try {
            const { page = 1, limit = 10, status } = req.query;
            
            const filter = { partner_id: req.user.id };
            if (status) filter.status = status;
            
            const payouts = await Payout.find(filter)
                .populate('commission_ids')
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .sort({ created_at: -1 });
                
            const total = await Payout.countDocuments(filter);
            
            return generateResponse(res, 200, 'Partner payouts retrieved successfully', {
                payouts,
                pagination: {
                    current_page: parseInt(page),
                    total_pages: Math.ceil(total / limit),
                    total_items: total
                }
            });
        } catch (error) {
            return generateResponse(res, 500, 'Error retrieving partner payouts', null, error.message);
        }
    }
};

module.exports = payoutController;