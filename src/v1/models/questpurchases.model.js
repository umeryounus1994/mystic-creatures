/* eslint-disable arrow-body-style */
const mongoose = require("mongoose");
const mongooseDelete = require("mongoose-delete");


const questPurchasesSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId, ref: 'User'
        },
        quest_group_id: {
            type: mongoose.Schema.Types.ObjectId, ref: 'QuestGroup'
        },
        package: { type: String, enum: ["Bronze","Silver","Gold"], default: 'Bronze' },
        purchased_at: { type: Date, default: Date.now },
        expires_at: { type: Date },
        receipt: { type: String, default: "" },
        apple_transaction_id: { type: String, default: "" },
        invoice_email_sent: { type: Boolean, default: false },
        status: {
            type: String,
            enum: ["active", "deleted", "expired"],
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
