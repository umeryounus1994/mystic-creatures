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

const missionSchema = new mongoose.Schema(
    {
        mission_title: { type: String },
        no_of_xp: { type: Number, default: 0 },
        no_of_crypes: { type: Number, default: 0 },
        level_increase: { type: Number, default: 0 },
        reward_file: {type: String},
        mission_location: {
            type: pointSchema,
            required: true,
        },
        mythica_ID: {  
            type: String,
            type: mongoose.Schema.Types.ObjectId, ref: 'Creature'
         },
        mission_image: {type: String, default: 'https://st.depositphotos.com/1819777/4778/v/450/depositphotos_47785885-stock-illustration-treasure-map.jpg'},
        mission_start_date: {type: String},
        mission_end_date: {type: String},
        status: {
            type: String,
            enum: ["draft","active", "deleted"],
            default: "draft",
        },
        /** MCU-10: content language for Map Hunt filtering */
        language: {
            type: String,
            enum: ["german", "english"],
            default: "german",
        },
        /** MCU-10: fallback list image when no custom upload */
        default_image: {
            type: String,
            enum: ["chest", "map", "compass", "door"],
            default: "chest",
        },
        created_by: {  
            type: String,
            type: mongoose.Schema.Types.ObjectId, ref: 'User'
         },
    },
    {
        timestamps: {
            createdAt: "created_at",
            updatedAt: "updated_at",
        },
    }
);

missionSchema.plugin(mongooseDelete, { overrideMethods: "all" });

module.exports = mongoose.model("Mission", missionSchema);