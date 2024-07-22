/* eslint-disable arrow-body-style */
const mongoose = require("mongoose");
const mongooseDelete = require("mongoose-delete");


const levelSchema = new mongoose.Schema(
    {
        user_id: {
            type: String,
            type: mongoose.Schema.Types.ObjectId, ref: 'User'
        },
        level: {
            type: Number
        },
    },
    {
        timestamps: {
            createdAt: "created_at",
            updatedAt: "updated_at",
        },
    }
);

levelSchema.plugin(mongooseDelete, { overrideMethods: "all" });

module.exports = mongoose.model("Level", levelSchema);