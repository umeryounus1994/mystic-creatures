/* eslint-disable arrow-body-style */
const mongoose = require("mongoose");
const mongooseDelete = require("mongoose-delete");


const userRewardSchema = new mongoose.Schema(
    {
        reward_id: {
            type: String,
            type: mongoose.Schema.Types.ObjectId, ref: 'Reward'
        },
        user_id: {
            type: String,
            type: mongoose.Schema.Types.ObjectId, ref: 'User'
        },
    },
    {
        timestamps: {
            createdAt: "created_at",
            updatedAt: "updated_at",
        },
    }
)

userRewardSchema.plugin(mongooseDelete, { overrideMethods: "all" });

module.exports = mongoose.model("UserReward", userRewardSchema);