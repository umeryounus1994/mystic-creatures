/* eslint-disable arrow-body-style */
const mongoose = require("mongoose");
const mongooseDelete = require("mongoose-delete");


const friendsSchema = new mongoose.Schema(
    {
        user_id: {
            type: String,
            type: mongoose.Schema.Types.ObjectId, ref: 'User'
        },
        friend_id: {
            type: String,
            type: mongoose.Schema.Types.ObjectId, ref: 'User'
        },
        status: {
            type: String,
            enum: ["requested", "accepted", "rejected", "deleted"],
            default: "requested",
        },
    },
    {
        timestamps: {
            createdAt: "created_at",
            updatedAt: "updated_at",
        },
    }
);

friendsSchema.plugin(mongooseDelete, { overrideMethods: "all" });

module.exports = mongoose.model("Friend", friendsSchema);