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

const activityDropSchema = new mongoose.Schema(
    {
        drop_name: { 
            type: String, 
            required: true 
        },
        drop_description: { 
            type: String 
        },
        drop_image: { 
            type: String 
        },
        location: {
            type: pointSchema,
            required: true,
        },
        activity_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Activity',
            required: true
        },
        status: {
            type: String,
            enum: ["active", "inactive", "deleted"],
            default: "active",
        },
        created_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
    },
    {
        timestamps: {
            createdAt: "created_at",
            updatedAt: "updated_at",
        },
    }
);

activityDropSchema.plugin(mongooseDelete, { overrideMethods: "all" });
activityDropSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("ActivityDrop", activityDropSchema);
