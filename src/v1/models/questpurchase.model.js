const mongoose = require("mongoose");

const questPurchaseSchema = new mongoose.Schema({
    purchase_id: { type: String, unique: true, required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    quest_id: { type: mongoose.Schema.Types.ObjectId, ref: 'DigitalQuest', required: true },
    
    // Financial details
    amount_paid: { type: Number, required: true },
    commission_rate: { type: Number, default: 0 }, // Usually 0 for digital quests
    commission_amount: { type: Number, default: 0 },
    
    // Payment details
    payment_status: {
        type: String,
        enum: ["pending", "paid", "failed", "refunded"],
        default: "pending"
    },
    payment_intent_id: { type: String },
    
    // Access details
    access_granted: { type: Boolean, default: false },
    download_count: { type: Number, default: 0 },
    max_downloads: { type: Number, default: 5 },
    expires_at: { type: Date }, // For seasonal quests
    
    refund_amount: { type: Number, default: 0 }
}, {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
});

questPurchaseSchema.index({ user_id: 1, created_at: -1 });

module.exports = mongoose.model("QuestPurchase", questPurchaseSchema);
