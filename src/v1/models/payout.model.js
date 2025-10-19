const mongoose = require("mongoose");

const payoutSchema = new mongoose.Schema({
    payout_id: { type: String, unique: true, required: true },
    partner_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
    // Period details
    period_start: { type: Date, required: true },
    period_end: { type: Date, required: true },
    
    // Financial summary
    total_bookings: { type: Number, required: true },
    total_quest_sales: { type: Number, default: 0 },
    gross_amount: { type: Number, required: true },
    commission_amount: { type: Number, required: true },
    net_amount: { type: Number, required: true },
    
    // Commission IDs included in this payout
    commission_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Commission' }],
    
    // Payout details
    payout_method: {
        type: String,
        enum: ["bank_transfer", "paypal", "stripe"],
        default: "bank_transfer"
    },
    
    status: {
        type: String,
        enum: ["pending", "processing", "completed", "failed"],
        default: "pending"
    },
    
    // Processing details
    processed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    processed_at: { type: Date },
    transaction_id: { type: String },
    failure_reason: { type: String },
    notes: { type: String }
}, {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
});

module.exports = mongoose.model("Payout", payoutSchema);
