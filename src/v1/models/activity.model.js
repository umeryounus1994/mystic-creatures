const mongoose = require("mongoose");
const mongooseDelete = require("mongoose-delete");

const pointSchema = new mongoose.Schema({
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: [Number] // [longitude, latitude]
});

const activitySchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { 
        type: String, 
        enum: ["outdoor", "indoor", "educational", "sports", "arts", "adventure"],
        required: true 
    },
    price: { type: Number, required: true, min: 0 },
    images: [String],
    location: {
        type: pointSchema, 
        required: true
    },
    address: { type: String, required: true },
    duration: { type: Number, required: true }, // minutes
    max_participants: { type: Number, required: true, min: 1 },
    partner_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { 
        type: String, 
        enum: ["draft", "pending", "approved", "rejected", "inactive"],
        default: "pending" 
    },
    approved_at: { type: Date },
    rejected_at: { type: Date },
    rejection_reason: { type: String }
}, {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
});

activitySchema.plugin(mongooseDelete, { overrideMethods: "all" });
activitySchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Activity", activitySchema);
