const mongoose = require("mongoose");

const refundSchema = new mongoose.Schema({
    refund_id: { type: String, unique: true, required: true },
    booking_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    quest_purchase_id: { type: mongoose.Schema.Types.ObjectId, ref: 'QuestPurchase' },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
    refund_type: {
        type: String,
        enum: ["booking", "quest_purchase"],
        required: true
    },
    
    // Financial details
    original_amount: { type: Number, required: true },
    refund_amount: { type: Number, required: true },
    
    // Refund details
    refund_reason: {
        type: String,
        enum: ["user_cancellation", "partner_cancellation", "dispute_resolution", "system_error"],
        required: true
    },
    
    refund_method: {
        type: String,
        enum: ["original_payment", "credit", "bank_transfer"],
        default: "original_payment"
    },
    
    status: {
        type: String,
        enum: ["pending", "processing", "completed", "failed"],
        default: "pending"
    },
    
    // Processing details
    payment_intent_id: { type: String },
    processed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    processed_at: { type: Date },
    failure_reason: { type: String },
    notes: { type: String }
}, {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
});

module.exports = mongoose.model("Refund", refundSchema);
