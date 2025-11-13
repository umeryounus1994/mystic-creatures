const stripe = require('../../../config/stripe');
const Booking = require('../models/booking.model');
const Commission = require('../models/commission.model');
const emailController = require('./email.controller');

const handleStripeWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
        case 'payment_intent.succeeded':
            await handlePaymentSuccess(event.data.object);
            break;
        case 'payment_intent.payment_failed':
            await handlePaymentFailed(event.data.object);
            break;
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
};

const handlePaymentSuccess = async (paymentIntent) => {
    try {
        const booking_id = paymentIntent.metadata.booking_id;
        
        const booking = await Booking.findByIdAndUpdate(booking_id, {
            payment_status: 'paid',
            status: 'confirmed',
            paid_at: new Date()
        }, { new: true }).populate('activity_id', 'partner_id');

        if (booking) {
            // Create/update commission
            await Commission.findOneAndUpdate(
                { booking_id: booking._id },
                {
                    partner_id: booking.activity_id.partner_id,
                    booking_id: booking._id,
                    transaction_type: 'booking',
                    gross_amount: booking.total_amount,
                    commission_rate: booking.commission_rate,
                    commission_amount: booking.commission_amount,
                    net_amount: booking.commission_amount,
                    status: 'confirmed'
                },
                { upsert: true, new: true }
            );
            
            // Send automated emails
            
            try {
                await emailController.sendBookingConfirmation(booking_id);
                await emailController.sendPartnerBookingNotification(booking_id);
            } catch (emailError) {
                console.error('❌ Webhook email sending failed:', emailError);
            }
        }
    } catch (error) {
        console.error('Error handling payment success:', error);
    }
};

const handlePaymentFailed = async (paymentIntent) => {
    try {
        const booking_id = paymentIntent.metadata.booking_id;
        
        await Booking.findByIdAndUpdate(booking_id, {
            payment_status: 'failed',
            status: 'cancelled'
        });
        
    } catch (error) {
        console.error('Error handling payment failure:', error);
    }
};

module.exports = {
    handleStripeWebhook
};
