/* eslint-disable arrow-body-style */
const mongoose = require("mongoose");
const mongooseDelete = require("mongoose-delete");


const creatureSchema = new mongoose.Schema(
    {
        creature_id: { type: Number },
        creature_name: { type: String },
        creature_description: { type: String },
        creature_food: { type: String },
        creature_element: { type: String },
        creature_rarity: { type: String },
        creature_weight: { type: String },
        creature_height: { type: String },
        creature_skill1: { type: String, type: mongoose.Schema.Types.ObjectId, ref: 'Skill' },
        creature_skill2: { type: String, type: mongoose.Schema.Types.ObjectId, ref: 'Skill' },
        creature_skill3: { type: String, type: mongoose.Schema.Types.ObjectId, ref: 'Skill' },
        creature_skill4: { type: String, type: mongoose.Schema.Types.ObjectId, ref: 'Skill' },
        creature_model: { type: String },
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

creatureSchema.plugin(mongooseDelete, { overrideMethods: "all" });

module.exports = mongoose.model("Creature", creatureSchema);