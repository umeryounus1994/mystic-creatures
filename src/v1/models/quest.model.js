/* eslint-disable arrow-body-style */
const mongoose = require("mongoose");
const mongooseDelete = require("mongoose-delete");


const questSchema = new mongoose.Schema(
    {
        quest_question: { type: String },
        qr_code: { type: String },
        no_of_xp: { type: Number, default: 0 },
        no_of_crypes: { type: Number, default: 0 },
        mythica: { type: String },
        mythica_model: { type: String },
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

questSchema.plugin(mongooseDelete, { overrideMethods: "all" });

module.exports = mongoose.model("Quest", questSchema);
