const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
    booking_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    activity_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Activity', required: true },
    partner_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
    // Review content
    rating: { type: Number, min: 1, max: 5, required: true },
    review_text: { type: String },
    photos: [String],
    
    // Moderation
    is_verified: { type: Boolean, default: false },
    status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending"
    },
    moderated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    moderation_notes: { type: String },
    
    // Partner response
    partner_response: { type: String },
    partner_response_date: { type: Date },
    
    // Helpful votes
    helpful_votes: { type: Number, default: 0 },
    total_votes: { type: Number, default: 0 }
}, {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
});

reviewSchema.index({ activity_id: 1, status: 1 });
reviewSchema.index({ partner_id: 1, created_at: -1 });

module.exports = mongoose.model("Review", reviewSchema);
