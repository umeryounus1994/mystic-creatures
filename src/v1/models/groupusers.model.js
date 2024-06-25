/* eslint-disable arrow-body-style */
const mongoose = require("mongoose");
const mongooseDelete = require("mongoose-delete");


const groupsUserSchema = new mongoose.Schema(
    {
        group_id: {
            type: String,
            type: mongoose.Schema.Types.ObjectId, ref: 'Group'
        },
        friend_id: {
            type: String,
            type: mongoose.Schema.Types.ObjectId, ref: 'User'
        },
        status: {
            type: String,
            enum: ["requested", "accepted", "rejected", "deleted"],
            default: "accepted",
        },
    },
    {
        timestamps: {
            createdAt: "created_at",
            updatedAt: "updated_at",
        },
    }
);

groupsUserSchema.plugin(mongooseDelete, { overrideMethods: "all" });

module.exports = mongoose.model("GroupUser", groupsUserSchema);