const mongoose = require("mongoose");

// Stores the global commission rate (percentage) applied to all commissions.
// This is treated as a singleton config document via the unique `key`.
const commissionRateSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "global" },
    rate: { type: Number, required: true, min: 0, max: 100 },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

module.exports = mongoose.model("CommissionRate", commissionRateSchema);

