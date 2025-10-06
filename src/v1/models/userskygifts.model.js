/* eslint-disable arrow-body-style */
const mongoose = require("mongoose");
const mongooseDelete = require("mongoose-delete");

const userSkyGiftSchema = new mongoose.Schema(
    {
        status: { 
            type: String, 
            enum: ['claimed'], 
            default: "claimed" 
        },
        sky_gift_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'SkyGift',
            required: true
        },
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        claimed_at: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: {
            createdAt: "created_at",
            updatedAt: "updated_at",
        },
    }
);

userSkyGiftSchema.plugin(mongooseDelete, { overrideMethods: "all" });

module.exports = mongoose.model("UserSkyGift", userSkyGiftSchema);