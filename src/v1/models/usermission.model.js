/* eslint-disable arrow-body-style */
const mongoose = require("mongoose");
const mongooseDelete = require("mongoose-delete");


const userMissionSchema = new mongoose.Schema(
    {
        status: { type: String, enum: ["draft", "completed"], default: "draft" },
        mission_id: {
            type: String,
            type: mongoose.Schema.Types.ObjectId, ref: 'Mission'
        },
        user_id: {
            type: String,
            type: mongoose.Schema.Types.ObjectId, ref: 'User'
        },
        submitted_answer: {
            type: String,
            type: mongoose.Schema.Types.ObjectId, ref: 'MissionQuiz'
        }
    },
    {
        timestamps: {
            createdAt: "created_at",
            updatedAt: "updated_at",
        },
    }
)

userMissionSchema.plugin(mongooseDelete, { overrideMethods: "all" });

module.exports = mongoose.model("UserMission", userMissionSchema);