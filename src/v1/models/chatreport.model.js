const mongoose = require("mongoose");
const mongooseDelete = require("mongoose-delete");

const chatReportSchema = new mongoose.Schema(
  {
    reporter_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reported_user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message_text: { type: String, default: "" },
    reason: { type: String, default: "" },
    photon_message_id: { type: String, default: "" },
    channel_id: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "reviewed", "action_taken", "dismissed"],
      default: "pending",
    },
    admin_notes: { type: String, default: "" },
    email_sent: { type: Boolean, default: false },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

chatReportSchema.index({ reported_user_id: 1, created_at: -1 });
chatReportSchema.index({ reporter_id: 1, created_at: -1 });
chatReportSchema.index({ status: 1 });
chatReportSchema.plugin(mongooseDelete, { overrideMethods: "all" });

module.exports = mongoose.model("ChatReport", chatReportSchema);
