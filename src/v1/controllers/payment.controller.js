const stripe = require('../../../config/stripe');
const paypal = require('../../../config/paypal');
const Booking = require('../models/booking.model');
const User = require('../models/user.model');
const Activity = require('../models/activity.model');
const Commission = require('../models/commission.model');
const { generateResponse } = require('../utils/response');

// Send automated emails
const emailController = require('./email.controller');

// Create payment intent for booking
const createPaymentIntent = async (req, res) => {
    try {
        const { booking_id } = req.body;
        
        const booking = await Booking.findById(booking_id)
            .populate('activity_id', 'title partner_id')
            .populate('user_id', 'username email stripe_customer_id');
            
        if (!booking) {
            return generateResponse(res, 404, 'Booking not found');
        }
        
        if (booking.payment_status === 'paid') {
            return generateResponse(res, 400, 'Booking already paid');
        }
        
        // Handle Stripe customer
        let customer;
        let customerId = booking.user_id.stripe_customer_id;
        
        if (customerId) {
            // Use existing customer ID
            try {
                customer = await stripe.customers.retrieve(customerId);
            } catch (error) {
                customerId = null;
            }
        }
        
        if (!customerId) {
            // Create new Stripe customer
            try {
                customer = await stripe.customers.create({
                    email: booking.user_id.email,
                    name: `${booking.user_id.username || ''}`.trim(),
                    metadata: {
                        user_id: booking.user_id._id.toString()
                    }
                });
                
                // Save customer ID to user model
                await User.findByIdAndUpdate(booking.user_id._id, {
                    stripe_customer_id: customer.id
                });
                
            } catch (customerError) {
                console.error('Customer creation error:', customerError);
                customer = null;
            }
        }
        
        // Create payment intent
        const paymentIntentData = {
            amount: Math.round(booking.total_amount * 100),
            currency: 'usd',
            metadata: {
                booking_id: booking._id.toString(),
                user_id: booking.user_id._id.toString(),
                activity_id: booking.activity_id._id.toString()
            },
            description: `Booking for ${booking.activity_id.title}`,
            receipt_email: booking.user_id.email
        };
        
        // Add customer if available
        if (customer) {
            paymentIntentData.customer = customer.id;
        }
        
        const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);
        
        // Update booking with payment intent
        await Booking.findByIdAndUpdate(booking_id, {
            stripe_payment_intent_id: paymentIntent.id,
            payment_status: 'pending'
        });
        
        return generateResponse(res, 200, 'Payment intent created', {
            client_secret: paymentIntent.client_secret,
            payment_intent_id: paymentIntent.id,
            amount: booking.total_amount,
            customer_id: customer?.id
        });
        
    } catch (error) {
        console.error('Payment intent creation error:', error);
        return generateResponse(res, 500, 'Error creating payment intent', null, error.message);
    }
};

// Confirm payment (called after successful payment on frontend)
const confirmPayment = async (req, res) => {
    try {
        const { payment_intent_id } = req.body;
        
        // Retrieve payment intent from Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
        
        // Check if payment is successful
        if (paymentIntent.status !== 'succeeded') {
            return generateResponse(res, 400, `Payment not successful. Status: ${paymentIntent.status}`);
        }
        
        const booking_id = paymentIntent.metadata.booking_id;
        const booking = await Booking.findById(booking_id)
            .populate('activity_id', 'partner_id');
            
        if (!booking) {
            return generateResponse(res, 404, 'Booking not found');
        }
        
        // Check if already processed
        if (booking.payment_status === 'paid') {
            return generateResponse(res, 200, 'Payment already confirmed', {
                booking_id,
                payment_status: 'paid'
            });
        }
        
        // Update booking status
        await Booking.findByIdAndUpdate(booking_id, {
            payment_status: 'paid',
            booking_status: 'confirmed',
            paid_at: new Date(),
            stripe_payment_intent_id: payment_intent_id
        });
        
        // Create commission record
        const commission = new Commission({
            partner_id: booking.activity_id.partner_id,
            booking_id: booking._id,
            transaction_type: 'booking',
            gross_amount: booking.total_amount,
            commission_rate: booking.commission_rate,
            commission_amount: booking.commission_amount,
            net_amount: booking.commission_amount,
            status: 'confirmed',
            transaction_date: new Date()
        });
        
        await commission.save();
        
 
        try {
            await emailController.sendBookingConfirmation(booking_id);
            await emailController.sendPartnerBookingNotification(booking_id);
        } catch (emailError) {
            console.error('❌ Email sending failed:', emailError);
            // Don't fail the payment confirmation if emails fail
        }
        
        return generateResponse(res, 200, 'Payment confirmed successfully', {
            booking_id,
            payment_status: 'paid'
        });
        
    } catch (error) {
        console.error('Payment confirmation error:', error);
        return generateResponse(res, 500, 'Error confirming payment', null, error.message);
    }
};

// Create PayPal payment
const createPayPalOrder = async (req, res) => {
    try {
        const { booking_id } = req.body;
        
        const booking = await Booking.findById(booking_id)
            .populate('activity_id', 'title partner_id')
            .populate('user_id', 'username email');
            
        if (!booking) {
            return generateResponse(res, 404, 'Booking not found');
        }
        
        if (booking.payment_status === 'paid') {
            return generateResponse(res, 400, 'Booking already paid');
        }
        
        const create_payment_json = {
            "intent": "sale",
            "payer": {
                "payment_method": "paypal"
            },
            "redirect_urls": {
                "return_url": `${process.env.FRONTEND_URL}/payment/paypal/success`,
                "cancel_url": `${process.env.FRONTEND_URL}/payment/paypal/cancel`
            },
            "transactions": [{
                "item_list": {
                    "items": [{
                        "name": booking.activity_id.title,
                        "sku": booking._id.toString(),
                        "price": booking.total_amount.toFixed(2),
                        "currency": "USD",
                        "quantity": 1
                    }]
                },
                "amount": {
                    "currency": "USD",
                    "total": booking.total_amount.toFixed(2)
                },
                "description": `Booking for ${booking.activity_id.title}`,
                "custom": booking._id.toString()
            }]
        };
        
        paypal.payment.create(create_payment_json, async (error, payment) => {
            if (error) {
                console.error('PayPal payment creation error:', error);
                return generateResponse(res, 500, 'Error creating PayPal payment', null, error.message);
            } else {
                // Update booking with PayPal payment ID
                await Booking.findByIdAndUpdate(booking_id, {
                    paypal_payment_id: payment.id,
                    payment_status: 'pending'
                });
                
                // Get approval URL
                const approval_url = payment.links.find(link => link.rel === 'approval_url').href;
                
                return generateResponse(res, 200, 'PayPal payment created', {
                    payment_id: payment.id,
                    approval_url: approval_url,
                    amount: booking.total_amount
                });
            }
        });
        
    } catch (error) {
        console.error('PayPal payment creation error:', error);
        return generateResponse(res, 500, 'Error creating PayPal payment', null, error.message);
    }
};

// Execute PayPal payment
const executePayPalPayment = async (req, res) => {
    try {
        const { payment_id, payer_id } = req.body;
        
        if (!payment_id || !payer_id) {
            return generateResponse(res, 400, 'Payment ID and Payer ID are required');
        }
        
        const execute_payment_json = {
            "payer_id": payer_id
        };
        
        paypal.payment.execute(payment_id, execute_payment_json, async (error, payment) => {
            if (error) {
                console.error('PayPal payment execution error:', error);
                return generateResponse(res, 500, 'Error executing PayPal payment', null, error.message);
            } else {
                if (payment.state !== 'approved') {
                    return generateResponse(res, 400, `Payment not approved. State: ${payment.state}`);
                }
                
                // Find booking by PayPal payment ID
                const booking = await Booking.findOne({ paypal_payment_id: payment_id })
                    .populate('activity_id', 'partner_id');
                    
                if (!booking) {
                    return generateResponse(res, 404, 'Booking not found');
                }
                
                // Check if already processed
                if (booking.payment_status === 'paid') {
                    return generateResponse(res, 200, 'Payment already confirmed', {
                        booking_id: booking._id,
                        payment_status: 'paid'
                    });
                }
            
                
                // Create commission record
                const commission = new Commission({
                    partner_id: booking.activity_id.partner_id,
                    booking_id: booking._id,
                    transaction_type: 'booking',
                    gross_amount: booking.total_amount,
                    commission_rate: booking.commission_rate,
                    commission_amount: booking.commission_amount,
                    net_amount: booking.commission_amount,
                    status: 'confirmed',
                    transaction_date: new Date()
                });
                
                await commission.save();
                await Booking.findByIdAndUpdate(booking._id, {
                    payment_status: 'paid',
                    paid_at: new Date(),
                    paypal_payment_data: payment,
                    payment_method: 'paypal'
                });

                try {
                    await emailController.sendBookingConfirmation(booking._id);
                    await emailController.sendPartnerBookingNotification(booking._id);
                } catch (emailError) {
                    console.error('❌ PayPal email sending failed:', emailError);
                    // Don't fail the payment confirmation if emails fail
                }
                
                return generateResponse(res, 200, 'PayPal payment executed successfully', {
                    booking_id: booking._id,
                    payment_status: 'paid',
                    transaction_id: payment.id
                });
            }
        });
        
    } catch (error) {
        console.error('PayPal execution error:', error);
        return generateResponse(res, 500, 'Error executing PayPal payment', null, error.message);
    }
};

// Get PayPal payment details
const getPayPalPaymentDetails = async (req, res) => {
    try {
        const { payment_id } = req.params;
        
        paypal.payment.get(payment_id, (error, payment) => {
            if (error) {
                console.error('PayPal payment details error:', error);
                return generateResponse(res, 500, 'Error retrieving PayPal payment details', null, error.message);
            } else {
                return generateResponse(res, 200, 'PayPal payment details retrieved', payment);
            }
        });
        
    } catch (error) {
        console.error('PayPal payment details error:', error);
        return generateResponse(res, 500, 'Error retrieving PayPal payment details', null, error.message);
    }
};

module.exports = {
    createPaymentIntent,
    confirmPayment,
    createPayPalOrder,
    executePayPalPayment,
    getPayPalPaymentDetails
};
