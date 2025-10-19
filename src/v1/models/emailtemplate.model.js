const mongoose = require("mongoose");

const emailTemplateSchema = new mongoose.Schema({
    template_name: { type: String, required: true, unique: true },
    template_type: {
        type: String,
        enum: ["booking_confirmation", "booking_reminder", "cancellation", "partner_approval", "payment_receipt", "quest_purchase"],
        required: true
    },
    subject: { type: String, required: true },
    html_content: { type: String, required: true },
    text_content: { type: String },
    variables: [String], // e.g., ["user_name", "booking_id", "activity_title"]
    status: {
        type: String,
        enum: ["active", "inactive"],
        default: "active"
    }
}, {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
});

module.exports = mongoose.model("EmailTemplate", emailTemplateSchema);