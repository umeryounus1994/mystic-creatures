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
        default: "draft" 
    },
    tags: [String],
    age_group: {
        min_age: { type: Number, default: 0 },
        max_age: { type: Number, default: 100 }
    }
}, {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
});

activitySchema.plugin(mongooseDelete, { overrideMethods: "all" });
activitySchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Activity", activitySchema);
