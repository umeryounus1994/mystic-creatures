const mongoose = require("mongoose");

const disputeSchema = new mongoose.Schema({
    dispute_id: { type: String, unique: true, required: true },
    booking_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    partner_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    dispute_type: {
        type: String,
        enum: ["refund_request", "service_issue", "no_show", "quality_complaint", "billing_dispute"],
        required: true
    },
    description: { type: String, required: true },
    evidence_files: [String],
    amount_disputed: { type: Number, required: true },
    status: {
        type: String,
        enum: ["open", "under_review", "resolved", "closed"],
        default: "open"
    },
    resolution: {
        type: String,
        enum: ["full_refund", "partial_refund", "no_refund", "credit_issued", "other"],
    },
    resolution_notes: { type: String },
    resolved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolved_at: { type: Date }
}, {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
});

module.exports = mongoose.model("Dispute", disputeSchema);