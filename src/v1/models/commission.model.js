const mongoose = require("mongoose");

const commissionSchema = new mongoose.Schema({
    partner_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    booking_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    quest_purchase_id: { type: mongoose.Schema.Types.ObjectId, ref: 'QuestPurchase' },
    
    transaction_type: {
        type: String,
        enum: ["booking", "quest_purchase"],
        required: true
    },
    
    // Financial details
    gross_amount: { type: Number, required: true },
    commission_rate: { type: Number, required: true },
    commission_amount: { type: Number, required: true },
    net_amount: { type: Number, required: true },
    
    // Status
    status: {
        type: String,
        enum: ["pending", "confirmed", "paid"],
        default: "pending"
    },
    
    // Payout tracking
    payout_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Payout' },
    paid_at: { type: Date },
    
    transaction_date: { type: Date, required: true }
}, {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
});

commissionSchema.index({ partner_id: 1, transaction_date: -1 });

module.exports = mongoose.model("Commission", commissionSchema);
