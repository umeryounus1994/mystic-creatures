const Notification = require('../models/notification.model');
const { generateResponse } = require('../utils/response');

const notificationController = {
    // Get user notifications
    getUserNotifications: async (req, res) => {
        try {
            const { page = 1, limit = 10, status } = req.query;
            
            const filter = { recipient_id: req.user.id };
            if (status) filter.status = status;
            
            const notifications = await Notification.find(filter)
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .sort({ created_at: -1 });
                
            const total = await Notification.countDocuments(filter);
            
            return generateResponse(res, 200, 'User notifications retrieved successfully', {
                notifications,
                pagination: {
                    current_page: parseInt(page),
                    total_pages: Math.ceil(total / limit),
                    total_items: total
                }
            });
        } catch (error) {
            return generateResponse(res, 500, 'Error retrieving user notifications', null, error.message);
        }
    },

    // Mark notification as read
    markAsRead: async (req, res) => {
        try {
            const notification = await Notification.findOneAndUpdate(
                { 
                    _id: req.params.id, 
                    recipient_id: req.user.id 
                },
                { 
                    opened_at: new Date() 
                },
                { new: true }
            );
            
            if (!notification) {
                return generateResponse(res, 404, 'Notification not found');
            }
            
            return generateResponse(res, 200, 'Notification marked as read', notification);
        } catch (error) {
            return generateResponse(res, 400, 'Error marking notification as read', null, error.message);
        }
    },

    // Get all notifications (Admin only)
    getAll: async (req, res) => {
        try {
            const { page = 1, limit = 10, status, notification_type, template_type } = req.query;
            
            const filter = {};
            if (status) filter.status = status;
            if (notification_type) filter.notification_type = notification_type;
            if (template_type) filter.template_type = template_type;
            
            const notifications = await Notification.find(filter)
                .populate('recipient_id', 'first_name last_name email')
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .sort({ created_at: -1 });
                
            const total = await Notification.countDocuments(filter);
            
            return generateResponse(res, 200, 'Notifications retrieved successfully', {
                notifications,
                pagination: {
                    current_page: parseInt(page),
                    total_pages: Math.ceil(total / limit),
                    total_items: total
                }
            });
        } catch (error) {
            return generateResponse(res, 500, 'Error retrieving notifications', null, error.message);
        }
    },

    // Create notification (Admin only)
    create: async (req, res) => {
        try {
            const {
                notification_type,
                template_type,
                recipient_id,
                recipient_email,
                recipient_name,
                subject,
                content,
                template_data,
                scheduled_at
            } = req.body;
            
            const notification = new Notification({
                notification_type,
                template_type,
                recipient_id,
                recipient_email,
                recipient_name,
                subject,
                content,
                template_data,
                scheduled_at: scheduled_at || new Date()
            });
            
            await notification.save();
            
            return generateResponse(res, 201, 'Notification created successfully', notification);
        } catch (error) {
            return generateResponse(res, 400, 'Error creating notification', null, error.message);
        }
    },

    // Get notification by ID (Admin only)
    getById: async (req, res) => {
        try {
            const notification = await Notification.findById(req.params.id)
                .populate('recipient_id', 'first_name last_name email');
                
            if (!notification) {
                return generateResponse(res, 404, 'Notification not found');
            }
            
            return generateResponse(res, 200, 'Notification retrieved successfully', notification);
        } catch (error) {
            return generateResponse(res, 500, 'Error retrieving notification', null, error.message);
        }
    }
};

module.exports = notificationController;