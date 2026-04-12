const moment = require('moment');
const mongoose = require('mongoose');
const Booking = require('../models/booking.model');
const Activity = require('../models/activity.model');
const ActivitySlot = require('../models/activityslot.model');
const User = require('../models/user.model');
const { generateResponse } = require('../utils/response');
const { generateBookingId } = require('../utils/generators');
const emailController = require('./email.controller');
const { buildPartnerMonthlyFinancialPdfBuffer } = require('../../../helpers/partnerFinancialReportPdf.helper');

/**
 * Build monthly partner financial PDF. Validates partner user exists.
 * @returns {{ buffer: Buffer, filename: string } | { error: { status: number, message: string } }}
 */
async function generatePartnerMonthlyFinancialReportBuffer(partnerId, year, month) {
    if (!partnerId || !mongoose.Types.ObjectId.isValid(partnerId)) {
        return { error: { status: 400, message: 'Valid partnerId is required' } };
    }
    if (!year || !month || month < 1 || month > 12) {
        return { error: { status: 400, message: 'year and month (1-12) are required' } };
    }

    const partnerUser = await User.findOne({
        _id: partnerId,
        user_type: 'partner',
    })
        .select('email username partner_profile.business_name')
        .lean();
    if (!partnerUser) {
        return { error: { status: 404, message: 'Partner not found' } };
    }

    const partnerActivities = await Activity.find({ partner_id: partnerId }).select('_id');
    const activityIds = partnerActivities.map((a) => a._id);

    const start = moment({ year, month: month - 1 }).startOf('month').toDate();
    const end = moment({ year, month: month - 1 }).endOf('month').toDate();
    const periodLabel = moment({ year, month: month - 1 }).format('MMMM YYYY');

    const paidBookings = await Booking.find({
        activity_id: { $in: activityIds },
        payment_status: 'paid',
        $expr: {
            $and: [
                { $gte: [{ $ifNull: ['$paid_at', '$created_at'] }, start] },
                { $lte: [{ $ifNull: ['$paid_at', '$created_at'] }, end] },
            ],
        },
    })
        .populate('activity_id', 'title')
        .populate('slot_id', 'date start_time end_time')
        .populate('user_id', 'username email partner_profile')
        .sort({ created_at: 1 })
        .lean();

    const refundBookings = await Booking.find({
        activity_id: { $in: activityIds },
        payment_status: 'refunded',
        refund_amount: { $gt: 0 },
        $expr: {
            $and: [
                {
                    $gte: [
                        { $ifNull: ['$cancelled_at', { $ifNull: ['$updated_at', '$created_at'] }] },
                        start,
                    ],
                },
                {
                    $lte: [
                        { $ifNull: ['$cancelled_at', { $ifNull: ['$updated_at', '$created_at'] }] },
                        end,
                    ],
                },
            ],
        },
    })
        .populate('activity_id', 'title')
        .lean();

    let grossTotal = 0;
    let commissionTotal = 0;
    let netToPartner = 0;
    let refundTotal = 0;

    const bookingRows = paidBookings.map((b) => {
        const gross = Number(b.total_amount) || 0;
        const comm = Number(b.commission_amount) || 0;
        const net = Number(b.partner_amount) || 0;
        grossTotal += gross;
        commissionTotal += comm;
        netToPartner += net;

        const refDate = b.paid_at || b.created_at;
        const dateStr = refDate ? moment(refDate).format('DD.MM.YYYY HH:mm') : '—';
        const cust =
            b.user_id?.partner_profile?.business_name ||
            b.user_id?.username ||
            '—';
        return {
            dateStr,
            bookingRef: b.booking_id || String(b._id),
            activityTitle: b.activity_id?.title || '—',
            customerName: cust,
            participants: b.participants,
            gross,
            commissionRatePct: b.commission_rate != null ? String(b.commission_rate) : '',
            commission: comm,
            netPartner: net,
            paymentMethod: b.payment_method || '—',
            status: b.booking_status || '—',
        };
    });

    refundBookings.forEach((b) => {
        refundTotal += Number(b.refund_amount) || 0;
    });

    const refundRows = refundBookings.map((b) => {
        const d = b.cancelled_at || b.updated_at || b.created_at;
        return {
            dateStr: d ? moment(d).format('DD.MM.YYYY HH:mm') : '—',
            bookingRef: b.booking_id || String(b._id),
            activityTitle: b.activity_id?.title || '—',
            refundAmount: Number(b.refund_amount) || 0,
            note: b.cancellation_reason || '',
        };
    });

    const businessName = partnerUser?.partner_profile?.business_name || '';
    const partnerDisplayName =
        partnerUser?.username || partnerUser?.email || 'Partner';

    const pdfBuffer = await buildPartnerMonthlyFinancialPdfBuffer({
        partnerDisplayName,
        businessName,
        partnerEmail: partnerUser?.email || '',
        periodLabel,
        periodStart: start,
        periodEnd: end,
        generatedAt: new Date(),
        summary: {
            grossTotal,
            commissionTotal,
            netToPartner,
            refundTotal,
            tipsTotal: 0,
            discountTotal: 0,
        },
        bookingRows,
        refundRows,
    });

    const filename = `mystic-partner-report-${year}-${String(month).padStart(2, '0')}.pdf`;
    return { buffer: pdfBuffer, filename };
}

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
    },

    /**
     * Partner: download PDF monthly financial report (gross, commission, net per booking).
     * Params: partnerId — must match the logged-in partner.
     * Query: year (e.g. 2026), month (1–12). Uses paid_at if set, else created_at, for period filtering.
     */
    downloadPartnerMonthlyFinancialReportPdf: async (req, res) => {
        try {
            const year = parseInt(req.query.year, 10);
            const month = parseInt(req.query.month, 10);
            const { partnerId } = req.params;

            if (!partnerId || !mongoose.Types.ObjectId.isValid(partnerId)) {
                return generateResponse(res, 400, 'Valid partnerId is required');
            }
            const sessionPartnerId = String(req.user._id || req.user.id);
            if (String(partnerId) !== sessionPartnerId) {
                return generateResponse(res, 403, 'partnerId must match the logged-in partner');
            }

            const result = await generatePartnerMonthlyFinancialReportBuffer(partnerId, year, month);
            if (result.error) {
                return generateResponse(res, result.error.status, result.error.message);
            }

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
            return res.status(200).send(result.buffer);
        } catch (error) {
            return generateResponse(res, 500, 'Error generating financial report', null, error.message);
        }
    },

    /**
     * Admin: download PDF monthly financial report for any partner.
     * Params: partnerId — target partner user _id.
     * Query: year, month (1–12).
     */
    downloadAdminPartnerMonthlyFinancialReportPdf: async (req, res) => {
        try {
            const year = parseInt(req.query.year, 10);
            const month = parseInt(req.query.month, 10);
            const { partnerId } = req.params;

            const result = await generatePartnerMonthlyFinancialReportBuffer(partnerId, year, month);
            if (result.error) {
                return generateResponse(res, result.error.status, result.error.message);
            }

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
            return res.status(200).send(result.buffer);
        } catch (error) {
            return generateResponse(res, 500, 'Error generating financial report', null, error.message);
        }
    },
};

module.exports = bookingController;
