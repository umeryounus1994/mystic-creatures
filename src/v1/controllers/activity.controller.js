const Activity = require('../models/activity.model');
const ActivitySlot = require('../models/activityslot.model');
const { generateResponse } = require('../utils/response');

const activityController = {
    // Create activity
    create: async (req, res) => {
        try {
            const activityData = {
                ...req.body,
                partner_id: req.user.id
            };
            
            const activity = new Activity(activityData);
            await activity.save();
            
            return generateResponse(res, 201, 'Activity created successfully', activity);
        } catch (error) {
            return generateResponse(res, 400, 'Error creating activity', null, error.message);
        }
    },

    // Get all activities
    getAll: async (req, res) => {
        try {
            const { page = 1, limit = 10, category, status, partner_id } = req.query;
            
            const filter = {};
            if (category) filter.category = category;
            if (status) filter.status = status;
            if (partner_id) filter.partner_id = partner_id;
            
            const activities = await Activity.find(filter)
                .populate('partner_id', 'first_name last_name partner_profile.business_name')
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .sort({ created_at: -1 });
                
            const total = await Activity.countDocuments(filter);
            
            return generateResponse(res, 200, 'Activities retrieved successfully', {
                activities,
                pagination: {
                    current_page: parseInt(page),
                    total_pages: Math.ceil(total / limit),
                    total_items: total
                }
            });
        } catch (error) {
            return generateResponse(res, 500, 'Error retrieving activities', null, error.message);
        }
    },

    // Get activity by ID
    getById: async (req, res) => {
        try {
            const activity = await Activity.findById(req.params.id)
                .populate('partner_id', 'first_name last_name partner_profile.business_name');
                
            if (!activity) {
                return generateResponse(res, 404, 'Activity not found');
            }
            
            return generateResponse(res, 200, 'Activity retrieved successfully', activity);
        } catch (error) {
            return generateResponse(res, 500, 'Error retrieving activity', null, error.message);
        }
    },

    // Update activity
    update: async (req, res) => {
        try {
            const activity = await Activity.findByIdAndUpdate(
                req.params.id,
                req.body,
                { new: true, runValidators: true }
            );
            
            if (!activity) {
                return generateResponse(res, 404, 'Activity not found');
            }
            
            return generateResponse(res, 200, 'Activity updated successfully', activity);
        } catch (error) {
            return generateResponse(res, 400, 'Error updating activity', null, error.message);
        }
    },

    // Delete activity
    delete: async (req, res) => {
        try {
            const activity = await Activity.findByIdAndDelete(req.params.id);
            
            if (!activity) {
                return generateResponse(res, 404, 'Activity not found');
            }
            
            return generateResponse(res, 200, 'Activity deleted successfully');
        } catch (error) {
            return generateResponse(res, 500, 'Error deleting activity', null, error.message);
        }
    },

    // Approve activity (Admin only)
    approve: async (req, res) => {
        try {
            const activity = await Activity.findByIdAndUpdate(
                req.params.id,
                { status: 'approved', approved_at: new Date() },
                { new: true, runValidators: true }
            );
            
            if (!activity) {
                return generateResponse(res, 404, 'Activity not found');
            }
            
            return generateResponse(res, 200, 'Activity approved successfully', activity);
        } catch (error) {
            return generateResponse(res, 400, 'Error approving activity', null, error.message);
        }
    },

    // Reject activity (Admin only)
    reject: async (req, res) => {
        try {
            const { rejection_reason } = req.body;
            
            const activity = await Activity.findByIdAndUpdate(
                req.params.id,
                { 
                    status: 'rejected', 
                    rejected_at: new Date(),
                    rejection_reason: rejection_reason || 'No reason provided'
                },
                { new: true, runValidators: true }
            );
            
            if (!activity) {
                return generateResponse(res, 404, 'Activity not found');
            }
            
            return generateResponse(res, 200, 'Activity rejected successfully', activity);
        } catch (error) {
            return generateResponse(res, 400, 'Error rejecting activity', null, error.message);
        }
    }
};

module.exports = activityController;
