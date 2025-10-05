const mongoose = require("mongoose");
const mongooseDelete = require("mongoose-delete");

const pointSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
        required: true,
    },
    coordinates: {
        type: [Number],
        required: true,
    },
});

const mysteryBagSchema = new mongoose.Schema(
    {
        bag_title: { type: String, required: true },
        bag_description: { type: String },
        clue_text: { type: String },
        reward_text: { type: String },
        reward_file: { type: String }, // for item rewards
        bag_type: {
            type: String,
            enum: ["collectible", "view-only"],
            default: "collectible"
        },
        location: {
            type: pointSchema,
            required: true,
        },
        status: {
            type: String,
            enum: ["active", "deleted"],
            default: "active",
        },
        created_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        visibility_radius: {
            type: Number,
            default: 70 // km
        }
    },
    {
        timestamps: {
            createdAt: "created_at",
            updatedAt: "updated_at",
        },
    }
);

mysteryBagSchema.plugin(mongooseDelete, { overrideMethods: "all" });

module.exports = mongoose.model("MysteryBag", mysteryBagSchema);