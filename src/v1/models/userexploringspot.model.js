/* eslint-disable arrow-body-style */
const mongoose = require("mongoose");
const mongooseDelete = require("mongoose-delete");

const userExploringSpotSchema = new mongoose.Schema(
    {
        exploring_spot_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ExploringSpot",
        },
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        status: {
            type: String,
            enum: ["entered", "checked_in", "notified"],
            default: "entered",
        },
        points_awarded: { type: Number, default: 0 },
        last_notified_at: { type: Date },
        last_entered_at: { type: Date },
        checked_in_at: { type: Date },
    },
    {
        timestamps: {
            createdAt: "created_at",
            updatedAt: "updated_at",
        },
    }
);

userExploringSpotSchema.index(
    { user_id: 1, exploring_spot_id: 1 },
    { unique: true }
);
userExploringSpotSchema.plugin(mongooseDelete, { overrideMethods: "all" });

module.exports = mongoose.model("UserExploringSpot", userExploringSpotSchema);
