/* eslint-disable arrow-body-style */
const mongoose = require("mongoose");
const mongooseDelete = require("mongoose-delete");


const userQuestsSchema = new mongoose.Schema(
    {
        status: { type: String, enum: ["unlocked","inprogress", "completed", 'claimed'], default: "unlocked" },
        quest_id: {
            type: String,
            type: mongoose.Schema.Types.ObjectId, ref: 'Quest'
        },
        quest_group_id: {
            type: String,
            type: mongoose.Schema.Types.ObjectId, ref: 'QuestGroup'
        },
        user_id: {
            type: String,
            type: mongoose.Schema.Types.ObjectId, ref: 'User'
        },
        submitted_answer: {
            type: String,
            type: mongoose.Schema.Types.ObjectId, ref: 'QuestQuiz'
        }
    },
    {
        timestamps: {
            createdAt: "created_at",
            updatedAt: "updated_at",
        },
    }
)

userQuestsSchema.plugin(mongooseDelete, { overrideMethods: "all" });

module.exports = mongoose.model("UserQuest", userQuestsSchema);