/* eslint-disable arrow-body-style */
const mongoose = require("mongoose");
const mongooseDelete = require("mongoose-delete");


const questGroupSchema = new mongoose.Schema(
    {
        quest_group_name: { type: String },
        qr_code: { type: String },
        no_of_crypes: { type: Number, default: 0 },
        reward_file: {type: String},
        status: {
            type: String,
            enum: ["active", "deleted"],
            default: "active",
        },
        created_by: {  
            type: String,
            type: mongoose.Schema.Types.ObjectId, ref: 'User'
         },
    },
    {
        timestamps: {
            createdAt: "created_at",
            updatedAt: "updated_at",
        },
    }
);

questGroupSchema.plugin(mongooseDelete, { overrideMethods: "all" });

module.exports = mongoose.model("QuestGroup", questGroupSchema);