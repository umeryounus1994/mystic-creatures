const Booking = require('../models/booking.model');
const Activity = require('../models/activity.model');
const ActivitySlot = require('../models/activityslot.model');
const { generateResponse } = require('../utils/response');
const { generateBookingId } = require('../utils/generators');

const bookingController = {
    // Create booking
    createBooking: async (req, res) => {
        try {
            const { activity_id, slot_id, participants, special_requests } = req.body;
            
            // Validate activity and slot
            const activity = await Activity.findById(activity_id);
            if (!activity || activity.status !== 'approved') {
                return generateResponse(res, 404, 'Activity not found or not available');
            }

            const slot = await ActivitySlot.findById(slot_id);
            if (!slot || slot.status !== 'available') {
                return generateResponse(res, 404, 'Time slot not available');
            }

            // Check availability
            if (slot.booked_spots + participants > slot.available_spots) {
                return generateResponse(res, 400, 'Not enough spots available');
            }

            // Calculate amounts
            const total_amount = activity.price * participants;
            const commission_rate = 15;
            const commission_amount = (total_amount * commission_rate) / 100;
            const partner_amount = total_amount - commission_amount;
            
            const bookingData = {
                booking_id: generateBookingId(),
                user_id: req.user.id,
                activity_id,
                slot_id,
                participants,
                total_amount,
                commission_rate,
                commission_amount,
                partner_amount,
                special_requests,
                booking_status: 'pending', // Keep as pending until payment
                payment_status: 'pending'
            };
            
            const booking = new Booking(bookingData);
            await booking.save();
            
            // Don't update slot availability until payment is confirmed
            // This will be handled in payment confirmation webhook
            
            // Populate booking details for response
            const populatedBooking = await Booking.findById(booking._id)
                .populate('activity_id', 'title description price')
                .populate('slot_id', 'date start_time end_time');

            return generateResponse(res, 201, 'Booking created successfully. Please complete payment.', populatedBooking);
        } catch (error) {
            return generateResponse(res, 500, 'Error creating booking', null, error.message);
        }
    },

    // Get user's bookings
    getUserBookings: async (req, res) => {
        try {
            const { status, page = 1, limit = 10 } = req.query;
            
            const filter = { user_id: req.user.id };
            if (status) filter.booking_status = status;

            const bookings = await Booking.find(filter)
                .populate('activity_id', 'title description images price location address')
                .populate('slot_id', 'date start_time end_time')
                .sort({ created_at: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit);

            const total = await Booking.countDocuments(filter);

            return generateResponse(res, 200, 'User bookings retrieved successfully', {
                bookings,
                pagination: {
                    current_page: parseInt(page),
                    total_pages: Math.ceil(total / limit),
                    total_items: total
                }
            });
        } catch (error) {
            return generateResponse(res, 500, 'Error retrieving bookings', null, error.message);
        }
    },

    // Get booking by ID
    getById: async (req, res) => {
        try {
            const booking = await Booking.findById(req.params.id)
                .populate('activity_id')
                .populate('slot_id')
                .populate('user_id', 'first_name last_name email');
                
            if (!booking) {
                return generateResponse(res, 404, 'Booking not found');
            }
            
            return generateResponse(res, 200, 'Booking retrieved successfully', booking);
        } catch (error) {
            return generateResponse(res, 500, 'Error retrieving booking', null, error.message);
        }
    },

    // Cancel booking
    cancel: async (req, res) => {
        try {
            const { cancellation_reason } = req.body;
            
            const booking = await Booking.findById(req.params.id);
            if (!booking) {
                return generateResponse(res, 404, 'Booking not found');
            }
            
            if (booking.booking_status === 'cancelled') {
                return generateResponse(res, 400, 'Booking already cancelled');
            }
            
            booking.booking_status = 'cancelled';
            booking.cancellation_reason = cancellation_reason;
            booking.cancelled_at = new Date();
            await booking.save();
            
            // Update slot availability
            const slot = await ActivitySlot.findById(booking.slot_id);
            if (slot) {
                slot.booked_spots -= booking.participants;
                if (slot.status === 'full') {
                    slot.status = 'available';
                }
                await slot.save();
            }
            
            return generateResponse(res, 200, 'Booking cancelled successfully', booking);
        } catch (error) {
            return generateResponse(res, 500, 'Error cancelling booking', null, error.message);
        }
    },

    // Confirm booking after payment
    confirmBooking: async (req, res) => {
        try {
            const { booking_id, payment_intent_id, payment_method } = req.body;
            
            const booking = await Booking.findOne({ booking_id });
            if (!booking) {
                return generateResponse(res, 404, 'Booking not found');
            }
            
            if (booking.payment_status === 'paid') {
                return generateResponse(res, 400, 'Booking already confirmed');
            }
            
            // Update booking status
            booking.booking_status = 'confirmed';
            booking.payment_status = 'paid';
            booking.payment_intent_id = payment_intent_id;
            booking.payment_method = payment_method;
            await booking.save();
            
            // Now update slot availability
            const slot = await ActivitySlot.findById(booking.slot_id);
            if (slot) {
                slot.booked_spots += booking.participants;
                if (slot.booked_spots >= slot.available_spots) {
                    slot.status = 'full';
                }
                await slot.save();
            }
            
            return generateResponse(res, 200, 'Booking confirmed successfully', booking);
        } catch (error) {
            return generateResponse(res, 500, 'Error confirming booking', null, error.message);
        }
    },

    // Get partner's bookings
    getPartnerBookings: async (req, res) => {
        try {
            const { status, page = 1, limit = 10 } = req.query;
            
            // Get partner's activities first
            const partnerActivities = await Activity.find({ partner_id: req.user.id }).select('_id');
            const activityIds = partnerActivities.map(activity => activity._id);
            
            const filter = { activity_id: { $in: activityIds } };
            if (status) filter.booking_status = status;

            const bookings = await Booking.find(filter)
                .populate('activity_id', 'title description images price location address')
                .populate('slot_id', 'date start_time end_time')
                .populate('user_id', 'username email phone partner_profile')
                .sort({ created_at: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit);

            const total = await Booking.countDocuments(filter);
            
            // Format bookings with customer info
            const formattedBookings = bookings.map(booking => ({
                ...booking.toObject(),
                customer: {
                    name: booking.user_id?.partner_profile?.business_name || 
                          booking.user_id?.username || 
                          'Unknown User',
                    email: booking.user_id?.email,
                    phone: booking.user_id?.phone
                }
            }));

            return generateResponse(res, 200, 'Partner bookings retrieved successfully', {
                bookings: formattedBookings,
                pagination: {
                    current_page: parseInt(page),
                    total_pages: Math.ceil(total / limit),
                    total_items: total
                }
            });
        } catch (error) {
            return generateResponse(res, 500, 'Error retrieving partner bookings', null, error.message);
        }
    }
};

module.exports = bookingController;
