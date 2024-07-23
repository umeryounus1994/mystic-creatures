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

const dropSchema = new mongoose.Schema(
    {
        drop_name: { type: String },
        drop_description: { type: String },
        reward_file: {type: String},
        no_of_xp: {type: String},
        mythica_ID: {
            type: String,
            type: mongoose.Schema.Types.ObjectId, ref: 'Creature'
        },
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
    },
    {
        timestamps: {
            createdAt: "created_at",
            updatedAt: "updated_at",
        },
    }
);

dropSchema.plugin(mongooseDelete, { overrideMethods: "all" });

module.exports = mongoose.model("Drop", dropSchema);