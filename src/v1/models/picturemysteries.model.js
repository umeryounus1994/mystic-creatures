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
const pictureMysterySchema = new mongoose.Schema(
    {
        picture_mystery_question: { type: String },
        picture_mystery_question_url: { type: String },
        no_of_xp: { type: Number, default: 0 },
        no_of_crypes: { type: Number, default: 0 },
        level_increase: { type: Number, default: 0 },
        mystery_location: {
            type: pointSchema,
            required: true,
        },
        mythica_ID: {  
            type: String,
            type: mongoose.Schema.Types.ObjectId, ref: 'Creature'
         },
        status: {
            type: String,
            enum: ["active", "deleted"],
            default: "active",
        },
    },
    {
        timestamps: {
            createdAt: "created_at",
            updatedAt: "updated_at",
        },
    }
);

pictureMysterySchema.plugin(mongooseDelete, { overrideMethods: "all" });

module.exports = mongoose.model("PictureMystery", pictureMysterySchema);