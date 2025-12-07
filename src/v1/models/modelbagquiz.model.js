const mongoose = require("mongoose");
const mongooseDelete = require("mongoose-delete");

const modelBagQuizSchema = new mongoose.Schema({
    answer: { type: String },
    correct_option: {
        type: Boolean,
        default: false
    },
    model_bag_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ModelBag',
        required: true
    }
});

modelBagQuizSchema.plugin(mongooseDelete, { overrideMethods: "all" });

module.exports = mongoose.model("ModelBagQuiz", modelBagQuizSchema);