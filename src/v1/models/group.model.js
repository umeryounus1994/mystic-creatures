/* eslint-disable arrow-body-style */
const mongoose = require("mongoose");
const mongooseDelete = require("mongoose-delete");


const groupsSchema = new mongoose.Schema(
    {
        group_name: {
            type: String
        },
        group_creater: {
            type: String,
            type: mongoose.Schema.Types.ObjectId, ref: 'User'
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

groupsSchema.plugin(mongooseDelete, { overrideMethods: "all" });

module.exports = mongoose.model("Group", groupsSchema);