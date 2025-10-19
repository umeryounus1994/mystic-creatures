const Booking = require('../models/booking.model');
const Activity = require('../models/activity.model');
const ActivitySlot = require('../models/activityslot.model');
const { generateResponse } = require('../utils/response');
const { generateBookingId } = require('../utils/generators');

const bookingController = {
    // Create booking
    create: async (req, res) => {
        try {
            const { activity_id, slot_id, participants } = req.body;
            
            // Validate activity and slot
            const activity = await Activity.findById(activity_id);
            if (!activity) {
                return generateResponse(res, 404, 'Activity not found');
            }
            
            const slot = await ActivitySlot.findById(slot_id);
            if (!slot) {
                return generateResponse(res, 404, 'Activity slot not found');
            }
            
            // Check availability
            if (slot.booked_spots + participants > slot.available_spots) {
                return generateResponse(res, 400, 'Not enough spots available');
            }
            
            // Calculate amounts
            const total_amount = activity.price * participants;
            const commission_rate = 15; // Get from partner profile or system config
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
                partner_amount
            };
            
            const booking = new Booking(bookingData);
            await booking.save();
            
            // Update slot availability
            slot.booked_spots += participants;
            if (slot.booked_spots >= slot.available_spots) {
                slot.status = 'full';
            }
            await slot.save();
            
            return generateResponse(res, 201, 'Booking created successfully', booking);
        } catch (error) {
            return generateResponse(res, 400, 'Error creating booking', null, error.message);
        }
    },

    // Get user bookings
    getUserBookings: async (req, res) => {
        try {
            const { page = 1, limit = 10, status } = req.query;
            
            const filter = { user_id: req.user.id };
            if (status) filter.booking_status = status;
            
            const bookings = await Booking.find(filter)
                .populate('activity_id', 'title description images')
                .populate('slot_id', 'start_time end_time')
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .sort({ created_at: -1 });
                
            const total = await Booking.countDocuments(filter);
            
            return generateResponse(res, 200, 'Bookings retrieved successfully', {
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
    }
};

module.exports = bookingController;