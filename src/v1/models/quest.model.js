/* eslint-disable arrow-body-style */
const mongoose = require("mongoose");
const mongooseDelete = require("mongoose-delete");


const questSchema = new mongoose.Schema(
    {
        quest_question: { type: String },
        quest_title: { type: String },
        qr_code: { type: String },
        no_of_xp: { type: Number, default: 0 },
        no_of_crypes: { type: Number, default: 0 },
        level_increase: { type: Number, default: 0 },
        reward_file: {type: String},
        quest_image: {type: String},
        quest_type: {       
            type: String,
            enum: ["simple", "image","video"],
            default: "simple",},
        mythica_ID: {  
            type: String,
            type: mongoose.Schema.Types.ObjectId, ref: 'Creature'
         },
        status: {
            type: String,
            enum: ["active", "deleted"],
            default: "active",
        },
        created_by: {  
            type: String,
            type: mongoose.Schema.Types.ObjectId, ref: 'User'
         },
         quest_group_id: {  
            type: String,
            type: mongoose.Schema.Types.ObjectId, ref: 'QuestGroup'
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