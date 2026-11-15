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
        /** Legacy Bronze/Silver/Gold — kept for v1 purchases */
        package: { type: String, default: "Bronze" },
        /** MCU-10 price level e.g. "4.99" */
        price_level: { type: String, required: false, default: undefined },
        /** Store product id for the price level */
        store_product_id: { type: String, required: false, default: undefined },
        /** Optional store purchase token / receipt id */
        purchase_token: { type: String, required: false, default: undefined },
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