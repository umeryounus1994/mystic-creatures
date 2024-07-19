/* eslint-disable arrow-body-style */
const mongoose = require("mongoose");
const mongooseDelete = require("mongoose-delete");


const userTreasureHuntSchema = new mongoose.Schema(
    {
        status: { type: String, enum: ["inprogress", "completed", 'claimed', 'open'], default: "inprogress" },
        treasure_hunt_id: {
            type: String,
            type: mongoose.Schema.Types.ObjectId, ref: 'TreasureHunt'
        },
        user_id: {
            type: String,
            type: mongoose.Schema.Types.ObjectId, ref: 'User'
        },
        quiz_answers: [{
            treasure_hunt_quiz_id: { type: mongoose.Schema.Types.ObjectId, ref: 'TreasureHuntQuiz' },
            treasure_hunt_quiz_option_id: { type: mongoose.Schema.Types.ObjectId, ref: 'TreasureHuntQuizOption' }
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
userTreasureHuntSchema.methods.updateUserAnswer = async function(quiz_id, selected_option_id) {
    const existingAnswerIndex = this.quiz_answers.findIndex(answer => answer.treasure_hunt_quiz_id && answer.treasure_hunt_quiz_id.equals(quiz_id));

    if (existingAnswerIndex !== -1) {
        // If the user has already answered this quiz, update the selected option
        this.quiz_answers[existingAnswerIndex].treasure_hunt_quiz_option_id = selected_option_id;
    } else {
        // If the user hasn't answered this quiz yet, add a new answer
        this.quiz_answers.push({ treasure_hunt_quiz_id: quiz_id, treasure_hunt_quiz_option_id:selected_option_id });
    }

    await this.save();
};

userTreasureHuntSchema.plugin(mongooseDelete, { overrideMethods: "all" });

module.exports = mongoose.model("UserTreasureHunt", userTreasureHuntSchema);