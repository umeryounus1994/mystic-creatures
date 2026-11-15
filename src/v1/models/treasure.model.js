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
        /**
         * MCU-10: IAP price level (e.g. "1.99"). Required for premium in admin;
         * ignored when premium_hunt is false. Old hunt_package kept unused by app.
         */
        price_level: {
            type: String,
            enum: ["1.99", "2.99", "4.99", "6.99", "9.99"],
            required: false,
            default: undefined,
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