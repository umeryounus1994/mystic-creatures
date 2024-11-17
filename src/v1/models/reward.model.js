/* eslint-disable arrow-body-style */
const mongoose = require("mongoose");
const mongooseDelete = require("mongoose-delete");

const rewardSchema = new mongoose.Schema(
    {
        reward_name: { type: Number },
        reward_file: {type: String},
        reward_crypes: {type: Number},
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

rewardSchema.plugin(mongooseDelete, { overrideMethods: "all" });

module.exports = mongoose.model("Reward", rewardSchema);