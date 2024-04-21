/* eslint-disable arrow-body-style */
const mongoose = require("mongoose");
const mongooseDelete = require("mongoose-delete");


const treasureHuntQuizOptionsSchema = new mongoose.Schema({
    answer: { type: String },
    correct_option: {
        type: Boolean,
        default: false
    },
    treasure_hunt_id: {
        type: String,
        type: mongoose.Schema.Types.ObjectId, ref: 'TreasureHunt'
    },
    treasure_hunt_quiz_id: {
        type: String,
        type: mongoose.Schema.Types.ObjectId, ref: 'TreasureHuntQuiz'
    }
})

treasureHuntQuizOptionsSchema.plugin(mongooseDelete, { overrideMethods: "all" });

module.exports = mongoose.model("TreasureHuntQuizOption", treasureHuntQuizOptionsSchema);