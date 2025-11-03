const Activity = require('../models/activity.model');
const ActivitySlot = require('../models/activityslot.model');
const Booking = require('../models/booking.model');
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

            // Get pending bookings for these slots
            const slotIds = slots.map(slot => slot._id);
            const pendingBookings = await Booking.find({
                slot_id: { $in: slotIds },
                booking_status: 'pending',
                payment_status: 'pending'
            });

            // Get user's bookings for these slots (if user is logged in)
            let userBookedSlots = [];
            if (req.user && req.user.id) {
                if (req.user.user_type === 'family') {
                    // Family users see only their own bookings
                    userBookedSlots = await Booking.find({
                        slot_id: { $in: slotIds },
                        user_id: req.user.id
                    }).select('slot_id booking_status payment_status participants cancellation_reason created_at');
                } else if (req.user.user_type === 'partner' || req.user.user_type === 'admin') {
                    // Partners and admins see all bookings for this activity
                    userBookedSlots = await Booking.find({
                        slot_id: { $in: slotIds }
                    })
                    .populate('user_id', 'username email partner_profile.business_name')
                    .select('slot_id booking_status payment_status participants cancellation_reason user_id created_at');
                }
            }

            // Calculate reserved spots for each slot
            const slotsWithReservation = slots.map(slot => {
                const pendingForSlot = pendingBookings.filter(
                    booking => booking.slot_id.toString() === slot._id.toString()
                );
                
                const reservedSpots = pendingForSlot.reduce(
                    (total, booking) => total + booking.participants, 0
                );

                const actualAvailableSpots = slot.available_spots - slot.booked_spots - reservedSpots;

                return {
                    ...slot.toObject(),
                    reserved_spots: reservedSpots,
                    actual_available_spots: Math.max(0, actualAvailableSpots),
                    slot_status: actualAvailableSpots <= 0 ? 'full' : 
                               slot.status === 'cancelled' ? 'cancelled' : 'available'
                };
            });

            const activityWithSlots = {
                ...activity.toObject(),
                slots: slotsWithReservation,
                user_booked_slots: userBookedSlots.map(booking => ({
                    slot_id: booking.slot_id,
                    booking_status: booking.booking_status,
                    payment_status: booking.payment_status,
                    participants: booking.participants,
                    cancellation_reason: booking.cancellation_reason,
                    booked_at: booking.created_at,
                    ...(req.user.user_type !== 'family' && booking.user_id && {
                        customer: {
                            name: booking.user_id.partner_profile?.business_name || 
                                  booking.user_id.username || 
                                  'Unknown User',
                            email: booking.user_id.email
                        }
                    })
                }))
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
    },

    // Get partner dashboard stats
    getPartnerStats: async (req, res) => {
        try {
            const partnerId = req.user.id;

            // Get partner's activities
            const totalActivities = await Activity.countDocuments({ partner_id: partnerId });
            const activeActivities = await Activity.countDocuments({
                partner_id: partnerId,
                status: 'approved'
            });
            const pendingActivities = await Activity.countDocuments({
                partner_id: partnerId,
                status: 'pending'
            });

            // Get partner's activity IDs for booking queries
            const partnerActivities = await Activity.find({ partner_id: partnerId }).select('_id');
            const activityIds = partnerActivities.map(activity => activity._id);

            // Get booking stats
            const totalBookings = await Booking.countDocuments({
                activity_id: { $in: activityIds }
            });

            const confirmedBookings = await Booking.countDocuments({
                activity_id: { $in: activityIds },
                booking_status: 'confirmed'
            });

            const completedBookings = await Booking.countDocuments({
                activity_id: { $in: activityIds },
                booking_status: 'completed'
            });

            // Get revenue stats
            const revenueStats = await Booking.aggregate([
                {
                    $match: {
                        activity_id: { $in: activityIds },
                        payment_status: 'paid'
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: '$total_amount' },
                        partnerEarnings: { $sum: '$partner_amount' },
                        commissionPaid: { $sum: '$commission_amount' }
                    }
                }
            ]);

            // Get this month's earnings
            const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
            const monthlyEarnings = await Booking.aggregate([
                {
                    $match: {
                        activity_id: { $in: activityIds },
                        payment_status: 'paid',
                        created_at: { $gte: startOfMonth }
                    }
                },
                {
                    $group: {
                        _id: null,
                        monthlyRevenue: { $sum: '$partner_amount' }
                    }
                }
            ]);

            // Get recent bookings
            const recentBookings = await Booking.find({
                activity_id: { $in: activityIds }
            })
                .populate('user_id', 'first_name last_name')
                .populate('activity_id', 'title price')
                .populate('slot_id', 'date start_time end_time')
                .sort({ created_at: -1 })
                .limit(5);

            // Get recent activities
            const recentActivities = await Activity.find({ partner_id: partnerId })
                .sort({ created_at: -1 })
                .limit(5)
                .select('title status created_at price images')
                .lean();

            // Add first image to each activity
            const recentActivitiesWithImage = recentActivities.map(activity => ({
                ...activity,
                image: activity.images && activity.images.length > 0 ? activity.images[0] : null
            }));

            const revenue = revenueStats[0] || { totalRevenue: 0, partnerEarnings: 0, commissionPaid: 0 };
            const monthly = monthlyEarnings[0] || { monthlyRevenue: 0 };

            const stats = {
                activities: {
                    total: totalActivities,
                    active: activeActivities,
                    pending: pendingActivities,
                    rejected: totalActivities - activeActivities - pendingActivities
                },
                bookings: {
                    total: totalBookings,
                    confirmed: confirmedBookings,
                    completed: completedBookings,
                    cancelled: totalBookings - confirmedBookings - completedBookings
                },
                revenue: {
                    totalRevenue: revenue.totalRevenue,
                    partnerEarnings: revenue.partnerEarnings,
                    commissionPaid: revenue.commissionPaid,
                    monthlyEarnings: monthly.monthlyRevenue
                },
                recentBookings,
                recentActivities: recentActivitiesWithImage
            };

            return generateResponse(res, 200, 'Partner stats retrieved successfully', stats);
        } catch (error) {
            return generateResponse(res, 500, 'Error retrieving partner stats', null, error.message);
        }
    },

    // Browse activities with filters for family users
    browseActivities: async (req, res) => {
        try {
            const { 
                page = 1, 
                limit = 10, 
                category, 
                date, 
                latitude, 
                longitude, 
                radius = 10, // km
                search,
                min_price,
                max_price
            } = req.query;

            const filter = { status: 'approved' };
            
            if (category) filter.category = category;
            if (search) {
                filter.$or = [
                    { title: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } }
                ];
            }
            if (min_price || max_price) {
                filter.price = {};
                if (min_price) filter.price.$gte = parseFloat(min_price);
                if (max_price) filter.price.$lte = parseFloat(max_price);
            }

            // Location-based search
            if (latitude && longitude) {
                filter.location = {
                    $near: {
                        $geometry: {
                            type: 'Point',
                            coordinates: [parseFloat(longitude), parseFloat(latitude)]
                        },
                        $maxDistance: radius * 1000 // Convert km to meters
                    }
                };
            }

            let activities = await Activity.find(filter)
                .populate('partner_id', 'first_name last_name partner_profile.business_name')
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .sort({ created_at: -1 });

            // Filter by date if provided
            if (date) {
                const targetDate = new Date(date);
                const activityIds = activities.map(a => a._id);
                
                const availableSlots = await ActivitySlot.find({
                    activity_id: { $in: activityIds },
                    date: {
                        $gte: new Date(targetDate.setHours(0, 0, 0, 0)),
                        $lt: new Date(targetDate.setHours(23, 59, 59, 999))
                    },
                    status: 'available'
                });

                const availableActivityIds = availableSlots.map(slot => slot.activity_id.toString());
                activities = activities.filter(activity => 
                    availableActivityIds.includes(activity._id.toString())
                );
            }

            const total = activities.length;

            return generateResponse(res, 200, 'Activities retrieved successfully', {
                activities,
                pagination: {
                    current_page: parseInt(page),
                    total_pages: Math.ceil(total / limit),
                    total_items: total
                }
            });
        } catch (error) {
            return generateResponse(res, 500, 'Error browsing activities', null, error.message);
        }
    },
    getActivityDetails: async (req, res) => {
        try {
            const { id } = req.params;
            const { date } = req.query;

            const activity = await Activity.findById(id)
                .populate('partner_id', 'first_name last_name partner_profile.business_name partner_profile.contact_info');

            if (!activity || activity.status !== 'approved') {
                return generateResponse(res, 404, 'Activity not found or not available');
            }

            // Get all slots
            let slotsFilter = { activity_id: id };
            if (date) {
                const targetDate = new Date(date);
                slotsFilter.start_time = {
                    $gte: new Date(targetDate.setHours(0, 0, 0, 0)),
                    $lt: new Date(targetDate.setHours(23, 59, 59, 999))
                };
            }

            const slots = await ActivitySlot.find(slotsFilter)
                .sort({ start_time: 1 });

            // Get pending bookings for these slots
            const slotIds = slots.map(slot => slot._id);
            const pendingBookings = await Booking.find({
                slot_id: { $in: slotIds },
                booking_status: 'pending',
                payment_status: 'pending'
            });

            // Calculate reserved spots for each slot
            const slotsWithReservation = slots.map(slot => {
                const pendingForSlot = pendingBookings.filter(
                    booking => booking.slot_id.toString() === slot._id.toString()
                );
                
                const reservedSpots = pendingForSlot.reduce(
                    (total, booking) => total + booking.participants, 0
                );

                const actualAvailableSpots = slot.available_spots - slot.booked_spots - reservedSpots;

                return {
                    ...slot.toObject(),
                    reserved_spots: reservedSpots,
                    actual_available_spots: Math.max(0, actualAvailableSpots),
                    slot_status: actualAvailableSpots <= 0 ? 'full' : 
                               slot.status === 'cancelled' ? 'cancelled' : 'available'
                };
            });

            // Get reviews
            const reviews = await require('../models/review.model').find({ activity_id: id })
                .populate('user_id', 'first_name last_name')
                .sort({ created_at: -1 })
                .limit(5);

            const activityDetails = {
                ...activity.toObject(),
                slots: slotsWithReservation,
                reviews: reviews || []
            };

            return generateResponse(res, 200, 'Activity details retrieved successfully', activityDetails);
        } catch (error) {
            return generateResponse(res, 500, 'Error retrieving activity details', null, error.message);
        }
    }
};

module.exports = activityController;
