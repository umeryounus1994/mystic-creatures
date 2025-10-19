const mongoose = require("mongoose");

const systemConfigSchema = new mongoose.Schema({
    config_key: { type: String, required: true, unique: true },
    config_value: { type: mongoose.Schema.Types.Mixed, required: true },
    config_type: {
        type: String,
        enum: ["string", "number", "boolean", "object", "array"],
        required: true
    },
    description: { type: String },
    category: {
        type: String,
        enum: ["commission", "payment", "email", "general", "subscription"],
        required: true
    },
    is_editable: { type: Boolean, default: true }
}, {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
});

module.exports = mongoose.model("SystemConfig", systemConfigSchema);