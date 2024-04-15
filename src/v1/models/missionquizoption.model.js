/* eslint-disable arrow-body-style */
const mongoose = require("mongoose");
const mongooseDelete = require("mongoose-delete");


const missionQuizOptionsSchema = new mongoose.Schema({
    answer: { type: String },
    correct_option: {
        type: Boolean,
        default: false
    },
    mission_id: {
        type: String,
        type: mongoose.Schema.Types.ObjectId, ref: 'Mission'
    },
    mission_quiz_id: {
        type: String,
        type: mongoose.Schema.Types.ObjectId, ref: 'MissionQuiz'
    }
})

missionQuizOptionsSchema.plugin(mongooseDelete, { overrideMethods: "all" });

module.exports = mongoose.model("MissionQuizOption", missionQuizOptionsSchema);