const mongoose = require("mongoose");
const mongooseDelete = require("mongoose-delete");

const userModelBagSchema = new mongoose.Schema(
    {
        status: { 
            type: String, 
            enum: ['viewed', 'collected'], 
            default: "viewed" 
        },
        model_bag_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ModelBag',
            required: true
        },
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        submitted_answer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ModelBagQuiz'
        },
        is_correct: {
            type: Boolean,
            default: null
        }
    },
    {
        timestamps: {
            createdAt: "created_at",
            updatedAt: "updated_at",
        },
    }
);

userModelBagSchema.plugin(mongooseDelete, { overrideMethods: "all" });

module.exports = mongoose.model("UserModelBag", userModelBagSchema);