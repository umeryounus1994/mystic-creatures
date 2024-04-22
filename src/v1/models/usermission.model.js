/* eslint-disable arrow-body-style */
const mongoose = require("mongoose");
const mongooseDelete = require("mongoose-delete");


const userMissionSchema = new mongoose.Schema(
    {
        status: { type: String, enum: ["inprogress", "completed", 'claimed'], default: "inprogress" },
        mission_id: {
            type: String,
            type: mongoose.Schema.Types.ObjectId, ref: 'Mission'
        },
        user_id: {
            type: String,
            type: mongoose.Schema.Types.ObjectId, ref: 'User'
        },
        quiz_answers: [{
            mission_quiz_id: { type: mongoose.Schema.Types.ObjectId, ref: 'MissionQuiz' },
            mission_quiz_option_id: { type: mongoose.Schema.Types.ObjectId, ref: 'MissionQuizOption' }
        }]
    },
    {
        timestamps: {
            createdAt: "created_at",
            updatedAt: "updated_at",
        },
    }
)

// Add a method to the schema to update user answers
userMissionSchema.methods.updateUserAnswer = async function(quiz_id, selected_option_id) {
    const existingAnswerIndex = this.quiz_answers.findIndex(answer => answer.mission_quiz_id && answer.mission_quiz_id.equals(quiz_id));

    if (existingAnswerIndex !== -1) {
        // If the user has already answered this quiz, update the selected option
        this.quiz_answers[existingAnswerIndex].mission_quiz_option_id = selected_option_id;
    } else {
        // If the user hasn't answered this quiz yet, add a new answer
        this.quiz_answers.push({ mission_quiz_id: quiz_id, mission_quiz_option_id:selected_option_id });
    }

    await this.save();
};

userMissionSchema.plugin(mongooseDelete, { overrideMethods: "all" });

module.exports = mongoose.model("UserMission", userMissionSchema);