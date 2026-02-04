const Booking = require('../models/booking.model');
const Activity = require('../models/activity.model');
const ActivitySlot = require('../models/activityslot.model');
const User = require('../models/user.model');
const { generateResponse } = require('../utils/response');
const { generateBookingId } = require('../utils/generators');
const emailController = require('./email.controller');

const bookingController = {
    // Create booking
    createBooking: async (req, res) => {
        try {
            const { activity_id, slot_id, participants, special_requests, payment_method } = req.body;
            
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

            // Calculate amounts – use this partner's commission rate
            const total_amount = activity.price * participants;
            const partner = await User
              .findById(activity.partner_id)
              .select("partner_profile.commission_rate")
              .lean();
            const rawRate = partner?.partner_profile?.commission_rate ?? 15;
            const commission_rate = Number.isFinite(Number(rawRate)) ? Math.max(0, Math.min(100, Number(rawRate))) : 15;
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
                payment_status: 'pending',
                payment_method
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
            
            // Format time for email
            const formatTime = (timeString) => {
                if (!timeString) return 'TBD';
                const date = new Date(timeString);
                return date.toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                });
            };

            // Generate Google Maps link
            const generateMapLink = (location) => {
                if (location && location.coordinates && location.coordinates.length === 2) {
                    const [lng, lat] = location.coordinates;
                    return `https://maps.google.com/?q=${lat},${lng}`;
                }
                return '#';
            };

            const emailData = {
                customerName: booking.user_id.first_name,
                bookingId: booking.booking_id,
                activityTitle: booking.activity_id.title,
                date: booking.slot_id.date ? new Date(booking.slot_id.date).toDateString() : 'TBD',
                formattedStartTime: formatTime(booking.slot_id.start_time),
                formattedEndTime: formatTime(booking.slot_id.end_time),
                googleMapLink: generateMapLink(booking.activity_id.location),
                participants: booking.participants,
                totalAmount: booking.total_amount,
                partnerName: booking.activity_id.partner_id?.business_name || 'Partner',
                useIonos: true
            };

            return generateResponse(res, 200, 'Booking retrieved successfully', { booking, emailData });
        } catch (error) {
            return generateResponse(res, 500, 'Error retrieving booking', null, error.message);
        }
    },

    // Cancel booking
    cancel: async (req, res) => {
        try {
            const { cancellation_reason, booking_id } = req.body;
            
            const booking = await Booking.findById(booking_id);
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
            
            // Update slot availability only if booking was confirmed/paid
            if (booking.payment_status === 'paid') {
                const slot = await ActivitySlot.findById(booking.slot_id);
                if (slot && slot.booked_spots >= booking.participants) {
                    slot.booked_spots = Math.max(0, slot.booked_spots - booking.participants);
                    if (slot.status === 'full') {
                        slot.status = 'available';
                    }
                    await slot.save();
                }
            }
            
            // Send cancellation email
            try {
                await emailController.sendBookingCancellation(booking_id);
            } catch (emailError) {
                console.error('❌ Cancellation email sending failed:', emailError);
            }
            
            return generateResponse(res, 200, 'Booking cancelled successfully', booking);
        } catch (error) {
            return generateResponse(res, 500, 'Error cancelling booking', null, error.message);
        }
    },

    // Confirm booking after payment
    confirmBooking: async (req, res) => {
        try {
            const { booking_id } = req.body;
            
            const booking = await Booking.findOne({ _id: booking_id });
            if (!booking) {
                return generateResponse(res, 404, 'Booking not found');
            }
            
            if (booking.payment_status !== 'paid') {
                return generateResponse(res, 400, 'Booking payment is pending');
            }
            
            // Update booking status
            booking.booking_status = 'confirmed';
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
            
            // Send confirmation emails
            try {
                await emailController.sendBookingConfirmation(booking_id);
            } catch (emailError) {
                console.error('❌ Confirmation email sending failed:', emailError);
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
    },

    // Get all bookings (Admin only)
    getAllBookings: async (req, res) => {
        try {
            const { status, page = 1, limit = 10, partner_id, user_id } = req.query;
            
            const filter = {};
            if (status) filter.booking_status = status;
            if (partner_id) {
                const partnerActivities = await Activity.find({ partner_id }).select('_id');
                const activityIds = partnerActivities.map(activity => activity._id);
                filter.activity_id = { $in: activityIds };
            }
            if (user_id) filter.user_id = user_id;

            const bookings = await Booking.find(filter)
                .populate('activity_id', 'title description images price location address')
                .populate('slot_id', 'date start_time end_time')
                .populate('user_id', 'username email phone partner_profile')
                .populate({
                    path: 'activity_id',
                    populate: {
                        path: 'partner_id',
                        select: 'username email partner_profile.business_name'
                    }
                })
                .sort({ created_at: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit);

            const total = await Booking.countDocuments(filter);
            
            // Format bookings with customer and partner info
            const formattedBookings = bookings.map(booking => ({
                ...booking.toObject(),
                customer: {
                    name: booking.user_id?.partner_profile?.business_name || 
                          booking.user_id?.username || 
                          'Unknown User',
                    email: booking.user_id?.email,
                    phone: booking.user_id?.phone
                },
                partner: {
                    name: booking.activity_id?.partner_id?.partner_profile?.business_name ||
                          booking.activity_id?.partner_id?.username ||
                          'Unknown Partner',
                    email: booking.activity_id?.partner_id?.email
                }
            }));

            return generateResponse(res, 200, 'All bookings retrieved successfully', {
                bookings: formattedBookings,
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

    // Update payment data
    updatePaymentData: async (req, res) => {
        try {
            const { booking_id, stripe_payment_data } = req.body;
            
            if (!booking_id || !stripe_payment_data) {
                return generateResponse(res, 400, 'Booking ID and stripe payment data are required');
            }
            
            const booking = await Booking.findById(booking_id);
            if (!booking) {
                return generateResponse(res, 404, 'Booking not found');
            }
            
            // Update booking with payment data
            const updatedBooking = await Booking.findByIdAndUpdate(
                booking_id,
                {
                    stripe_payment_data,
                    paid_at: new Date(),
                    payment_status: 'paid',
                    booking_status: 'confirmed'
                },
                { new: true }
            );
            
            return generateResponse(res, 200, 'Payment data updated successfully', updatedBooking);
        } catch (error) {
            return generateResponse(res, 500, 'Error updating payment data', null, error.message);
        }
    },

    // Update PayPal payment data
    updatePayPalPaymentData: async (req, res) => {
        try {
            const { booking_id, paypal_payment_data } = req.body;
            
            if (!booking_id || !paypal_payment_data) {
                return generateResponse(res, 400, 'Booking ID and PayPal payment data are required');
            }
            
            const booking = await Booking.findById(booking_id);
            if (!booking) {
                return generateResponse(res, 404, 'Booking not found');
            }
            
            // Update booking with PayPal payment data
            const updatedBooking = await Booking.findByIdAndUpdate(
                booking_id,
                {
                    paypal_payment_data,
                    paid_at: new Date(),
                    payment_status: 'paid',
                    booking_status: 'confirmed'
                },
                { new: true }
            );
            
            return generateResponse(res, 200, 'PayPal payment data updated successfully', updatedBooking);
        } catch (error) {
            return generateResponse(res, 500, 'Error updating PayPal payment data', null, error.message);
        }
    }
};

module.exports = bookingController;
