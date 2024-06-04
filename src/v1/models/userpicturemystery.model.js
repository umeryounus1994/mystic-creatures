/* eslint-disable arrow-body-style */
const mongoose = require("mongoose");
const mongooseDelete = require("mongoose-delete");


const userPictureMysterySchema = new mongoose.Schema(
    {
        status: { type: String, enum: ["unlocked","inprogress", "completed", 'claimed'], default: "unlocked" },
        picture_mystery_id: {
            type: String,
            type: mongoose.Schema.Types.ObjectId, ref: 'PictureMystery'
        },
        user_id: {
            type: String,
            type: mongoose.Schema.Types.ObjectId, ref: 'User'
        },
        submitted_answer: {
            type: String,
            type: mongoose.Schema.Types.ObjectId, ref: 'PictureMysteryQuiz'
        }
    },
    {
        timestamps: {
            createdAt: "created_at",
            updatedAt: "updated_at",
        },
    }
)

userPictureMysterySchema.plugin(mongooseDelete, { overrideMethods: "all" });

module.exports = mongoose.model("UserPictureMystery", userPictureMysterySchema);