const Refund = require('../models/refund.model');
const { generateResponse } = require('../utils/response');

const refundController = {
    // Create new refund (User)
    create: async (req, res) => {
        try {
            const { 
                booking_id, 
                quest_purchase_id, 
                refund_type, 
                original_amount, 
                refund_amount, 
                refund_reason, 
                refund_method 
            } = req.body;
            
            const refund = new Refund({
                refund_id: `REF-${Date.now()}`,
                booking_id,
                quest_purchase_id,
                user_id: req.user.id,
                refund_type,
                original_amount,
                refund_amount,
                refund_reason,
                refund_method
            });
            
            await refund.save();
            
            return generateResponse(res, 201, 'Refund request created successfully', refund);
        } catch (error) {
            return generateResponse(res, 400, 'Error creating refund request', null, error.message);
        }
    },

    // Get user's refunds
    getUserRefunds: async (req, res) => {
        try {
            const { page = 1, limit = 10, status } = req.query;
            
            const filter = { user_id: req.user.id };
            if (status) filter.status = status;
            
            const refunds = await Refund.find(filter)
                .populate('booking_id')
                .populate('quest_purchase_id')
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .sort({ created_at: -1 });
                
            const total = await Refund.countDocuments(filter);
            
            return generateResponse(res, 200, 'User refunds retrieved successfully', {
                refunds,
                pagination: {
                    current_page: parseInt(page),
                    total_pages: Math.ceil(total / limit),
                    total_items: total
                }
            });
        } catch (error) {
            return generateResponse(res, 500, 'Error retrieving user refunds', null, error.message);
        }
    },

    // Get all refunds (Admin only)
    getAll: async (req, res) => {
        try {
            const { page = 1, limit = 10, status, refund_type } = req.query;
            
            const filter = {};
            if (status) filter.status = status;
            if (refund_type) filter.refund_type = refund_type;
            
            const refunds = await Refund.find(filter)
                .populate('user_id', 'first_name last_name email')
                .populate('booking_id')
                .populate('quest_purchase_id')
                .populate('processed_by', 'first_name last_name')
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .sort({ created_at: -1 });
                
            const total = await Refund.countDocuments(filter);
            
            return generateResponse(res, 200, 'Refunds retrieved successfully', {
                refunds,
                pagination: {
                    current_page: parseInt(page),
                    total_pages: Math.ceil(total / limit),
                    total_items: total
                }
            });
        } catch (error) {
            return generateResponse(res, 500, 'Error retrieving refunds', null, error.message);
        }
    },

    // Get refund by ID (Admin only)
    getById: async (req, res) => {
        try {
            const refund = await Refund.findById(req.params.id)
                .populate('user_id', 'first_name last_name email')
                .populate('booking_id')
                .populate('quest_purchase_id')
                .populate('processed_by', 'first_name last_name');
                
            if (!refund) {
                return generateResponse(res, 404, 'Refund not found');
            }
            
            return generateResponse(res, 200, 'Refund retrieved successfully', refund);
        } catch (error) {
            return generateResponse(res, 500, 'Error retrieving refund', null, error.message);
        }
    },

    // Process refund (Admin only)
    process: async (req, res) => {
        try {
            const { status, payment_intent_id, failure_reason, notes } = req.body;
            
            const updateData = {
                status,
                processed_by: req.user.id,
                processed_at: new Date(),
                notes
            };
            
            if (status === 'completed' && payment_intent_id) {
                updateData.payment_intent_id = payment_intent_id;
            }
            
            if (status === 'failed' && failure_reason) {
                updateData.failure_reason = failure_reason;
            }
            
            const refund = await Refund.findByIdAndUpdate(
                req.params.id,
                updateData,
                { new: true, runValidators: true }
            );
            
            if (!refund) {
                return generateResponse(res, 404, 'Refund not found');
            }
            
            return generateResponse(res, 200, 'Refund processed successfully', refund);
        } catch (error) {
            return generateResponse(res, 400, 'Error processing refund', null, error.message);
        }
    }
};

module.exports = refundController;