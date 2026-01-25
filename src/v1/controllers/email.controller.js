const { sendEmail } = require('../../../utils/sendEmail');
const Booking = require('../models/booking.model');
const Activity = require('../models/activity.model');
const User = require('../models/user.model');

// Helper functions
const formatTime = (timeString) => {
    if (!timeString) return 'TBD';
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
    });
};

const generateMapLink = (location) => {
    if (location && location.coordinates && location.coordinates.length === 2) {
        const [lng, lat] = location.coordinates;
        return `https://maps.google.com/?q=${lat},${lng}`;
    }
    return '#';
};

const emailController = {
    // Send booking confirmation email
    sendBookingConfirmation: async (bookingId) => {
        try {
            const booking = await Booking.findById(bookingId)
                .populate('user_id', 'username email')
                .populate('activity_id', 'title description location price partner_id')
                .populate('slot_id')
                .populate({
                    path: 'activity_id',
                    populate: {
                        path: 'partner_id',
                        select: 'username email partner_profile.business_name'
                    }
                });

            if (!booking) {
                console.error('Booking not found:', bookingId);
                return false;
            }

            // Use slot_id times directly since they contain the full datetime
            const bookingDate = booking.slot_id?.start_time || booking.created_at || new Date();
            const startTime = formatTime(booking.slot_id?.start_time);
            const endTime = formatTime(booking.slot_id?.end_time);

            const emailData = {
                to: booking.user_id.email,
                subject: `Buchung bestätigt - ${booking.activity_id.title}`,
                template: 'booking-confirmation',
                useIonos: true,
                data: {
                    customerName: booking.user_id.username || 'Customer',
                    bookingId: booking.booking_id || booking._id,
                    activityTitle: booking.activity_id.title,
                    date: new Date(bookingDate).toDateString(),
                    formattedStartTime: startTime,
                    formattedEndTime: endTime,
                    googleMapLink: generateMapLink(booking.activity_id.location),
                    participants: booking.participants || 1,
                    totalAmount: booking.total_amount,
                    partnerName: booking.activity_id.partner_id?.partner_profile?.business_name || 
                                booking.activity_id.partner_id?.username ||
                                'Partner',
                    partnerContact: booking.activity_id.partner_id?.partner_profile?.email || 
                                   booking.activity_id.partner_id?.email,
                    specialRequests: booking.special_requests
                }
            };

            await sendEmail(emailData);
            return true;
        } catch (error) {
            console.error('Error sending booking confirmation email:', error);
            return false;
        }
    },

    // Send booking cancellation email
    sendBookingCancellation: async (bookingId) => {
        try {
            const booking = await Booking.findById(bookingId)
                .populate('user_id', 'username email')
                .populate('activity_id', 'title location partner_id')
                .populate('slot_id');

            if (!booking) return false;

            const bookingDate = booking.slot_id?.start_time || booking.booking_date || booking.created_at || new Date();
            const startTime = formatTime(booking.slot_id?.start_time || booking.start_time);
            const endTime = formatTime(booking.slot_id?.end_time || booking.end_time);

            const emailData = {
                to: booking.user_id.email,
                subject: `Buchung storniert - ${booking.activity_id.title}`,
                template: 'booking-cancellation',
                useIonos: true,
                data: {
                    customerName: booking.user_id.username || 'Customer',
                    bookingId: booking.booking_id || booking._id,
                    activityTitle: booking.activity_id.title,
                    date: new Date(bookingDate).toDateString(),
                    formattedStartTime: startTime,
                    formattedEndTime: endTime,
                    googleMapLink: generateMapLink(booking.activity_id.location),
                    cancellationReason: booking.cancellation_reason,
                    refundAmount: booking.refund_amount || 0
                }
            };

            await sendEmail(emailData);
            return true;
        } catch (error) {
            console.error('Error sending cancellation email:', error);
            return false;
        }
    },

    // Send partner notification email
    sendPartnerBookingNotification: async (bookingId) => {
        try {
            const booking = await Booking.findById(bookingId)
                .populate('user_id', 'username email')
                .populate('activity_id', 'title location partner_id')
                .populate('slot_id')
                .populate({
                    path: 'activity_id',
                    populate: {
                        path: 'partner_id',
                        select: 'username email partner_profile.business_name'
                    }
                });

            if (!booking) {
                console.error('Booking not found for partner notification:', bookingId);
                return false;
            }

            // Use booking fields directly if slot_id is not populated
            const bookingDate = booking.slot_id?.date || booking.booking_date || booking.created_at || booking.createdAt || new Date();
            const startTime = formatTime(booking.slot_id?.start_time || booking.start_time);

            const emailData = {
                to: booking.activity_id.partner_id.email,
                subject: `Neue Buchung erhalten - ${booking.activity_id.title}`,
                template: 'partner-booking-notification',
                useIonos: true,
                data: {
                    partnerName: booking.activity_id.partner_id?.partner_profile?.business_name || 
                                booking.activity_id.partner_id?.username || 
                                'Partner',
                    bookingId: booking.booking_id || booking._id,
                    activityTitle: booking.activity_id.title,
                    customerName: booking.user_id.username || 'Customer',
                    customerEmail: booking.user_id.email,
                    date: new Date(bookingDate).toDateString(),
                    formattedStartTime: startTime,
                    participants: booking.participants || 1,
                    totalAmount: booking.total_amount,
                    partnerEarnings: booking.partner_amount || booking.total_amount,
                    specialRequests: booking.special_requests
                }
            };

            await sendEmail(emailData);
            return true;
        } catch (error) {
            console.error('Error sending partner notification email:', error);
            return false;
        }
    },

    // Send password reset email
    sendPasswordResetEmail: async (emailData) => {
        try {
            const { userEmail, userName, resetUrl, resetId } = emailData;
            
            const emailContent = {
                to: userEmail,
                subject: 'Passwort zurücksetzen',
                template: 'password-reset',
                useIonos: true,
                data: {
                    userName,
                    resetLink: `${resetUrl}?id=${resetId}`
                }
            };

            await sendEmail(emailContent);
            return { success: true };
        } catch (error) {
            console.error('Error sending password reset email:', error);
            return { success: false, error: error.message };
        }
    }
};

module.exports = emailController;
