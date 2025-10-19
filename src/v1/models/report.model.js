const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema({
    report_name: { type: String, required: true },
    report_type: {
        type: String,
        enum: ["bookings", "revenue", "commissions", "partners", "users", "quests", "disputes"],
        required: true
    },
    filters: {
        date_from: { type: Date },
        date_to: { type: Date },
        partner_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        status: { type: String },
        category: { type: String }
    },
    generated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    file_path: { type: String },
    file_format: {
        type: String,
        enum: ["csv", "pdf", "excel"],
        default: "csv"
    },
    status: {
        type: String,
        enum: ["generating", "completed", "failed"],
        default: "generating"
    },
    download_count: { type: Number, default: 0 },
    expires_at: { type: Date }
}, {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
});

module.exports = mongoose.model("Report", reportSchema);