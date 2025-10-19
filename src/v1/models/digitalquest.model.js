const mongoose = require("mongoose");

const digitalQuestSchema = new mongoose.Schema({
    quest_title: { type: String, required: true },
    quest_description: { type: String },
    quest_type: {
        type: String,
        enum: ["free", "paid", "seasonal", "treasure_hunt", "birthday"],
        default: "free"
    },
    price: { type: Number, default: 0 },
    content_type: {
        type: String,
        enum: ["simple", "image", "video", "ar"],
        default: "simple"
    },
    quest_files: [String],
    age_group: {
        type: String,
        enum: ["3-6", "7-10", "11-14", "15+"],
        required: true
    },
    partner_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    is_premium: { type: Boolean, default: false },
    seasonal_dates: {
        start_date: { type: Date },
        end_date: { type: Date }
    },
    status: {
        type: String,
        enum: ["draft", "published", "archived"],
        default: "draft"
    },
    content_files: [String], // URLs to quest content
    age_group: {
        min_age: { type: Number, default: 0 },
        max_age: { type: Number, default: 100 }
    },
    seasonal_availability: {
        start_date: Date,
        end_date: Date
    },
    purchase_count: { type: Number, default: 0 },
    tags: [String],
    difficulty_level: {
        type: String,
        enum: ["easy", "medium", "hard"],
        default: "easy"
    }
}, {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
});

module.exports = mongoose.model("DigitalQuest", digitalQuestSchema);
