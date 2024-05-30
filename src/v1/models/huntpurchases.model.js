/* eslint-disable arrow-body-style */
const mongoose = require("mongoose");
const mongooseDelete = require("mongoose-delete");


const huntPurchasesSchema = new mongoose.Schema(
    {
        user_id: {
            type: String,
            type: mongoose.Schema.Types.ObjectId, ref: 'User'
        },
        hunt_id: {
            type: String,
            type: mongoose.Schema.Types.ObjectId, ref: 'TreasureHunt'
        },
        package: { type: String, enum: ["Bronze","Silver","Gold"] },
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

huntPurchasesSchema.plugin(mongooseDelete, { overrideMethods: "all" });

module.exports = mongoose.model("HuntPurchases", huntPurchasesSchema);