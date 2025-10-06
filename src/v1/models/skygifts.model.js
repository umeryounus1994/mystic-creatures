/* eslint-disable arrow-body-style */
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

const skyGiftSchema = new mongoose.Schema(
    {
        gift_name: { type: String },
        gift_description: { type: String },
        reward_file: {type: String},
        mythica_reward: {
            type: String,
            type: mongoose.Schema.Types.ObjectId, ref: 'Creature'
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
);

skyGiftSchema.plugin(mongooseDelete, { overrideMethods: "all" });

module.exports = mongoose.model("SkyGift", skyGiftSchema);