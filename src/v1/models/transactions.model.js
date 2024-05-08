/* eslint-disable arrow-body-style */
const mongoose = require("mongoose");
const mongooseDelete = require("mongoose-delete");


const transactionsSchema = new mongoose.Schema(
    {
        user_id: {
            type: String,
            type: mongoose.Schema.Types.ObjectId, ref: 'User'
        },
        quest_id: {
            type: String,
            type: mongoose.Schema.Types.ObjectId, ref: 'Quest'
        },
        mission_id: {
            type: String,
            type: mongoose.Schema.Types.ObjectId, ref: 'Mission'
        },
        hunt_id: {
            type: String,
            type: mongoose.Schema.Types.ObjectId, ref: 'TreasureHunt'
        },
        mythica_distinguisher: { type: String },
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

transactionsSchema.plugin(mongooseDelete, { overrideMethods: "all" });

module.exports = mongoose.model("Transaction", transactionsSchema);