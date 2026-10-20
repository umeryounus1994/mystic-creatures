const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chat.controller");
const { checkUserAuth } = require("../../../middlewares/authMiddleware");
const {
  checkAdminUserAuth,
} = require("../../../middlewares/authMiddlewareAdminPanel");

router.post("/report", checkUserAuth, chatController.reportUserOrMessage);
router.post("/block", checkUserAuth, chatController.blockOrUnblockUser);
router.get("/blocked-users", checkUserAuth, chatController.getBlockedUsers);

// Admin moderation
router.get("/reports", checkAdminUserAuth, chatController.listChatReports);
router.patch(
  "/reports/:id",
  checkAdminUserAuth,
  chatController.updateChatReportStatus
);

module.exports = router;
