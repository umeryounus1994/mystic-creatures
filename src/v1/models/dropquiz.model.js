/* eslint-disable arrow-body-style */
const mongoose = require("mongoose");
const mongooseDelete = require("mongoose-delete");


const dropQuizSchema = new mongoose.Schema({
    answer: { type: String },
    correct_option: {
        type: Boolean,
        default: false
    },
    drop_id:{
        type: String,
        type: mongoose.Schema.Types.ObjectId, ref: 'Drop'
    },
})

dropQuizSchema.plugin(mongooseDelete, { overrideMethods: "all" });

module.exports = mongoose.model("DropQuiz", dropQuizSchema);