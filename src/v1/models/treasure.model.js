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
const treasureSchema = new mongoose.Schema(
    {
        treasure_hunt_title: { type: String },
        no_of_xp: { type: Number, default: 0 },
        no_of_crypes: { type: Number, default: 0 },
        level_increase: { type: Number, default: 0 },
        qr_code: { type: String },
        hunt_package: {type: String, enum: ["Bronze","Silver", "Gold"], required: false, default: undefined},
        reward_file: {type: String},
        mythica_ID: { 
            type: String,
            type: mongoose.Schema.Types.ObjectId, ref: 'Creature' 
        },
        hunt_location: {
            type: pointSchema,
            required: true,
        },
        treasure_hunt_image: {type: String, default: 'https://st.depositphotos.com/1819777/4778/v/450/depositphotos_47785885-stock-illustration-treasure-map.jpg'},
        treasure_hunt_start_date: {type: String},
        treasure_hunt_end_date: {type: String},
        status: {
            type: String,
            enum: ["draft","active", "deleted"],
            default: "draft",
        },
        premium_hunt: {
            type: Boolean,
            default: false,
        },
        have_qr: {
            type: Boolean,
            default: false,
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

treasureSchema.plugin(mongooseDelete, { overrideMethods: "all" });

module.exports = mongoose.model("TreasureHunt", treasureSchema);