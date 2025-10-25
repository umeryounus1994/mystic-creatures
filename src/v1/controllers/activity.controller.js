const Activity = require('../models/activity.model');
const ActivitySlot = require('../models/activityslot.model');
const { generateResponse } = require('../utils/response');

const activityController = {
    // Create activity
    create: async (req, res) => {
        try {
            const { slots, latitude, longitude, ...activityBody } = req.body;
            
            // Create location object from latitude and longitude
            const location = {
                type: 'Point',
                coordinates: [parseFloat(longitude), parseFloat(latitude)]
            };
            
            const activityData = {
                ...activityBody,
                location: location,
                partner_id: req.user.id
            };
            
            // Handle multiple image uploads
            if (req.files && req.files.length > 0) {
                activityData.images = req.files.map(file => file.location);
            }
            
            const activity = new Activity(activityData);
            await activity.save();
            
            // Create activity slots if provided
            if (slots) {
                let parsedSlots = [];
                try {
                    parsedSlots = typeof slots === 'string' ? JSON.parse(slots) : slots;
                } catch (error) {
                    console.log('Error parsing slots:', error);
                }
                
                if (Array.isArray(parsedSlots) && parsedSlots.length > 0) {
                    const slotsData = parsedSlots.map(slot => ({
                        activity_id: activity._id,
                        start_time: new Date(slot.start_time),
                        end_time: new Date(slot.end_time),
                        available_spots: parseInt(slot.available_spots),
                        booked_spots: 0,
                        status: 'available'
                    }));
                    
                    await ActivitySlot.insertMany(slotsData);
                }
            }
            
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
            
            // Get activity slots
            const slots = await ActivitySlot.find({ activity_id: req.params.id })
                .sort({ start_time: 1 });
            
            const activityWithSlots = {
                ...activity.toObject(),
                slots
            };
            
            return generateResponse(res, 200, 'Activity retrieved successfully', activityWithSlots);
        } catch (error) {
            return generateResponse(res, 500, 'Error retrieving activity', null, error.message);
        }
    },

    // Update activity
    update: async (req, res) => {
        try {
            const { id } = req.params;
            const { slots, latitude, longitude, existing_images, ...activityBody } = req.body;
            
            // Create location object if latitude/longitude provided
            const updateData = { ...activityBody };
            if (latitude && longitude) {
                updateData.location = {
                    type: 'Point',
                    coordinates: [parseFloat(longitude), parseFloat(latitude)]
                };
            }
            
            // Handle image updates
            let allImages = [];
            
            // Add existing images if provided
            if (existing_images) {
                try {
                    const existingImagesArray = typeof existing_images === 'string' ? 
                        JSON.parse(existing_images) : existing_images;
                    allImages = [...existingImagesArray];
                } catch (error) {
                    console.log('Error parsing existing_images:', error);
                }
            }
            
            // Add new uploaded images
            if (req.files && req.files.length > 0) {
                const newImages = req.files.map(file => file.location);
                allImages = [...allImages, ...newImages];
            }
            
            // Update images array if we have any images
            if (allImages.length > 0) {
                updateData.images = allImages;
            }
            
            const activity = await Activity.findByIdAndUpdate(id, updateData, { new: true });
            
            if (!activity) {
                return generateResponse(res, 404, 'Activity not found');
            }
            
            // Update activity slots if provided
            if (slots) {
                let parsedSlots = [];
                try {
                    parsedSlots = typeof slots === 'string' ? JSON.parse(slots) : slots;
                } catch (error) {
                    console.log('Error parsing slots:', error);
                }
                
                if (Array.isArray(parsedSlots) && parsedSlots.length > 0) {
                    // Get existing slots to preserve booked_spots
                    const existingSlots = await ActivitySlot.find({ activity_id: id });
                    
                    // Delete existing slots
                    await ActivitySlot.deleteMany({ activity_id: id });
                    
                    // Create new slots, preserving booked_spots where possible
                    const slotsData = parsedSlots.map(slot => {
                        const existingSlot = existingSlots.find(existing => 
                            new Date(existing.start_time).getTime() === new Date(slot.start_time).getTime()
                        );
                        
                        const bookedSpots = existingSlot ? existingSlot.booked_spots : 0;
                        const availableSpots = parseInt(slot.available_spots);
                        
                        return {
                            activity_id: id,
                            start_time: new Date(slot.start_time),
                            end_time: new Date(slot.end_time),
                            available_spots: availableSpots,
                            booked_spots: bookedSpots,
                            status: bookedSpots >= availableSpots ? 'full' : 'available'
                        };
                    });
                    
                    await ActivitySlot.insertMany(slotsData);
                }
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
