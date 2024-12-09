/* eslint-disable arrow-body-style */
const mongoose = require("mongoose");
const mongooseDelete = require("mongoose-delete");


const userQuestGroupSchema = new mongoose.Schema(
    {
        status: { type: String, enum: ["inprogress", "completed", 'claimed'], default: "inprogress" },
        quest_group_id: {
            type: String,
            type: mongoose.Schema.Types.ObjectId, ref: 'QuestGroup'
        },
        user_id: {
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
)

userQuestGroupSchema.plugin(mongooseDelete, { overrideMethods: "all" });

module.exports = mongoose.model("UserQuestGroup", userQuestGroupSchema);