/* eslint-disable arrow-body-style */
const mongoose = require("mongoose");
const mongooseDelete = require("mongoose-delete");

const pointSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ["Point"],
        default: "Point",
        required: true,
    },
    coordinates: {
        type: [Number],
        required: true,
    },
});

const exploringSpotSchema = new mongoose.Schema(
    {
        spot_name: { type: String, required: true },
        description: { type: String, default: "" },
        city: { type: String, default: "" },
        radius_meters: { type: Number, default: 100 },
        no_of_points: { type: Number, default: 1 },
        location: {
            type: pointSchema,
            required: true,
        },
        created_from: {
            type: String,
            enum: ["admin", "user"],
            default: "admin",
        },
        created_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        status: {
            type: String,
            enum: ["active", "deleted"],
            default: "active",
        },
    },
    {
        timestamps: {
            createdAt: "created_at",
            updatedAt: "updated_at",
        },
    }
);

exploringSpotSchema.index({ location: "2dsphere" });
exploringSpotSchema.index({ city: 1, status: 1 });
exploringSpotSchema.plugin(mongooseDelete, { overrideMethods: "all" });

module.exports = mongoose.model("ExploringSpot", exploringSpotSchema);
