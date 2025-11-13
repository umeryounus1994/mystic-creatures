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
        enum: ['unpaid', 'pending', 'paid'],
        default: 'unpaid'
    },
    transaction_date: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
});

module.exports = mongoose.model('Commission', commissionSchema);
