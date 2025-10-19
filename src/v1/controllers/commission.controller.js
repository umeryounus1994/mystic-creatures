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
                .populate('partner_id', 'first_name last_name email')
                .populate('booking_id')
                .populate('quest_purchase_id')
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .sort({ created_at: -1 });
                
            const total = await Commission.countDocuments(filter);
            
            return generateResponse(res, 200, 'Commissions retrieved successfully', {
                commissions,
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
                .populate('partner_id', 'first_name last_name email')
                .populate('booking_id')
                .populate('quest_purchase_id');
                
            if (!commission) {
                return generateResponse(res, 404, 'Commission not found');
            }
            
            return generateResponse(res, 200, 'Commission retrieved successfully', commission);
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
                .populate('booking_id')
                .populate('quest_purchase_id')
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .sort({ created_at: -1 });
                
            const total = await Commission.countDocuments(filter);
            
            return generateResponse(res, 200, 'Partner commissions retrieved successfully', {
                commissions,
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