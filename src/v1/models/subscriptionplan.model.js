const mongoose = require("mongoose");

const subscriptionPlanSchema = new mongoose.Schema({
    plan_name: { type: String, required: true },
    plan_type: {
        type: String,
        enum: ["family", "partner"],
        required: true
    },
    tier: {
        type: String,
        enum: ["basic", "premium", "enterprise"],
        required: true
    },
    price: { type: Number, required: true },
    billing_cycle: {
        type: String,
        enum: ["monthly", "yearly"],
        required: true
    },
    features: {
        booking_discount: { type: Number, default: 0 }, // percentage
        exclusive_quests: { type: Boolean, default: false },
        priority_booking: { type: Boolean, default: false },
        commission_rate: { type: Number }, // for partners
        max_activities: { type: Number }, // for partners
        analytics_access: { type: Boolean, default: false }
    },
    status: {
        type: String,
        enum: ["active", "inactive"],
        default: "active"
    }
}, {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
});

module.exports = mongoose.model("SubscriptionPlan", subscriptionPlanSchema);