/* eslint-disable arrow-body-style */
const mongoose = require("mongoose");
const mongooseDelete = require("mongoose-delete");


const userDropSchema = new mongoose.Schema(
    {
        status: { type: String, enum: ['claimed'], default: "claimed" },
        drop_id: {
            type: String,
            type: mongoose.Schema.Types.ObjectId, ref: 'Drop'
        },
        user_id: {
            type: String,
            type: mongoose.Schema.Types.ObjectId, ref: 'User'
        }
    },
    {
        timestamps: {
            createdAt: "created_at",
            updatedAt: "updated_at",
        },
    }
)

userDropSchema.plugin(mongooseDelete, { overrideMethods: "all" });

module.exports = mongoose.model("UserDrop", userDropSchema);