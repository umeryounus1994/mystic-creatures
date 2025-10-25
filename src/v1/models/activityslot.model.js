const mongoose = require("mongoose");

const activitySlotSchema = new mongoose.Schema({
    activity_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Activity', required: true },
    start_time: { type: Date, required: true },
    end_time: { type: Date, required: true },
    available_spots: { type: Number, required: true },
    booked_spots: { type: Number, default: 0 },
    status: { 
        type: String, 
        enum: ["available", "full", "cancelled"], 
        default: "available" 
    }
}, {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
});

activitySlotSchema.index({ activity_id: 1, start_time: 1 });

module.exports = mongoose.model("ActivitySlot", activitySlotSchema); 
