/* eslint-disable arrow-body-style */
const mongoose = require("mongoose");
const mongooseDelete = require("mongoose-delete");


const skillSchema = new mongoose.Schema(
    {
        skill_name: { type: String },
        skill_element: { type: String },
        skill_damage_value: { type: Number, default: 0 },
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

skillSchema.plugin(mongooseDelete, { overrideMethods: "all" });

module.exports = mongoose.model("Skill", skillSchema);