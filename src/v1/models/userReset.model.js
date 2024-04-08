const mongoose = require("mongoose");

const usserPasswordResetSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
    expires: 1800, // Expires after 30 minutes (1800 in seconds)
  },
});

const UserPasswordReset = mongoose.model(
  "UserPasswordReset",
  usserPasswordResetSchema
);

module.exports = UserPasswordReset;
