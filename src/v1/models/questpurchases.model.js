/* eslint-disable arrow-body-style */
const mongoose = require("mongoose");
const mongooseDelete = require("mongoose-delete");


const questPurchasesSchema = new mongoose.Schema(
    {
        user_id: {
            type: String,
            type: mongoose.Schema.Types.ObjectId, ref: 'User'
        },
        quest_group_id: {
            type: String,
            type: mongoose.Schema.Types.ObjectId, ref: 'QuestGroup'
        },
        package: { type: String, enum: ["Bronze","Silver","Gold"], default: 'Bronze' },
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

questPurchasesSchema.plugin(mongooseDelete, { overrideMethods: "all" });

module.exports = mongoose.model("QuestPurchases", questPurchasesSchema);