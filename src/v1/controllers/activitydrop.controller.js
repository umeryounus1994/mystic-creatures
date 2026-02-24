const ActivityDrop = require("../models/activitydrop.model");
const Activity = require("../models/activity.model");
const ActivitySlot = require("../models/activityslot.model");
const { generateResponse } = require("../utils/response");
const logger = require('../../../middlewares/logger');

// Returns activity IDs that have at least one slot with end_time in the future (drops linked to these are visible)
const getActivityIdsWithFutureSlots = async () => {
    const now = new Date();
    const ids = await ActivitySlot.find({ end_time: { $gt: now } }).distinct('activity_id');
    return ids;
};

// Create activity drop
const createActivityDrop = async (req, res) => {
    try {
        const { drop_name, drop_description, latitude, longitude, activity_id } = req.body;

        // Validate activity exists
        const activity = await Activity.findById(activity_id);
        if (!activity) {
            return generateResponse(res, 404, 'Activity not found');
        }

        // Check if user is the activity owner or admin
        if (activity.partner_id.toString() !== req.user.id && req.user.role !== 'admin') {
            return generateResponse(res, 403, 'Not authorized to create drops for this activity');
        }

        const location = { 
            type: 'Point', 
            coordinates: [parseFloat(longitude), parseFloat(latitude)] 
        };

        const dropData = {
            drop_name,
            drop_description,
            location,
            activity_id,
            created_by: req.user.id,
            drop_image: req.file ? req.file.location : ""
        };

        const activityDrop = new ActivityDrop(dropData);
        await activityDrop.save();

        return generateResponse(res, 201, 'Activity drop created successfully', activityDrop);

    } catch (error) {
        logger.error('Create activity drop error:', error);
        return generateResponse(res, 500, 'Error creating activity drop', null, error.message);
    }
};

// Get drops for specific activity (only when activity has at least one slot with end_time in the future)
const getActivityDrops = async (req, res) => {
    try {
        const { activity_id } = req.params;
        const now = new Date();
        const hasFutureSlot = await ActivitySlot.exists({ activity_id, end_time: { $gt: now } });
        if (!hasFutureSlot) {
            return generateResponse(res, 200, 'Activity drops retrieved successfully', []);
        }

        const drops = await ActivityDrop.find({ 
            activity_id, 
            status: 'active' 
        })
        .populate('activity_id', 'title')
        .populate('created_by', 'username')
        .sort({ created_at: -1 });

        return generateResponse(res, 200, 'Activity drops retrieved successfully', drops);

    } catch (error) {
        logger.error('Get activity drops error:', error);
        return generateResponse(res, 500, 'Error retrieving activity drops', null, error.message);
    }
};

// Get all activity drops (only for activities that have at least one slot with end_time in the future)
const getAllActivityDrops = async (req, res) => {
    try {
        const activityIdsWithFutureSlots = await getActivityIdsWithFutureSlots();
        const drops = await ActivityDrop.find({ 
            status: 'active',
            created_by: req.user.id,
            activity_id: { $in: activityIdsWithFutureSlots }
        })
            .populate('activity_id', 'title partner_id images')
            .populate('created_by', 'username')
            .sort({ created_at: -1 });

        // Map through drops and extract images to root level
        const dropsWithImages = drops.map(drop => {
            const dropData = drop.toObject();
            const activityImages = dropData.activity_id?.images || [];
            
            // Remove images from activity_id
            if (dropData.activity_id) {
                delete dropData.activity_id.images;
            }
            
            // Add images as separate field at root level
            dropData.activity_images = activityImages;
            
            return dropData;
        });

        return generateResponse(res, 200, 'All activity drops retrieved successfully', dropsWithImages);

    } catch (error) {
        logger.error('Get all activity drops error:', error);
        return generateResponse(res, 500, 'Error retrieving activity drops', null, error.message);
    }
};

// Get nearby activity drops
const getNearbyActivityDrops = async (req, res) => {
    try {
        const { latitude, longitude, radius = 10 } = req.body;

        if (!latitude || !longitude) {
            return generateResponse(res, 400, 'Latitude and longitude are required');
        }

        const activityIdsWithFutureSlots = await getActivityIdsWithFutureSlots();
        const drops = await ActivityDrop.find({
            status: 'active',
            activity_id: { $in: activityIdsWithFutureSlots },
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [parseFloat(longitude), parseFloat(latitude)]
                    },
                    $maxDistance: radius * 1000 // Convert km to meters
                }
            }
        })
        .populate('activity_id', 'title partner_id images')
        .populate('created_by', 'username');

        // Map through drops and extract images to root level
        const dropsWithImages = drops.map(drop => {
            const dropData = drop.toObject();
            const activityImages = dropData.activity_id?.images || [];
            
            // Remove images from activity_id
            if (dropData.activity_id) {
                delete dropData.activity_id.images;
            }
            
            // Add images as separate field at root level
            dropData.activity_images = activityImages;
            
            return dropData;
        });

        return generateResponse(res, 200, 'Nearby activity drops retrieved successfully', dropsWithImages);

    } catch (error) {
        logger.error('Get nearby activity drops error:', error);
        return generateResponse(res, 500, 'Error retrieving nearby activity drops', null, error.message);
    }
};

// Update activity drop
const updateActivityDrop = async (req, res) => {
    try {
        const { id } = req.params;
        const { drop_name, drop_description, latitude, longitude } = req.body;

        const activityDrop = await ActivityDrop.findById(id).populate('activity_id');
        if (!activityDrop) {
            return generateResponse(res, 404, 'Activity drop not found');
        }

        // Check authorization
        if (activityDrop.activity_id.partner_id.toString() !== req.user.id && req.user.role !== 'admin') {
            return generateResponse(res, 403, 'Not authorized to update this drop');
        }

        const updateData = {
            drop_name,
            drop_description
        };

        if (latitude && longitude) {
            updateData.location = {
                type: 'Point',
                coordinates: [parseFloat(longitude), parseFloat(latitude)]
            };
        }

        if (req.file) {
            updateData.drop_image = req.file.location;
        }

        const updatedDrop = await ActivityDrop.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        ).populate('activity_id', 'title');

        return generateResponse(res, 200, 'Activity drop updated successfully', updatedDrop);

    } catch (error) {
        logger.error('Update activity drop error:', error);
        return generateResponse(res, 500, 'Error updating activity drop', null, error.message);
    }
};

// Delete activity drop
const deleteActivityDrop = async (req, res) => {
    try {
        const { id } = req.params;

        const activityDrop = await ActivityDrop.findById(id).populate('activity_id');
        if (!activityDrop) {
            return generateResponse(res, 404, 'Activity drop not found');
        }

        // Check authorization
        if (activityDrop.activity_id.partner_id.toString() !== req.user.id && req.user.role !== 'admin') {
            return generateResponse(res, 403, 'Not authorized to delete this drop');
        }

        await ActivityDrop.findByIdAndUpdate(id, { status: 'deleted' });

        return generateResponse(res, 200, 'Activity drop deleted successfully');

    } catch (error) {
        logger.error('Delete activity drop error:', error);
        return generateResponse(res, 500, 'Error deleting activity drop', null, error.message);
    }
};

// Get single activity drop (includes activity_has_future_slots so client can show as inactive when slots are past)
const getActivityDrop = async (req, res) => {
    try {
        const { id } = req.params;

        const activityDrop = await ActivityDrop.findById(id)
            .populate('activity_id', 'title partner_id images')
            .populate('created_by', 'username');

        if (!activityDrop) {
            return generateResponse(res, 404, 'Activity drop not found');
        }

        const activityId = activityDrop.activity_id?._id || activityDrop.activity_id;
        const now = new Date();
        const hasFutureSlot = activityId
            ? await ActivitySlot.exists({ activity_id: activityId, end_time: { $gt: now } })
            : false;

        // Convert to plain object and extract images
        const dropData = activityDrop.toObject();
        const activityImages = dropData.activity_id?.images || [];
        
        // Remove images from activity_id
        if (dropData.activity_id) {
            delete dropData.activity_id.images;
        }
        
        // Add images as separate field at root level
        dropData.activity_images = activityImages;
        dropData.activity_has_future_slots = !!hasFutureSlot;

        return generateResponse(res, 200, 'Activity drop retrieved successfully', dropData);

    } catch (error) {
        logger.error('Get activity drop error:', error);
        return generateResponse(res, 500, 'Error retrieving activity drop', null, error.message);
    }
};

module.exports = {
    createActivityDrop,
    getActivityDrops,
    getAllActivityDrops,
    getNearbyActivityDrops,
    updateActivityDrop,
    deleteActivityDrop,
    getActivityDrop
};
