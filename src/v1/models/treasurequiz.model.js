/* eslint-disable arrow-body-style */
const mongoose = require("mongoose");
const mongooseDelete = require("mongoose-delete");

const pointSchema = new mongoose.Schema({
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  });

const huntQuizSchema = new mongoose.Schema({
    treasure_hunt_title: { type: String },
    treasure_hunt_id: {
        type: String,
        type: mongoose.Schema.Types.ObjectId, ref: 'TreasureHunt'
    },
    creature: { type: String },
    location: {
        type: pointSchema,
        required: true,
    },
    mythica: { type: String }
})

huntQuizSchema.plugin(mongooseDelete, { overrideMethods: "all" });

module.exports = mongoose.model("TreasureHuntQuiz", huntQuizSchema);