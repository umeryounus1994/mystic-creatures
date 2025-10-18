/* eslint-disable arrow-body-style */
const mongoose = require("mongoose");
const mongooseDelete = require("mongoose-delete");

const mysteryBagQuizSchema = new mongoose.Schema({
    answer: { type: String },
    correct_option: {
        type: Boolean,
        default: false
    },
    mystery_bag_id:{
        type: String,
        type: mongoose.Schema.Types.ObjectId, ref: 'MysteryBag'
    },
})

mysteryBagQuizSchema.plugin(mongooseDelete, { overrideMethods: "all" });

module.exports = mongoose.model("MysteryBagQuiz", mysteryBagQuizSchema);