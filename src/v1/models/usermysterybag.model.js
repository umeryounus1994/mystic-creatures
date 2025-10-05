const mongoose = require("mongoose");
const mongooseDelete = require("mongoose-delete");

const userMysteryBagSchema = new mongoose.Schema(
    {
        status: { 
            type: String, 
            enum: ['viewed', 'collected'], 
            default: "viewed" 
        },
        mystery_bag_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'MysteryBag',
            required: true
        },
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        }
    },
    {
        timestamps: {
            createdAt: "created_at",
            updatedAt: "updated_at",
        },
    }
);

userMysteryBagSchema.plugin(mongooseDelete, { overrideMethods: "all" });

module.exports = mongoose.model("UserMysteryBag", userMysteryBagSchema);