/* eslint-disable arrow-body-style */
const mongoose = require("mongoose");
const mongooseDelete = require("mongoose-delete");


const questionSchema = new mongoose.Schema({
    answer: { type: String },
    correct_option: {
        type: Boolean,
        default: false
    },
    quest_id:{
        type: String,
        type: mongoose.Schema.Types.ObjectId, ref: 'Quest'
    },
})

questionSchema.plugin(mongooseDelete, { overrideMethods: "all" });

module.exports = mongoose.model("QuestQuiz", questionSchema);