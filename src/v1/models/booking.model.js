const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
    booking_id: { type: String, unique: true, required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    activity_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Activity', required: true },
    slot_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ActivitySlot', required: true },
    participants: { type: Number, required: true, min: 1 },
    
    // Financial details
    total_amount: { type: Number, required: true },
    commission_rate: { type: Number, required: true },
    commission_amount: { type: Number, required: true },
    partner_amount: { type: Number, required: true },
    
    // Payment details
    payment_status: {
        type: String,
        enum: ["pending", "paid", "failed", "refunded"],
        default: "pending"
    },
    payment_intent_id: { type: String },
    payment_method: { type: String },
    
    // Booking status
    booking_status: {
        type: String,
        enum: ["confirmed", "cancelled", "completed", "no_show"],
        default: "confirmed"
    },
    
    // Additional info
    special_requests: { type: String },
    cancellation_reason: { type: String },
    cancelled_at: { type: Date },
    refund_amount: { type: Number, default: 0 }
}, {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
});

bookingSchema.index({ user_id: 1, created_at: -1 });
bookingSchema.index({ activity_id: 1, created_at: -1 });

module.exports = mongoose.model("Booking", bookingSchema);
