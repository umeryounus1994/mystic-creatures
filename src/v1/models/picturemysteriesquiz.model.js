/* eslint-disable arrow-body-style */
const mongoose = require("mongoose");
const mongooseDelete = require("mongoose-delete");


const pictureMysteryQuizSchema = new mongoose.Schema(
    {
        answer_url: { type: String },
        correct_option: {
            type: Boolean,
            default: false
        },
        picture_mystery_id:{
            type: String,
            type: mongoose.Schema.Types.ObjectId, ref: 'PictureMystery'
        },
    }
);

pictureMysteryQuizSchema.plugin(mongooseDelete, { overrideMethods: "all" });

module.exports = mongoose.model("PictureMysteryQuiz", pictureMysteryQuizSchema);