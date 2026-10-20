const { ObjectId } = require("mongodb");
const apiResponse = require("../../../helpers/apiResponse");
const ChatReportModel = require("../models/chatreport.model");
const UserModel = require("../models/user.model");
const { sendEmail } = require("../../../utils/sendEmail");
const logger = require("../../../middlewares/logger");

const MODERATION_EMAIL =
  process.env.CHAT_MODERATION_EMAIL || "thorben@mycreapp.com";

const parseBool = (value) =>
  value === true ||
  value === 1 ||
  value === "1" ||
  String(value).toLowerCase() === "true";

const reportUserOrMessage = async (req, res, next) => {
  try {
    const reportedUserId =
      req.body.reported_user_id ||
      req.body.reportedUserId ||
      req.body.target_user_id;
    const messageText =
      req.body.message_text ||
      req.body.messageText ||
      req.body.message ||
      "";
    const reason = req.body.reason || req.body.report_reason || "";
    const photonMessageId =
      req.body.photon_message_id || req.body.message_id || "";
    const channelId = req.body.channel_id || req.body.channelId || "";

    if (!reportedUserId || !ObjectId.isValid(reportedUserId)) {
      return apiResponse.validationErrorWithData(
        res,
        "reported_user_id is required and must be a valid id"
      );
    }

    if (String(reportedUserId) === String(req.user.id)) {
      return apiResponse.badRequestResponse(res, "You cannot report yourself");
    }

    const reportedUser = await UserModel.findById(reportedUserId).select(
      "username email status"
    );
    if (!reportedUser) {
      return apiResponse.notFoundResponse(res, "Reported user not found");
    }

    const reporter = await UserModel.findById(req.user.id).select(
      "username email"
    );

    const report = await ChatReportModel.create({
      reporter_id: req.user.id,
      reported_user_id: reportedUserId,
      message_text: String(messageText).slice(0, 5000),
      reason: String(reason).slice(0, 1000),
      photon_message_id: String(photonMessageId).slice(0, 200),
      channel_id: String(channelId).slice(0, 200),
    });

    let emailSent = false;
    try {
      emailSent = await sendEmail({
        to: MODERATION_EMAIL,
        subject: `[MyCre Chat Report] ${reporter?.username || req.user.id} reported ${reportedUser.username || reportedUserId}`,
        template: "chat-report",
        useIonos: true,
        data: {
          reporterUsername: reporter?.username || "Unknown",
          reporterId: String(req.user.id),
          reporterEmail: reporter?.email || "",
          reportedUsername: reportedUser.username || "Unknown",
          reportedUserId: String(reportedUserId),
          messageText: messageText || "(no message text)",
          reason: reason || "(no reason provided)",
          photonMessageId: photonMessageId || "N/A",
          channelId: channelId || "N/A",
          reportedAt: new Date().toISOString(),
          reportId: String(report._id),
        },
      });
    } catch (emailErr) {
      logger.error("Chat report email failed:", emailErr);
    }

    if (emailSent) {
      report.email_sent = true;
      await report.save();
    }

    return apiResponse.successResponseWithData(
      res,
      "Your report has been submitted to moderators.",
      {
        report_id: report._id,
        status: report.status,
        email_sent: Boolean(emailSent),
      }
    );
  } catch (err) {
    next(err);
  }
};

const blockOrUnblockUser = async (req, res, next) => {
  try {
    const targetUserId =
      req.body.target_user_id ||
      req.body.blocked_user_id ||
      req.body.user_id;
    const action = String(req.body.action || "").toLowerCase();
    const shouldBlock =
      action === "block" ||
      (action !== "unblock" && parseBool(req.body.block ?? req.body.is_blocked ?? true));

    if (!targetUserId || !ObjectId.isValid(targetUserId)) {
      return apiResponse.validationErrorWithData(
        res,
        "target_user_id is required and must be a valid id"
      );
    }

    if (String(targetUserId) === String(req.user.id)) {
      return apiResponse.badRequestResponse(res, "You cannot block yourself");
    }

    const targetUser = await UserModel.findById(targetUserId).select("_id username");
    if (!targetUser) {
      return apiResponse.notFoundResponse(res, "User not found");
    }

    const update = shouldBlock
      ? { $addToSet: { blocked_users: targetUserId } }
      : { $pull: { blocked_users: targetUserId } };

    const updated = await UserModel.findByIdAndUpdate(req.user.id, update, {
      new: true,
    })
      .select("blocked_users")
      .lean();

    if (!updated) {
      return apiResponse.notFoundResponse(res, "User not found");
    }

    const blockedUsers = (updated.blocked_users || []).map((id) => String(id));

    return apiResponse.successResponseWithData(
      res,
      shouldBlock ? "User blocked successfully" : "User unblocked successfully",
      {
        action: shouldBlock ? "block" : "unblock",
        target_user_id: String(targetUserId),
        blocked_users: blockedUsers,
      }
    );
  } catch (err) {
    next(err);
  }
};

const getBlockedUsers = async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.user.id)
      .select("blocked_users")
      .populate("blocked_users", "username image profile_picture_id avatar_data status")
      .lean();

    if (!user) {
      return apiResponse.notFoundResponse(res, "User not found");
    }

    const blockedUsers = (user.blocked_users || []).map((blocked) => {
      if (blocked && blocked._id) {
        return {
          user_id: String(blocked._id),
          username: blocked.username || "",
          image: blocked.image || "",
          profile_picture_id: blocked.profile_picture_id ?? null,
          avatar_data: blocked.avatar_data || null,
          status: blocked.status || "active",
        };
      }
      return { user_id: String(blocked) };
    });

    return apiResponse.successResponseWithData(
      res,
      blockedUsers.length > 0 ? "Blocked users retrieved" : "No blocked users",
      {
        blocked_users: blockedUsers,
        blocked_user_ids: blockedUsers.map((u) => u.user_id),
      }
    );
  } catch (err) {
    next(err);
  }
};

const listChatReports = async (req, res, next) => {
  try {
    const status = req.query.status;
    const filter = {};
    if (status) {
      filter.status = status;
    }

    const reports = await ChatReportModel.find(filter)
      .sort({ created_at: -1 })
      .populate("reporter_id", "username email")
      .populate("reported_user_id", "username email status")
      .limit(Math.min(parseInt(req.query.limit, 10) || 100, 500))
      .lean();

    return apiResponse.successResponseWithData(
      res,
      "Chat reports retrieved",
      reports
    );
  } catch (err) {
    next(err);
  }
};

const updateChatReportStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return apiResponse.validationErrorWithData(res, "Invalid report id");
    }

    const allowed = ["pending", "reviewed", "action_taken", "dismissed"];
    const status = req.body.status;
    if (!allowed.includes(status)) {
      return apiResponse.validationErrorWithData(
        res,
        `status must be one of: ${allowed.join(", ")}`
      );
    }

    const updated = await ChatReportModel.findByIdAndUpdate(
      id,
      {
        status,
        admin_notes: req.body.admin_notes || "",
      },
      { new: true }
    );

    if (!updated) {
      return apiResponse.notFoundResponse(res, "Report not found");
    }

    return apiResponse.successResponseWithData(
      res,
      "Report status updated",
      updated
    );
  } catch (err) {
    next(err);
  }
};

module.exports = {
  reportUserOrMessage,
  blockOrUnblockUser,
  getBlockedUsers,
  listChatReports,
  updateChatReportStatus,
};
