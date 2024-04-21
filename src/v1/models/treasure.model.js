/* eslint-disable arrow-body-style */
const mongoose = require("mongoose");
const mongooseDelete = require("mongoose-delete");


const treasureSchema = new mongoose.Schema(
    {
        treasure_hunt_title: { type: String },
        no_of_xp: { type: Number, default: 0 },
        no_of_crypes: { type: Number, default: 0 },
        level_increase: { type: Number, default: 0 },
        mythica: { type: String },
        mythica_ar_model: { type: String },
        treasure_hunt_image: {type: String, default: 'https://st.depositphotos.com/1819777/4778/v/450/depositphotos_47785885-stock-illustration-treasure-map.jpg'},
        treasure_hunt_start_date: {type: Date},
        treasure_hunt_end_date: {type: Date},
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

treasureSchema.plugin(mongooseDelete, { overrideMethods: "all" });

module.exports = mongoose.model("TreasureHunt", treasureSchema);