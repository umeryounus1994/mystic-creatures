const mongoose = require("mongoose");

const emailQueueSchema = new mongoose.Schema({
    recipient_email: { type: String, required: true },
    recipient_name: { type: String },
    template_id: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailTemplate', required: true },
    template_data: { type: Object }, // Dynamic data for template variables
    priority: {
        type: String,
        enum: ["low", "medium", "high"],
        default: "medium"
    },
    status: {
        type: String,
        enum: ["pending", "sent", "failed", "cancelled"],
        default: "pending"
    },
    scheduled_at: { type: Date, default: Date.now },
    sent_at: { type: Date },
    error_message: { type: String },
    retry_count: { type: Number, default: 0 }
}, {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
});

module.exports = mongoose.model("EmailQueue", emailQueueSchema);