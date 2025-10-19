const mongoose = require("mongoose");

const analyticsSchema = new mongoose.Schema({
    partner_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    metrics: {
        total_bookings: { type: Number, default: 0 },
        total_revenue: { type: Number, default: 0 },
        commission_paid: { type: Number, default: 0 },
        quest_sales: { type: Number, default: 0 },
        activity_views: { type: Number, default: 0 },
        conversion_rate: { type: Number, default: 0 }
    }
}, {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
});

module.exports = mongoose.model("Analytics", analyticsSchema);