const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
    notification_type: {
        type: String,
        enum: ["email", "system", "sms"],
        default: "email"
    },
    
    template_type: {
        type: String,
        enum: ["booking_confirmation", "booking_reminder", "cancellation", "partner_approval", "payment_receipt", "quest_purchase"],
        required: true
    },
    
    // Recipients
    recipient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recipient_email: { type: String, required: true },
    recipient_name: { type: String },
    
    // Content
    subject: { type: String, required: true },
    content: { type: String, required: true },
    template_data: { type: Object }, // Dynamic data for personalization
    
    // Scheduling & Status
    scheduled_at: { type: Date, default: Date.now },
    sent_at: { type: Date },
    status: {
        type: String,
        enum: ["pending", "sent", "failed", "cancelled"],
        default: "pending"
    },
    
    // Error handling
    error_message: { type: String },
    retry_count: { type: Number, default: 0 },
    max_retries: { type: Number, default: 3 },
    
    // Tracking
    opened_at: { type: Date },
    clicked_at: { type: Date }
}, {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
});

notificationSchema.index({ status: 1, scheduled_at: 1 });

module.exports = mongoose.model("Notification", notificationSchema);