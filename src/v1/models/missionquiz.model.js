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

const missionQuizSchema = new mongoose.Schema({
    quiz_title: { type: String },
    quiz_file: { type: String },
    mission_id: {
        type: String,
        type: mongoose.Schema.Types.ObjectId, ref: 'Mission'
    },
    mythica: { type: String, type: mongoose.Schema.Types.ObjectId, ref: 'Creature' },
    location: {
        type: pointSchema,
        required: true,
    }
})

missionQuizSchema.plugin(mongooseDelete, { overrideMethods: "all" });

module.exports = mongoose.model("MissionQuiz", missionQuizSchema);