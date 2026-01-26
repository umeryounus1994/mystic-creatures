const mongoose = require('mongoose');

const commissionSchema = new mongoose.Schema({
    partner_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    booking_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        required: true
    },
    transaction_type: {
        type: String,
        enum: ['booking', 'refund', 'adjustment'],
        default: 'booking'
    },
    gross_amount: {
        type: Number,
        required: true
    },
    commission_rate: {
        type: Number,
        required: true
    },
    commission_amount: {
        type: Number,
        required: true
    },
    net_amount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled'],
        default: 'pending'
    },
    payout_status: {
        type: String,
        enum: ['unpaid', 'pending', 'paid', 'failed'],
        default: 'unpaid'
    },
    payout_method: {
        type: String,
        enum: ['stripe', 'paypal', 'bank_transfer'],
    },
    payout_date: Date,
    payout_transaction_id: String,  // Stripe transfer ID or PayPal batch ID
    payout_batch_id: String,  // For batch payouts
    payout_error: String,  // Error message if payout failed
    transaction_date: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
});

module.exports = mongoose.model('Commission', commissionSchema);
